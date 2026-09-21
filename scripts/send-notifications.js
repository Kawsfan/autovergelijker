#!/usr/bin/env node
// scripts/send-notifications.js
// Verstuurt meldingen voor twee dingen (Supabase-tabellen "zoekagenten" en
// "favorites"), gecombineerd in ÉÉN digest per gebruiker per run:
//   1. Nieuwe advertenties die matchen met een opgeslagen zoekagent.
//   2. Prijsdalingen op favoriete advertenties sinds de vorige controle.
// Draait als losse stap ná scrape.js in de scrape-workflow, dus 3x/dag --
// niet "één dagelijkse digest", maar een melding zo snel als de eerstvolgende
// scrape-run iets nieuws oplevert.
//
// Twee kanalen: e-mail (Resend, altijd de "leidende" melding -- de
// gezien_ids/laatst_gemelde_prijs-boekhouding hieronder is uitsluitend aan
// e-mailsucces gekoppeld, zie __3. Versturen__) en browser-pushmeldingen
// (Web Push/VAPID, via lib/webpush.js) als losse, best-effort extra kanaal
// voor gebruikers die dat hebben ingeschakeld (index.html, tabel
// push_subscriptions) -- een mislukte pushmelding houdt de e-maildigest
// (en de boekhouding daarachter) nooit tegen.
//
// Vereist drie secrets voor e-mail (GitHub Actions repo-secrets, nooit in
// code/chat):
//   SUPABASE_URL               -- bv. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  -- Supabase dashboard > Settings > API >
//                                  secret key. NIET de publishable-key die
//                                  index.html gebruikt: die kan door Row
//                                  Level Security niet bij andere
//                                  gebruikers' rijen of bij auth.users --
//                                  de secret key wel, en is dus alleen
//                                  server-side te gebruiken.
//   RESEND_API_KEY              -- Resend dashboard > API keys.
// Ontbreekt een van deze drie (bv. nog niet geconfigureerd), dan slaat dit
// script zichzelf stilletjes over (exit 0) i.p.v. de hele scrape-workflow te
// laten falen.
//
// Voor pushmeldingen zijn twee EXTRA secrets nodig (VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY, gegenereerd met scripts/generate-vapid-keys.js) --
// ontbreken die, dan blijft alleen het e-mailkanaal actief (geen harde eis,
// in lijn met "volledig additief" elders in de accounts-laag).
const fs = require('fs');
const path = require('path');
const { dealScoreKleur } = require('../lib/carkijker-core');
const { sendWebPush } = require('../lib/webpush');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Vereist een in Resend geverifieerd domein (Domains-tab).
const FROM_ADDRESS = process.env.NOTIFICATIONS_FROM || 'Carkijker <info@carkijker.nl>';
const SITE_ORIGIN = 'https://carkijker.nl';
const LISTINGS_PATH = path.join(process.cwd(), 'data', 'listings.json');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@carkijker.nl';
const PUSH_AAN = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.log('E-mailnotificaties overgeslagen: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY nog niet (volledig) geconfigureerd als secret.');
  process.exit(0);
}
if (!PUSH_AAN) {
  console.log('Pushmeldingen overgeslagen: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY nog niet geconfigureerd als secret (e-mail werkt gewoon door).');
}

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

async function supabaseFetch(pathAndQuery, options) {
  const res = await fetch(SUPABASE_URL + pathAndQuery, Object.assign({}, options, {
    headers: Object.assign({
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    }, (options && options.headers) || {}),
  }));
  if (!res.ok) throw new Error('Supabase ' + res.status + ' bij ' + pathAndQuery + ': ' + (await res.text()).slice(0, 300));
  if (res.status === 204) return null;
  const tekst = await res.text();
  return tekst ? JSON.parse(tekst) : null;
}

