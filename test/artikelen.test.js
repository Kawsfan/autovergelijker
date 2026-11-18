// test/artikelen.test.js
// Draai met: node --test
// Dekt de artikel-pipeline (scripts/artikelen/): marktdata-berekening, de
// template-check en de omzetting van modeloutput naar artikel-JSON. Geen
// netwerk en geen API-key nodig.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { berekenMarktdata, stats, voldoetAanFilters, normBrandstof, normCarrosserie } = require('../scripts/artikelen/marktdata');
const { checkArtikel } = require('../scripts/artikelen/check-artikel');
const { naarArtikel, kiesOnderwerp } = require('../scripts/artikelen/genereer-concept');
const { stempel } = require('../scripts/artikelen/publiceer');

const ROOT = path.join(__dirname, '..');

function auto(o) {
  return Object.assign({ merk: 'Volkswagen', model: 'Golf', prijs: 10000, jaar: 2016, km: 120000, brandstof: 'Benzine',
    transmissie: 'Handgeschakeld', carrosserie: 'Hatchback', bron: 'Marktplaats', titel: 'VW Golf', dealScore: 50, priceTrend: 'stabiel' }, o);
}

test('normalisatie vangt de spellingsvarianten uit de bronnen', () => {
  assert.equal(normBrandstof('Hybride Elektrisch/Benzine'), 'Hybride');
  assert.equal(normBrandstof('Elektriciteit'), 'Elektrisch');
  assert.equal(normBrandstof('benzine'), 'Benzine');
  assert.equal(normCarrosserie('SUV / Terreinwagen'), 'SUV');
  assert.equal(normCarrosserie('Stationwagen'), 'Stationwagon');
});

test('stats: mediaan, kwartielen en prijs per bouwjaar (alleen jaren met >=5 stuks)', () => {
  const items = [6000, 8000, 10000, 12000, 14000].map(p => auto({ prijs: p, jaar: 2016 })).concat([auto({ prijs: 30000, jaar: 2022 })]);
  const s = stats(items);
  assert.equal(s.aantal, 6);
  assert.equal(s.prijs.mediaan, 11000);
  assert.deepEqual(s.prijsPerBouwjaar.map(r => r.bouwjaar), [2016]);
  assert.equal(s.prijsPerBouwjaar[0].mediaanPrijs, 10000);
  assert.equal(s.aanbieder, undefined, 'onbetrouwbare dealer/particulier-verdeling hoort niet in de marktdata');
});

test('filters en uitsluiting van verdacht goedkope advertenties', () => {
  const rows = [auto({ prijs: 9000 }), auto({ prijs: 11000 }), auto({ prijs: 2000, verdachtGoedkoop: true }), auto({ prijs: 9500, transmissie: 'Automaat' })];
  assert.equal(voldoetAanFilters(rows[3], { transmissie: 'Automaat', maxPrijs: 10000 }), true);
  const md = berekenMarktdata(rows, { filters: { maxPrijs: 10000 } }, { rootDir: ROOT, peildatum: '2026-11-10' });
  assert.equal(md.totaalInSelectie, 2);
  assert.equal(md.modellen[0].merk, 'Volkswagen');
  assert.ok(md.selectie, 'segmentartikel krijgt selectie-brede cijfers');
});

test('modelgids zonder filters krijgt geen marktbrede selectie-stats', () => {
  const md = berekenMarktdata([auto({})], { modellen: [{ merk: 'Volkswagen', model: 'Golf' }] }, { rootDir: ROOT });
  assert.equal(md.selectie, undefined);
  assert.equal(md.modellen[0].aantal, 1);
});

