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
  assert.equal(s.aanbieder.particulier, 6);
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