// Zelfde matchlogica als controleerZoekagenten() in index.html (client-side)
// -- bewust hier gedupliceerd (net als isDealer()/slugifyMerk() elders in de
// codebase) zodat de e-mailmelding exact dezelfde advertenties telt als de
// browser-melding, i.p.v. twee losse implementaties die uiteen kunnen lopen.
function vindNieuweMatches(agent, listings, vandaag) {
  return listings.filter(function(a) {
    if (agent.merk && !(a.merk || '').toLowerCase().includes(String(agent.merk).toLowerCase())) return false;
    if (agent.q && !(((a.titel || '') + ' ' + (a.merk || '')).toLowerCase().includes(String(agent.q).toLowerCase()))) return false;
    if (agent.min_prijs != null && a.prijs != null && a.prijs < agent.min_prijs) return false;
    if (agent.max_prijs != null && a.prijs != null && a.prijs > agent.max_prijs) return false;
    return true;
  }).filter(function(a) {
    return a.eersteGezien === vandaag && !(agent.gezien_ids || []).includes(a.id);
  });
}

function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// dealScoreKleur() komt uit lib/carkijker-core.js -- dezelfde kleurdrempels
// (60/35) als de .auto-deal-pill op de occasion-pagina's, zodat dezelfde
// dealScore er in de mail hetzelfde uitziet als op de site.
function dealBadgeHtml(score) {
  if (score == null) return '';
  const kleur = dealScoreKleur(score);
  return '<span style="background:' + kleur.bg + ';color:' + kleur.fg + ';font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">' + Math.round(score) + ' score</span>';
}

// Statische tegenhanger van de .auto-deal-pill-tooltip op de site (mail kan
// geen hover/tap-toggle tonen, dus meteen de korte tekst zelf) -- juist hier
// belangrijk: een lezer klikt vaak direct vanuit de mail door naar de bron,
// zonder eerst de site (en dus de tooltip) te zien.
function verdachtGoedkoopHtml(a) {
  if (!a.verdachtGoedkoop) return '';
  return '<div style="background:#fef3c7;color:#92400e;font-size:11.5px;font-weight:600;padding:4px 8px;border-radius:6px;margin-top:4px">' +
    '&#9888; Prijs wijkt sterk af van vergelijkbare auto\'s -- controleer deze advertentie extra goed.</div>';
}

// isBeste: zet een "BESTE DEAL"-label op de eerste (dus na sortering de
// hoogst scorende) rij van een sectie, zodat de klant niet zelf per rij
// de dealScore hoeft te vergelijken.
function autoRijHtml(a, extra, isBeste) {
  const img = a.imgSrc
    ? '<img src="' + escHtml(a.imgSrc) + '" width="72" height="54" style="display:block;border-radius:6px;object-fit:cover" alt="">'
    : '<div style="width:72px;height:54px;background:#f1f2f4;border-radius:6px"></div>';
  const besteLabel = isBeste
    ? '<span style="display:inline-block;background:#fff3e0;color:#d14413;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:10px;margin-bottom:4px">&#127942; BESTE DEAL</span><br>'
    : '';
  // Titel is bewust een link naar de originele advertentie (a.url) --
  // voorheen platte tekst, waardoor je in de mail geen enkele auto kon
  // openen zonder terug naar de site te gaan en opnieuw te zoeken.
  return '<tr>' +
    '<td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:80px">' + img + '</td>' +
    '<td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;vertical-align:top">' +
    besteLabel +
    '<a href="' + escHtml(a.url) + '" target="_blank" style="font-weight:600;color:#1a1a2e;text-decoration:none;display:block;margin-bottom:2px">' + escHtml(a.titel) + '</a>' +
    '<span style="color:#d14413;font-weight:700;font-size:15px">' + (a.prijs ? '&euro; ' + fmt(a.prijs) : 'Prijs op aanvraag') + '</span> ' + dealBadgeHtml(a.dealScore) +
    '<div style="color:#888;font-size:13px;margin-top:2px">' + (a.jaar || '') + (a.km != null ? ' &middot; ' + fmt(a.km) + ' km' : '') + (a.bron ? ' &middot; ' + escHtml(a.bron) : '') + '</div>' +
    verdachtGoedkoopHtml(a) +
    (extra ? '<div style="margin-top:2px">' + extra + '</div>' : '') +
    '</td></tr>';
}

