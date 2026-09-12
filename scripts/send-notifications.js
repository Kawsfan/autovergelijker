#!/usr/bin/env node
// scripts/send-notifications.js
// Verstuurt e-mailmeldingen voor opgeslagen zoekagenten (Supabase-tabel
// "zoekagenten") wanneer er nieuwe advertenties matchen sinds de vorige
// controle. Draait als losse stap ná scrape.js in de scrape-workflow, dus
// 3x/dag -- niet "één dagelijkse digest", maar een melding zo snel als de
// eerstvolgende scrape-run een match oplevert.
//
// Bewuste scope-keuze (sep '26): favorieten-prijsdalingsalerts zijn NIET in
// deze eerste versie meegenomen -- de "favorites"-tabel in Supabase heeft
// geen kolom om "laatst gemelde prijs" bij te houden, en die toevoegen vergt
// een schemawijziging die alleen de accounthouder zelf in de Supabase SQL-
// editor kan zetten (deze sessie heeft geen DB-schrijftoegang). Zoekagenten
// hergebruiken wel al bestaande kolommen (zie hieronder), dus die kunnen nu.
//
// Vereist drie secrets (GitHub Actions repo-secrets, nooit in code/chat):
//   SUPABASE_URL               -- bv. https://xxxx.supabase.co (niet geheim,
//                                  maar hier vanuit dezelfde plek voor het gemak)
//   SUPABASE_SERVICE_ROLE_KEY  -- Supabase dashboard > Settings > API >
//                                  "service_role" secret. NIET de anon-key die
//                                  index.html gebruikt: die kan door Row Level
//                                  Security niet bij andere gebruikers' rijen of
//                                  bij auth.users -- de service-role-key wel,
//                                  en is dus alleen server-side te gebruiken.
//   RESEND_API_KEY              -- Resend dashboard > API keys.
// Ontbreekt een van de drie (bv. nog niet geconfigureerd), dan slaat dit
// script zichzelf stilletjes over (exit 0) i.p.v. de hele scrape-workflow te
// laten falen.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Vereist een in Resend geverifieerd domein (Domains-tab) -- tot die
// verificatie rond is, faalt elke verstuurpoging vanaf dit adres met een
// duidelijke Resend-foutmelding in de workflow-log (geen stille misser).
const FROM_ADDRESS = process.env.NOTIFICATIONS_FROM || 'Carkijker <info@carkijker.nl>';
const SITE_ORIGIN = 'https://carkijker.nl';
const LISTINGS_PATH = path.join(process.cwd(), 'data', 'listings.json');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.log('E-mailnotificaties overgeslagen: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY nog niet (volledig) geconfigureerd als secret.');
  process.exit(0);
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
// merk/q worden hier tegen a.merk gematcht i.p.v. _getMerk(a.titel) zoals de
// client doet -- listings.json heeft merk al als apart veld (de client moet
// dat nog uit de titel afleiden omdat listings-lean.json dat óók al los
// meegeeft sinds de kolomvorm-fix, dus dit is hier eenvoudiger, niet anders).
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

