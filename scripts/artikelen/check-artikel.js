#!/usr/bin/env node
// scripts/artikelen/check-artikel.js
// Toetst een data/artikelen/*.json aan het Carkijker SEO/GEO-template
// (docs/seo-geo-artikel-template.md) en de huisstijl. Twee niveaus:
//   - fouten: blokkeren de concept-PR / PR-validatie (kapotte links,
//     verboden woorden, ontbrekende velden, Amerikaanse dash-stijl, ...)
//   - waarschuwingen: komen in de PR-body voor de eindredacteur, blokkeren
//     niet (lengte, aantal zinnen in de intro, ...)
// Wat zich niet laat automatiseren (klopt elk cijfer, is het inzicht echt
// onderscheidend) staat als checklist in de PR-body: dat is de human in the loop.
//
// CLI: node scripts/artikelen/check-artikel.js data/artikelen/x.json [...]
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const VERPLICHT = ['slug', 'titel', 'metaDescription', 'categorie', 'categorieSlug', 'gepubliceerd',
  'bijgewerkt', 'auteur', 'leestijdMinuten', 'intro', 'secties', 'faq', 'gerelateerd'];

// Elena's lijst + template §5 ("Geen fluff-openers") + het team-verbod op
// AI-clichés. Woordgrenzen zodat "ontdekken" ook gevangen wordt maar
// "uniekere" niet per ongeluk "uniek" mist: we matchen op de stam.
const VERBODEN = [
  /\bontdek\w*/i, /\buniek\w*/i, /\brevolution\w*|\brevolutie\w*/i, /\bmust[- ]have\b/i,
  /\bin dit artikel\b/i, /\bop zoek naar\b[^.?!]{0,80}\?/i, /\bwist je dat\b/i, /\bkortom\b/i,
  /\bduik\w* in\b/i, /\bgame[- ]?changer\b/i, /\bnaadloos\b/i,
];
const VAGE_KOPPEN = /^(meer informatie|overwegingen|algemeen|inleiding|conclusie|tot slot|overig)$/i;