// Reconstrueert de homepage-filter-URL voor een zoekagent, met dezelfde
// parameternamen als urlNaarFilters() in index.html leest (merk/q/prijsMin/
// prijsMax) -- zodat "Bekijk alle resultaten" ook echt hetzelfde filter
// toont i.p.v. de kale homepage.
function zoekagentUrl(agent) {
  const p = [];
  if (agent.merk) p.push('merk=' + encodeURIComponent(agent.merk));
  if (agent.q) p.push('q=' + encodeURIComponent(agent.q));
  if (agent.min_prijs != null) p.push('prijsMin=' + agent.min_prijs);
  if (agent.max_prijs != null) p.push('prijsMax=' + agent.max_prijs);
  return SITE_ORIGIN + '/' + (p.length ? '?' + p.join('&') : '');
}

function dealScoreVan(x) { return x != null && x.dealScore != null ? x.dealScore : -1; }

// Eén digest-mail per gebruiker met alle secties die voor hem/haar gelden
// deze run -- i.p.v. een apart mailtje per zoekagent of per prijsdaling, wat
// bij toeval-samenloop (favoriet zakt in prijs én een zoekagent heeft een
// nieuwe match in dezelfde run) tot meerdere mails achter elkaar zou leiden.
function bouwDigestHtml(secties) {
  const TOON_MAX = 10;
  let inhoud = '';
  if (secties.prijsdalingen.length) {
    // Gesorteerd op dealScore (hoogste eerst) -- we willen de beste deal
    // bovenaan presenteren, niet zomaar de eerst-gevonden prijsdaling.
    const gesorteerd = secties.prijsdalingen.slice().sort(function(a, b) { return dealScoreVan(b.listing) - dealScoreVan(a.listing); });
    const rijen = gesorteerd.slice(0, TOON_MAX).map(function(pd, i) {
      const badge = '<span style="color:#16a34a;font-weight:700;font-size:13px">&#8600; was &euro; ' + fmt(pd.vorige) + '</span>';
      return autoRijHtml(pd.listing, badge, i === 0 && dealScoreVan(pd.listing) > 60);
    }).join('');
    const meer = gesorteerd.length > TOON_MAX ? '<p style="color:#888;font-size:13px;margin-top:8px">+ nog ' + (gesorteerd.length - TOON_MAX) + ' andere prijsdalingen.</p>' : '';
    inhoud += '<h2 style="color:#1a1a2e;font-size:18px;margin:20px 0 8px">Prijsdaling op je favorieten</h2>' +
      '<table style="width:100%;border-collapse:collapse">' + rijen + '</table>' + meer;
  }
  secties.zoekagenten.forEach(function(za) {
    const gesorteerd = za.matches.slice().sort(function(a, b) { return dealScoreVan(b) - dealScoreVan(a); });
    const rijen = gesorteerd.slice(0, TOON_MAX).map(function(a, i) { return autoRijHtml(a, null, i === 0 && dealScoreVan(a) > 60); }).join('');
    const meer = gesorteerd.length > TOON_MAX ? '<p style="color:#888;font-size:13px;margin-top:8px">+ nog ' + (gesorteerd.length - TOON_MAX) + ' andere nieuwe advertenties.</p>' : '';
    inhoud += '<h2 style="color:#1a1a2e;font-size:18px;margin:20px 0 8px">Nieuw bij je zoekagent: ' + escHtml(za.agent.label) + '</h2>' +
      '<p style="color:#444;font-size:14px;margin:0 0 4px">Er ' + (za.matches.length === 1 ? 'is 1 nieuwe advertentie' : 'zijn ' + za.matches.length + ' nieuwe advertenties') + ' gevonden.</p>' +
      '<table style="width:100%;border-collapse:collapse">' + rijen + '</table>' + meer +
      '<p style="margin:8px 0 0"><a href="' + zoekagentUrl(za.agent) + '" style="color:#d14413;font-size:13px;font-weight:600;text-decoration:none">Bekijk alle resultaten voor deze zoekagent &rarr;</a></p>';
  });
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#333">' +
    '<div style="font-size:20px;font-weight:800;color:#d14413;margin-bottom:8px">Car<span style="color:#1a1a2e">kijker</span></div>' +
    inhoud +
    '<p style="margin-top:24px"><a href="' + SITE_ORIGIN + '/" style="background:#d14413;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Bekijk alle occasions op Carkijker &rarr;</a></p>' +
    '<p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:12px">Je ontvangt dit omdat je favorieten en/of een zoekagent hebt opgeslagen op Carkijker. Log in op carkijker.nl om deze te beheren of te verwijderen.</p>' +
    '</div>';
}