function bouwEmailHtml(agent, matches) {
  const TOON_MAX = 10;
  const rijen = matches.slice(0, TOON_MAX).map(function(a) {
    return '<tr><td style="padding:12px 0;border-bottom:1px solid #eee">' +
      '<div style="font-weight:600;color:#1a1a2e;margin-bottom:2px">' + escHtml(a.titel) + '</div>' +
      '<span style="color:#d14413;font-weight:700;font-size:15px">' + (a.prijs ? '&euro; ' + fmt(a.prijs) : 'Prijs op aanvraag') + '</span>' +
      '<span style="color:#888;font-size:13px"> &middot; ' + (a.jaar || '') + (a.km != null ? ' &middot; ' + fmt(a.km) + ' km' : '') + (a.bron ? ' &middot; ' + escHtml(a.bron) : '') + '</span>' +
      '</td></tr>';
  }).join('');
  const meer = matches.length > TOON_MAX
    ? '<p style="color:#888;font-size:13px;margin-top:8px">+ nog ' + (matches.length - TOON_MAX) + ' andere nieuwe advertenties.</p>'
    : '';
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#333">' +
    '<div style="font-size:20px;font-weight:800;color:#d14413;margin-bottom:16px">Car<span style="color:#1a1a2e">kijker</span></div>' +
    '<h2 style="color:#1a1a2e;font-size:18px;margin:0 0 8px">Nieuw bij je zoekagent: ' + escHtml(agent.label) + '</h2>' +
    '<p style="color:#444;font-size:14px">Er ' + (matches.length === 1 ? 'is 1 nieuwe advertentie' : 'zijn ' + matches.length + ' nieuwe advertenties') + ' gevonden die matchen met je zoekagent op Carkijker.</p>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:8px">' + rijen + '</table>' +
    meer +
    '<p style="margin-top:24px"><a href="' + SITE_ORIGIN + '/" style="background:#d14413;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Bekijk op Carkijker &rarr;</a></p>' +
    '<p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:12px">Je ontvangt dit omdat je een zoekagent hebt opgeslagen op Carkijker. Log in op carkijker.nl om je zoekagenten te beheren of te verwijderen.</p>' +
    '</div>';
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

async function main() {
  if (!fs.existsSync(LISTINGS_PATH)) { console.error('listings.json niet gevonden -- sla notificaties over.'); process.exit(0); }
  const raw = JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf-8'));
  const listings = raw.listings || [];
  const vandaag = new Date().toISOString().slice(0, 10);

  const agenten = await supabaseFetch('/rest/v1/zoekagenten?select=*');
  console.log('Zoekagenten geladen: ' + (agenten ? agenten.length : 0));
  if (!agenten || !agenten.length) { console.log('Geen zoekagenten opgeslagen -- niets te versturen.'); return; }

  // Eén admin-call voor alle gebruikers i.p.v. per zoekagent een aparte
  // opzoeking -- e-mailadressen staan alleen in het beveiligde auth.users-
  // schema, niet in een gewone tabel, en zijn alleen met de service-role-key
  // opvraagbaar (vandaar dat dit per definitie een server-side script is).
  const gebruikersRespons = await supabaseFetch('/auth/v1/admin/users?per_page=1000');
  const gebruikers = (gebruikersRespons && gebruikersRespons.users) || [];
  const emailPerUser = {};
  gebruikers.forEach(function(u) { emailPerUser[u.id] = u.email; });
  console.log('Gebruikers geladen: ' + gebruikers.length);

  let verstuurd = 0, geenMatch = 0, geenEmail = 0, fouten = 0;
  for (const agent of agenten) {
    const email = emailPerUser[agent.user_id];
    if (!email) { geenEmail++; continue; }
    const nieuw = vindNieuweMatches(agent, listings, vandaag);
    if (!nieuw.length) { geenMatch++; continue; }
    try {
      await verstuurMail(email, 'Nieuw bij Carkijker: ' + agent.label, bouwEmailHtml(agent, nieuw));
      const gezienIds = (agent.gezien_ids || []).concat(nieuw.map(function(a){ return a.id; }));
      // Zelfde kolom als de (nooit teruggeschreven) client-side gezieneIds --
      // dit is voor het eerst dat gezien_ids server-side wordt bijgewerkt.
      // Bijkomend voordeel: een gebruiker die op een ander apparaat inlogt en
      // _syncZoekagenten() draait, krijgt deze bijgewerkte lijst dan ook
      // mee i.p.v. alleen lokaal-per-apparaat bij te houden.
      await supabaseFetch('/rest/v1/zoekagenten?id=eq.' + agent.id, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ gezien_ids: gezienIds }),
      });
      verstuurd++;
      console.log('  [OK] ' + email + ' -- "' + agent.label + '" (' + nieuw.length + ' nieuw)');
    } catch (e) {
      fouten++;
      console.warn('  [FOUT] ' + email + ' -- "' + agent.label + '": ' + e.message);
    }
    await sleep(300); // lichte throttle, ruim binnen Resend's rate limit
  }
  console.log('Klaar: ' + verstuurd + ' verstuurd, ' + geenMatch + ' zonder nieuwe match, ' + geenEmail + ' zonder e-mailadres, ' + fouten + ' fouten.');
  if (fouten > 0 && verstuurd === 0) process.exit(1); // alles mislukt: laat dit zichtbaar falen
}

main().catch(function(e) { console.error('Onverwachte fout bij versturen notificaties:', e); process.exit(1); });