function tekst(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function woorden(s) { return tekst(s).split(' ').filter(Boolean).length; }
function zinnen(s) { return tekst(s).split(/(?<=[.!?])\s+(?=[A-Z0-9€"'])/).filter(x => x.trim()).length; }

function bestaatIntern(url, rootDir, extraSlugs) {
  const u = url.split('#')[0].split('?')[0];
  if (u === '/') return true;
  const m = u.match(/^\/artikelen\/([^/]+)\/$/);
  if (m && extraSlugs && extraSlugs.includes(m[1])) return true;
  const p = path.join(rootDir, u.replace(/^\//, ''), u.endsWith('/') ? 'index.html' : '');
  return fs.existsSync(p);
}

function checkArtikel(art, opties) {
  opties = opties || {};
  const rootDir = opties.rootDir || ROOT;
  const fouten = [], waarschuwingen = [];

  for (const k of VERPLICHT) if (art[k] == null || art[k] === '') fouten.push('Veld ontbreekt: ' + k);
  if (fouten.length) return { fouten, waarschuwingen };

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(art.slug)) fouten.push('slug is geen kebab-case: ' + art.slug);
  if (opties.bestandsnaam && path.basename(opties.bestandsnaam, '.json') !== art.slug)
    fouten.push('Bestandsnaam en slug verschillen');
  for (const d of ['gepubliceerd', 'bijgewerkt'])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(art[d])) fouten.push(d + ' is geen YYYY-MM-DD');

  // §1 H1
  if (art.titel.length > 75) waarschuwingen.push('Titel is ' + art.titel.length + ' tekens (>75 wordt in Google afgekapt, " | Carkijker" komt er nog achter)');
  const md = art.metaDescription.length;
  if (md < 110 || md > 160) waarschuwingen.push('metaDescription is ' + md + ' tekens (streef naar 120-160)');

  // §2 openingsalinea: het directe antwoord
  const iw = woorden(art.intro), iz = zinnen(art.intro);
  if (iw > 90) fouten.push('Intro is ' + iw + ' woorden; template §2 vraagt 40-60 (direct antwoord)');
  else if (iw < 35 || iw > 65) waarschuwingen.push('Intro is ' + iw + ' woorden (template §2: 40-60)');
  if (iz > 3) waarschuwingen.push('Intro heeft ' + iz + ' zinnen (template §2: max 2-3)');
  if (!/\d/.test(art.intro)) waarschuwingen.push('Intro bevat geen enkel cijfer (template §2: minstens één hard cijfer of feit)');
  if (/^(op zoek|ben je|wil je|in dit|wist je|heb je)/i.test(tekst(art.intro))) fouten.push('Intro opent met een opwarmertje i.p.v. het antwoord (template §2)');

  // §3 koppen
  if (!Array.isArray(art.secties) || art.secties.length < 3) fouten.push('Minimaal 3 secties (H2) nodig');
  (art.secties || []).forEach((s, i) => {
    if (!s.kop || !s.html) { fouten.push('Sectie ' + (i + 1) + ' mist kop of html'); return; }
    if (VAGE_KOPPEN.test(s.kop.trim())) fouten.push('Vage H2 "' + s.kop + '" (template §3: vraag of claim)');
    if (/<h[12][\s>]/i.test(s.html)) fouten.push('Sectie "' + s.kop + '" bevat een <h1>/<h2>; gebruik <h3> voor onderverdeling');
    if (/<script/i.test(s.html)) fouten.push('Sectie "' + s.kop + '" bevat een <script>');
    const eerste = tekst((s.html.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '');
    if (/^(in deze sectie|hieronder|we bekijken|laten we)/i.test(eerste)) fouten.push('Sectie "' + s.kop + '" opent met een aankondiging i.p.v. het antwoord (template §3)');
  });

  // FAQ
  if (!Array.isArray(art.faq) || art.faq.length < 3) fouten.push('Minimaal 3 FAQ-items nodig (FAQPage-schema)');
  else if (art.faq.length > 6) waarschuwingen.push(art.faq.length + ' FAQ-items; 3-6 is genoeg');
  (art.faq || []).forEach(f => { if (!f.vraag || !f.antwoord) fouten.push('FAQ-item zonder vraag/antwoord'); });

  // Huisstijl over alle zichtbare tekst
  const alles = [art.titel, art.metaDescription, art.intro]
    .concat((art.secties || []).map(s => s.kop + ' ' + s.html))
    .concat((art.faq || []).map(f => f.vraag + ' ' + f.antwoord)).join('\n');
  if (/—/.test(alles)) fouten.push('Em-dash (—) gevonden; huisstijl gebruikt geen Amerikaanse dash-schrijfstijl (zie #130/#135)');
  for (const re of VERBODEN) {
    const m = tekst(alles).match(re);
    if (m) fouten.push('Verboden formulering: "' + m[0].slice(0, 60) + '"');
  }

  // §5 interne links: minstens één occasion-link, en elk intern linkdoel moet bestaan
  const hrefs = [...alles.matchAll(/href="([^"]+)"/g)].map(m => m[1])
    .concat((Array.isArray(art.gerelateerd) ? art.gerelateerd : [art.gerelateerd]).map(g => g && g.url).filter(Boolean));
  if (!hrefs.some(h => h.startsWith('/occasions/'))) fouten.push('Geen link naar een /occasions/-pagina (template §5, interne links)');
  for (const h of new Set(hrefs)) {
    if (h.startsWith('/')) {
      if (!bestaatIntern(h, rootDir, opties.extraSlugs)) fouten.push('Interne link naar niet-bestaande pagina: ' + h);
    } else if (!/^https:\/\//.test(h)) fouten.push('Ongeldige link: ' + h);
  }
  if (/>\s*(klik hier|hier|deze link)\s*</i.test(alles)) fouten.push('Linktekst "klik hier"/"hier" (template §5: beschrijvende linktekst)');

  const totaal = woorden(art.intro) + (art.secties || []).reduce((n, s) => n + woorden(s.html), 0);
  if (totaal < 700) waarschuwingen.push('Artikel is ' + totaal + ' woorden; dun voor een gids (streef 900-1.400)');
  if (totaal > 1800) waarschuwingen.push('Artikel is ' + totaal + ' woorden; scanbaarheid lijdt boven ~1.800');

  return { fouten, waarschuwingen, woorden: totaal };
}

module.exports = { checkArtikel, woorden, tekst };

if (require.main === module) {
  const bestanden = process.argv.slice(2);
  let fout = false;
  for (const f of bestanden) {
    const r = checkArtikel(JSON.parse(fs.readFileSync(f, 'utf-8')), { bestandsnaam: f });
    console.log((r.fouten.length ? 'FOUT ' : 'OK   ') + f + (r.woorden ? ' (' + r.woorden + ' woorden)' : ''));
    r.fouten.forEach(x => console.log('  ✗ ' + x));
    r.waarschuwingen.forEach(x => console.log('  ! ' + x));
    if (r.fouten.length) fout = true;
  }
  process.exit(fout ? 1 : 0);
}