function onderwerpVoor(secties) {
  const delen = [];
  if (secties.prijsdalingen.length) delen.push(secties.prijsdalingen.length + ' prijsdaling' + (secties.prijsdalingen.length > 1 ? 'en' : ''));
  if (secties.zoekagenten.length) delen.push(secties.zoekagenten.length === 1 ? 'nieuwe advertenties' : 'nieuwe advertenties op ' + secties.zoekagenten.length + ' zoekagenten');
  return 'Carkijker: ' + delen.join(' & ');
}

async function verstuurMail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject: subject, html: html }),
  });
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}

// Korte samenvatting voor de pushmelding zelf (geen HTML-digest zoals de
// mail -- een OS-notificatie toont doorgaans maar 1-2 regels). Bij een
// prijsdaling de beste (hoogste dealScore) erin, per zoekagent alleen het
// aantal -- voor de volledige lijst linkt de melding gewoon door naar de site.
function pushBodyVoor(secties) {
  const delen = [];
  if (secties.prijsdalingen.length) {
    const beste = secties.prijsdalingen.slice().sort(function(a, b) { return dealScoreVan(b.listing) - dealScoreVan(a.listing); })[0];
    delen.push((beste.listing.titel || 'Favoriet').slice(0, 36) + ': was €' + fmt(beste.vorige) + ', nu €' + fmt(beste.listing.prijs));
  }
  secties.zoekagenten.forEach(function(za) {
    delen.push(za.matches.length + ' nieuw bij "' + za.agent.label + '"');
  });
  return delen.join(' · ').slice(0, 180);
}

// Stuurt de pushmelding naar alle abonnementen van één gebruiker. Best-effort
// per abonnement: een falend abonnement (verlopen/ingetrokken, browser geeft
// dan 404 of 410 terug) wordt verwijderd zodat een volgende run niet
// opnieuw tegen dezelfde dode endpoint aanloopt; andere fouten (tijdelijke
// storing bij de push-service) worden alleen gelogd, niet als reden om de
// rij te verwijderen.
async function verstuurPushVoorGebruiker(userId, subs, payload) {
  const vapidKeys = { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
  for (const sub of subs) {
    try {
      const res = await sendWebPush(sub, payload, vapidKeys, VAPID_SUBJECT);
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          await supabaseFetch('/rest/v1/push_subscriptions?id=eq.' + sub.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
            .catch(function(e) { console.warn('  [FOUT] push_subscriptions-opruiming ' + sub.id + ': ' + e.message); });
        } else {
          console.warn('  [FOUT] pushmelding ' + userId + '/' + sub.id + ': HTTP ' + res.status);
        }
      }
    } catch (e) {
      console.warn('  [FOUT] pushmelding ' + userId + '/' + sub.id + ': ' + e.message);
    }
  }
}