function geldigArtikel() {
  const lang = '<p>' + 'De Volkswagen Golf heeft een groot aanbod op Carkijker. '.repeat(20) + '</p>';
  return {
    slug: 'test-artikel', titel: 'Tweedehands Volkswagen Golf kopen', categorie: 'Kopen', categorieSlug: 'kopen',
    metaDescription: 'Een tweedehands Volkswagen Golf kost mediaan €11.500 op Carkijker. Prijzen per bouwjaar en de belangrijkste aandachtspunten.',
    gepubliceerd: '2026-11-10', bijgewerkt: '2026-11-10', auteur: 'Carkijker redactie', leestijdMinuten: 5,
    intro: 'Een tweedehands Volkswagen Golf kost op Carkijker een middelste vraagprijs van €11.500, op basis van 753 advertenties. Een Golf uit 2020 staat rond €19.400 te koop, een Golf uit 2015 rond €10.750, met een mediane kilometerstand van 151.000 km.',
    secties: [
      { kop: 'Wat kost een tweedehands Volkswagen Golf?', html: '<p>Een <a href="/occasions/">Volkswagen Golf</a> kost mediaan €11.500.</p>' + lang },
      { kop: 'Golf 7 of Golf 8 kopen?', html: lang },
      { kop: 'Hoe betrouwbaar zijn deze cijfers?', html: lang },
    ],
    faq: [{ vraag: 'a?', antwoord: 'b' }, { vraag: 'c?', antwoord: 'd' }, { vraag: 'e?', antwoord: 'f' }],
    gerelateerd: [{ label: 'Alle occasions', url: '/occasions/' }],
  };
}

test('check-artikel: geldig artikel heeft geen fouten', () => {
  const r = checkArtikel(geldigArtikel(), { rootDir: ROOT });
  assert.deepEqual(r.fouten, []);
});

test('check-artikel: em-dash, verboden woord, opwarmer en kapotte link zijn fouten', () => {
  const a = geldigArtikel();
  a.intro = 'Op zoek naar een Golf? ' + a.intro;
  a.secties[1].html += '<p>Dit is uniek — echt waar. Bekijk <a href="/occasions/bestaat-niet/">deze</a>.</p>';
  const f = checkArtikel(a, { rootDir: ROOT }).fouten.join('\n');
  assert.match(f, /Em-dash/);
  assert.match(f, /uniek/);
  assert.match(f, /opwarmertje/);
  assert.match(f, /niet-bestaande pagina: \/occasions\/bestaat-niet\//);
});

test('check-artikel: <h2> in sectie-html en vage kop zijn fouten', () => {
  const a = geldigArtikel();
  a.secties[2] = { kop: 'Conclusie', html: '<h2>Dubbel</h2>' + a.secties[2].html };
  const f = checkArtikel(a, { rootDir: ROOT }).fouten.join('\n');
  assert.match(f, /Vage H2/);
  assert.match(f, /<h1>\/<h2>/);
});

test('alle gepubliceerde artikelen halen de check zonder fouten', () => {
  const dir = path.join(ROOT, 'data', 'artikelen');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const r = checkArtikel(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')), { rootDir: ROOT, bestandsnaam: f });
    assert.deepEqual(r.fouten, [], f);
  }
});

test('naarArtikel vult metadata en leestijd, en neemt redactieNotities niet mee', () => {
  const g = geldigArtikel();
  const art = naarArtikel(Object.assign({}, g, { slug: 'iets-anders', redactieNotities: ['check x'] }), { slug: 'test-artikel' }, '2026-11-10');
  assert.equal(art.slug, 'test-artikel');
  assert.equal(art.categorieSlug, 'kopen');
  assert.equal(art.auteur, 'Carkijker redactie');
  assert.equal(art.redactieNotities, undefined);
  assert.ok(art.leestijdMinuten >= 2);
});

test('kiesOnderwerp slaat bestaande artikelen en open branches over', () => {
  const planning = { onderwerpen: [{ slug: 'tweedehands-auto-kopen-checklist' }, { slug: 'a' }, { slug: 'b' }] };
  assert.equal(kiesOnderwerp(planning, {}).slug, 'a');
  assert.equal(kiesOnderwerp(planning, { overslaan: 'a' }).slug, 'b');
  assert.equal(kiesOnderwerp(planning, { overslaan: 'a,b' }), null);
  assert.equal(kiesOnderwerp(planning, { slug: 'b', overslaan: 'b' }).slug, 'b');
});

test('planning: elke slug is uniek en kebab-case', () => {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'artikel-planning.json'), 'utf-8'));
  const slugs = p.onderwerpen.map(o => o.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  slugs.forEach(s => assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/));
});