async function main() {
  if (!fs.existsSync(LISTINGS_PATH)) { console.error('listings.json niet gevonden -- sla notificaties over.'); process.exit(0); }
  const raw = JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf-8'));
  const listings = raw.listings || [];
  const listingsById = {};
  listings.forEach(function(a){ if (a.id) listingsById[a.id] = a; });
  const vandaag = new Date().toISOString().slice(0, 10);

  // Eén admin-call voor alle gebruikers i.p.v. per rij een aparte opzoeking --
  // e-mailadressen staan alleen in het beveiligde auth.users-schema, alleen
  // met de service-role-key opvraagbaar (vandaar dat dit server-side moet).
  const gebruikersRespons = await supabaseFetch('/auth/v1/admin/users?per_page=1000');
  const gebruikers = (gebruikersRespons && gebruikersRespons.users) || [];
  const emailPerUser = {};
  gebruikers.forEach(function(u) { emailPerUser[u.id] = u.email; });
  console.log('Gebruikers geladen: ' + gebruikers.length);

  // Per-gebruiker digest opbouwen; de daadwerkelijke Supabase-PATCH voor een
  // sectie gebeurt pas ná een geslaagde verstuurpoging (zie onderaan) --
  // anders zou een mislukte mail (bv. tijdelijke Resend-storing) alsnog als
  // "gezien"/"al gemeld" geregistreerd worden en die match voorgoed missen.
  const perUser = {};
  function sectieVoor(userId) {
    if (!perUser[userId]) perUser[userId] = { zoekagenten: [], prijsdalingen: [], agentPatches: [], favPatches: [] };
    return perUser[userId];
  }

  // ── 1. Zoekagenten ──
  const agenten = await supabaseFetch('/rest/v1/zoekagenten?select=*');
  console.log('Zoekagenten geladen: ' + (agenten ? agenten.length : 0));
  (agenten || []).forEach(function(agent) {
    if (!emailPerUser[agent.user_id]) return;
    const nieuw = vindNieuweMatches(agent, listings, vandaag);
    if (!nieuw.length) return;
    const s = sectieVoor(agent.user_id);
    s.zoekagenten.push({ agent: agent, matches: nieuw });
    s.agentPatches.push({ id: agent.id, gezien_ids: (agent.gezien_ids || []).concat(nieuw.map(function(a){ return a.id; })) });
  });

  // ── 2. Favorieten: prijsdaling t.o.v. de vorige controle ──
  // laatst_gemelde_prijs is bewust "prijs bij de vorige controle", niet
  // "prijs bij de laatste melding" -- zo blijft elke run vergelijken met het
  // meest recente bekende punt i.p.v. een oude piek, en wordt hij bij elke
  // run bijgewerkt (ook als de prijs gelijk bleef of steeg), zodat een latere
  // daling altijd tegen de juiste referentie afgezet wordt.
  const favorieten = await supabaseFetch('/rest/v1/favorites?select=*');
  console.log('Favorieten geladen: ' + (favorieten ? favorieten.length : 0));
  const initPatches = []; // hoeven niet op een mail te wachten -- geen melding, dus direct uitvoerbaar
  (favorieten || []).forEach(function(fav) {
    if (!emailPerUser[fav.user_id]) return;
    const listing = listingsById[fav.listing_id];
    if (!listing || listing.prijs == null) return; // verkocht/verwijderd of geen prijs -- niets te vergelijken
    const vorige = fav.laatst_gemelde_prijs;
    if (vorige == null) {
      initPatches.push({ user_id: fav.user_id, listing_id: fav.listing_id, prijs: listing.prijs });
      return;
    }
    if (listing.prijs < vorige) {
      const s = sectieVoor(fav.user_id);
      s.prijsdalingen.push({ listing: listing, vorige: vorige });
      s.favPatches.push({ user_id: fav.user_id, listing_id: fav.listing_id, prijs: listing.prijs });
    } else if (listing.prijs !== vorige) {
      initPatches.push({ user_id: fav.user_id, listing_id: fav.listing_id, prijs: listing.prijs }); // gestegen -- bijwerken, geen melding
    }
  });
  for (const p of initPatches) {
    await supabaseFetch('/rest/v1/favorites?user_id=eq.' + p.user_id + '&listing_id=eq.' + encodeURIComponent(p.listing_id), {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ laatst_gemelde_prijs: p.prijs, laatst_gemeld_op: new Date().toISOString() }),
    }).catch(function(e){ console.warn('  [FOUT] favorites-init PATCH ' + p.user_id + '/' + p.listing_id + ': ' + e.message); });
  }

  // ── 3. Pushabonnementen (best-effort extra kanaal, zie bovenaan dit bestand) ──
  const subsPerUser = {};
  if (PUSH_AAN) {
    const subs = await supabaseFetch('/rest/v1/push_subscriptions?select=*');
    console.log('Pushabonnementen geladen: ' + (subs ? subs.length : 0));
    (subs || []).forEach(function(s) {
      if (!subsPerUser[s.user_id]) subsPerUser[s.user_id] = [];
      subsPerUser[s.user_id].push(s);
    });
  }

  // ── 4. Versturen + pas dan de bijbehorende rijen bijwerken ──
  let verstuurd = 0, fouten = 0, overgeslagen = 0;
  for (const [userId, secties] of Object.entries(perUser)) {
    if (!secties.zoekagenten.length && !secties.prijsdalingen.length) continue;
    const email = emailPerUser[userId];
    if (!email) { overgeslagen++; continue; }
    try {
      await verstuurMail(email, onderwerpVoor(secties), bouwDigestHtml(secties));
      for (const p of secties.agentPatches) {
        await supabaseFetch('/rest/v1/zoekagenten?id=eq.' + p.id, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ gezien_ids: p.gezien_ids }),
        });
      }
      for (const p of secties.favPatches) {
        await supabaseFetch('/rest/v1/favorites?user_id=eq.' + p.user_id + '&listing_id=eq.' + encodeURIComponent(p.listing_id), {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ laatst_gemelde_prijs: p.prijs, laatst_gemeld_op: new Date().toISOString() }),
        });
      }
      verstuurd++;
      console.log('  [OK] ' + email + ' -- ' + secties.zoekagenten.length + ' zoekagent-sectie(s), ' + secties.prijsdalingen.length + ' prijsdaling(en)');
    } catch (e) {
      fouten++;
      console.warn('  [FOUT] ' + email + ': ' + e.message);
    }
    // Pushmelding is bewust NIET gekoppeld aan het succes/falen van de mail
    // hierboven -- een mislukte pushmelding mag nooit de e-mailboekhouding
    // (agentPatches/favPatches) beïnvloeden, en andersom hoeft een gebruiker
    // zonder pushabonnement dit niet te missen.
    const subs = subsPerUser[userId];
    if (subs && subs.length) {
      await verstuurPushVoorGebruiker(userId, subs, { title: onderwerpVoor(secties), body: pushBodyVoor(secties), url: SITE_ORIGIN + '/' });
    }
    await sleep(300); // lichte throttle, ruim binnen Resend's rate limit
  }
  console.log('Klaar: ' + verstuurd + ' verstuurd, ' + overgeslagen + ' overgeslagen (geen e-mailadres), ' + fouten + ' fouten. (' + initPatches.length + ' favoriet(en) geïnitialiseerd/bijgewerkt zonder melding.)');
  if (fouten > 0 && verstuurd === 0) process.exit(1); // alles mislukt: laat dit zichtbaar falen
}

main().catch(function(e) { console.error('Onverwachte fout bij versturen notificaties:', e); process.exit(1); });