test('publiceer: stempel zet beide datums', () => {
  assert.deepEqual(stempel({ slug: 'x', gepubliceerd: '2026-01-01', bijgewerkt: '2026-01-01' }, '2026-11-12'),
    { slug: 'x', gepubliceerd: '2026-11-12', bijgewerkt: '2026-11-12' });
});

const { bouwMail, telVerificatiepunten } = require('../scripts/artikelen/meld-concept');

test('meld-concept: mail bevat titel, preview- en PR-link, en escapet HTML', () => {
  const art = { slug: 'x-y', titel: 'Golf <b>test</b>', intro: 'Prijs & km', categorie: 'Kopen', leestijdMinuten: 6 };
  const m = bouwMail({ art, prUrl: 'https://github.com/Kawsfan/autovergelijker/pull/185', status: 'nieuw', nVerifieren: 4 });
  assert.equal(m.onderwerp, 'Nieuw artikelconcept: Golf <b>test</b>');
  assert.equal(m.preview, 'https://deploy-preview-185--classy-ganache-4cfb6b.netlify.app/artikelen/x-y/');
  assert.match(m.html, /Golf &lt;b&gt;test&lt;\/b&gt;/);
  assert.match(m.html, /Prijs &amp; km/);
  assert.match(m.html, /4 claims om na te lopen/);
  assert.match(bouwMail({ art, prUrl: 'x', status: 'bijgewerkt' }).onderwerp, /^Artikelconcept bijgewerkt/);
});

test('meld-concept: telt alleen open punten onder "Te verifiëren"', () => {
  const body = '### Te verifiëren door de eindredactie\n- [ ] a\n- [ ] b\n\n### Publicatiechecklist\n- [ ] c\n';
  assert.equal(telVerificatiepunten(body), 2);
  assert.equal(telVerificatiepunten(''), 0);
});

const { variantVan } = require('../scripts/artikelen/marktdata');

test('variantVan: andere modellen onder hetzelfde modelveld, maar geen trims', () => {
  const t = (merk, model, titel) => variantVan({ merk, model, titel });
  assert.equal(t('Toyota', 'Yaris', 'Toyota Yaris Cross 1.5 Hybrid 130 Dynamic'), 'Yaris Cross');
  assert.equal(t('Toyota', 'Yaris', 'Toyota GR Yaris | 317 PK'), 'GR Yaris');
  assert.equal(t('Toyota', 'Yaris', 'Toyota Yaris GR 1.6 Turbo 261pk 2023'), 'GR Yaris');
  assert.equal(t('Toyota', 'Yaris', 'Toyota Yaris 1.5 Hybrid GR Sport | Panoramadak'), null, 'GR Sport is een trim');
  assert.equal(t('Toyota', 'Corolla', 'Toyota Corolla Verso 1.8 VVT-i'), 'Corolla Verso');
  assert.equal(t('Volkswagen', 'Golf', 'Volkswagen Golf Plus 1.4 TSI'), 'Golf Plus');
  assert.equal(t('Volkswagen', 'Golf', 'Volkswagen Golf 1.4 TSI Variant Highline'), null, 'Variant is een carrosserie');
  assert.equal(t('Land Rover', 'Range Rover', 'Land Rover Range Rover Sport 3.0 TDV6 HSE'), 'Range Rover Sport');
  assert.equal(t('Land Rover', 'Range Rover', 'Land Rover Range Rover Evoque 2.0 eD4'), 'Range Rover Evoque');
  assert.equal(t('Land Rover', 'Range Rover', 'Land Rover Range Rover 4.4 SDV8 Vogue'), null, 'klassieke Range Rover');
  assert.equal(variantVan({ merk: 'Kia', model: 'Niro', titel: 'Kia Niro 1.6 GDi Hybrid' }, ['plug-?in']), null);
  assert.equal(variantVan({ merk: 'Kia', model: 'Niro', titel: 'Kia Niro Plug-in Hybrid' }, ['plug-?in']), 'plug-?in');
});

test('berekenMarktdata: modelgids sluit varianten uit en rapporteert ze', () => {
  const rows = [
    auto({ merk: 'Toyota', model: 'Yaris', titel: 'Toyota Yaris 1.5 Hybrid', prijs: 9000 }),
    auto({ merk: 'Toyota', model: 'Yaris', titel: 'Toyota Yaris Cross Hybrid', prijs: 25000 }),
  ];
  const md = berekenMarktdata(rows, { modellen: [{ merk: 'Toyota', model: 'Yaris' }] }, { rootDir: ROOT });
  assert.equal(md.modellen[0].aantal, 1);
  assert.equal(md.modellen[0].prijs.mediaan, 9000);
  assert.deepEqual(md.modellen[0].uitgeslotenVarianten, { 'Yaris Cross': 1 });
});

const { signaleerVarianten } = require('../scripts/artikelen/marktdata');
const { prBody } = require('../scripts/artikelen/genereer-concept');

test('signaleerVarianten: vindt een afwijkend geprijsde groep, negeert carrosserie en ruis', () => {
  const items = [];
  for (let i = 0; i < 60; i++) items.push(auto({ merk: 'Toyota', model: 'Yaris', titel: 'Toyota Yaris 1.5 Hybrid Dynamic', prijs: 9000 + i * 10 }));
  for (let i = 0; i < 10; i++) items.push(auto({ merk: 'Toyota', model: 'Yaris', titel: 'Toyota Yaris Cross Hybrid 130', prijs: 27000 }));
  for (let i = 0; i < 10; i++) items.push(auto({ merk: 'Toyota', model: 'Yaris', titel: 'Toyota Yaris Touring 1.3', prijs: 3000 }));
  for (let i = 0; i < 10; i++) items.push(auto({ merk: 'Toyota', model: 'Yaris', titel: 'Toyota Yaris Yaris 1.0', prijs: 2000 }));
  const s = signaleerVarianten('Yaris', items);
  assert.deepEqual(s.map(x => x.titelwoord), ['cross']);
  assert.equal(s[0].aantal, 10);
  assert.ok(s[0].afwijkingProcent > 100);
  assert.deepEqual(signaleerVarianten('Yaris', items.slice(0, 10)), [], 'te weinig data: geen signaal');
});

test('prBody: toont de variantwaarschuwing alleen als er signalen zijn', () => {
  const art = { slug: 'x', titel: 'T', intro: 'I', categorie: 'Kopen', leestijdMinuten: 5 };
  const item = { hoofdzoekwoord: 'k', type: 'modelgids', invalshoek: 'i' };
  const check = { woorden: 1000, waarschuwingen: [] };
  const md = sig => ({ peildatum: '2026-11-18', filters: {}, totaalInSelectie: 1, modellen: [{
    merk: 'Toyota', model: 'Yaris', aantal: 80, prijs: { p25: 1, mediaan: 2, p75: 3 }, kilometerstand: { mediaan: 1000 }, mogelijkeVarianten: sig }] });
  const met = prBody(item, art, check, [], md([{ titelwoord: 'cross', aantal: 10, mediaanPrijs: 27000, afwijkingProcent: 140 }]));
  assert.match(met, /Mogelijk andere modellen onder één modelnaam/);
  assert.match(met, /Toyota Yaris "cross"\*\*: 10 advertenties, middelste prijs €27\.000 \(\+140%/);
  assert.doesNotMatch(prBody(item, art, check, [], md([])), /Mogelijk andere modellen/);
});
