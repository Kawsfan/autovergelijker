// mcp-server/test/tools.test.js
// Draai met: node --test (vanuit de repo-root, zelfde als de rest van de
// tests -- Node's default **/*.test.js discovery pikt dit bestand vanzelf
// op, zie de "Unit-tests (lib/)"-stap in .github/workflows/validate.yml).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  slugifyMerk,
  filterListings,
  sorteerOpDealscore,
  zoekListings,
  marktStatsVoorMerk,
  DEALSCORE_UITLEG,
  MAX_LIMIET,
  DEFAULT_LIMIET,
} = require('../src/tools.js');

test('slugifyMerk', async (t) => {
  await t.test('normaliseert accenten en spaties', () => {
    assert.equal(slugifyMerk('Citroën'), 'citro-n');
    assert.equal(slugifyMerk('Land Rover'), 'land-rover');
    assert.equal(slugifyMerk('Mercedes-Benz'), 'mercedes-benz');
  });

  await t.test('leeg/ontbrekend valt terug op "overig" (zelfde als scrape.js)', () => {
    assert.equal(slugifyMerk(''), 'overig');
    assert.equal(slugifyMerk(null), 'overig');
    assert.equal(slugifyMerk(undefined), 'overig');
  });
});

function fixtureListings() {
  return [
    { merk: 'Audi', model: 'A3', titel: 'Audi A3 Sportback', prijs: 18000, jaar: 2019, km: 60000, brandstof: 'Benzine', carrosserie: 'Hatchback', transmissie: 'Handgeschakeld', dealScore: 70 },
    { merk: 'Audi', model: 'Q3', titel: 'Audi Q3 S-Line', prijs: 32000, jaar: 2021, km: 40000, brandstof: 'Hybride Elektrisch/Benzine', carrosserie: 'SUV', transmissie: 'Automaat', dealScore: 45 },
    { merk: 'Volkswagen', model: 'Golf', titel: 'VW Golf 8', prijs: 21000, jaar: 2020, km: 55000, brandstof: 'Diesel', carrosserie: 'Hatchback', transmissie: 'Handgeschakeld', dealScore: 85 },
    { merk: 'Volkswagen', model: 'Golf', titel: 'VW Golf oud + geen dealScore', prijs: 5000, jaar: 2005, km: 220000, brandstof: 'Benzine', carrosserie: 'Hatchback', transmissie: 'Handgeschakeld' },
  ];
}

test('filterListings', async (t) => {
  await t.test('zonder filters geeft alles terug', () => {
    assert.equal(filterListings(fixtureListings(), {}).length, 4);
  });

  await t.test('merk-filter is deelstring, hoofdletterongevoelig', () => {
    const r = filterListings(fixtureListings(), { merk: 'audi' });
    assert.equal(r.length, 2);
    assert.ok(r.every((a) => a.merk === 'Audi'));
  });

  await t.test('model matcht op titel als model-veld ontbreekt', () => {
    const r = filterListings([{ titel: 'Speciale Editie Polo GTI' }], { model: 'polo' });
    assert.equal(r.length, 1);
  });

  await t.test('prijs- en jaar-ranges', () => {
    const r = filterListings(fixtureListings(), { prijsMin: 15000, prijsMax: 25000, jaarMin: 2018 });
    assert.deepEqual(r.map((a) => a.titel), ['Audi A3 Sportback', 'VW Golf 8']);
  });

  await t.test('kmMax sluit hogere km-standen uit', () => {
    const r = filterListings(fixtureListings(), { kmMax: 50000 });
    assert.deepEqual(r.map((a) => a.titel), ['Audi Q3 S-Line']);
  });

  await t.test('brandstof-filter matcht op deelstring (hybride blijft vindbaar via "elektrisch")', () => {
    const r = filterListings(fixtureListings(), { brandstof: 'elektrisch' });
    assert.equal(r.length, 1);
    assert.equal(r[0].merk, 'Audi');
    assert.equal(r[0].model, 'Q3');
  });

  await t.test('transmissie-filter', () => {
    const r = filterListings(fixtureListings(), { transmissie: 'Automaat' });
    assert.equal(r.length, 1);
  });
});

test('sorteerOpDealscore', async (t) => {
  await t.test('hoogste dealScore eerst, ontbrekende score laatst', () => {
    const r = sorteerOpDealscore(fixtureListings());
    assert.deepEqual(r.map((a) => a.dealScore), [85, 70, 45, undefined]);
  });

  await t.test('muteert de invoer-array niet', () => {
    const input = fixtureListings();
    const kopie = JSON.stringify(input);
    sorteerOpDealscore(input);
    assert.equal(JSON.stringify(input), kopie);
  });
});

test('zoekListings', async (t) => {
  await t.test('combineert filteren, sorteren en limiteren', () => {
    const r = zoekListings(fixtureListings(), { merk: 'Volkswagen', limiet: 1 });
    assert.equal(r.totaalGevonden, 2);
    assert.equal(r.resultaten.length, 1);
    assert.equal(r.resultaten[0].titel, 'VW Golf 8');
  });

  await t.test('limiet wordt geclampt tussen 1 en MAX_LIMIET', () => {
    const teVeel = zoekListings(fixtureListings(), { limiet: 9999 });
    assert.ok(teVeel.resultaten.length <= MAX_LIMIET);
    const negatief = zoekListings(fixtureListings(), { limiet: -5 });
    assert.equal(negatief.resultaten.length, 1);
  });

  await t.test('geen limiet-opgave gebruikt DEFAULT_LIMIET', () => {
    const r = zoekListings(fixtureListings(), {});
    assert.equal(r.resultaten.length, Math.min(4, DEFAULT_LIMIET));
  });

  await t.test('compacte resultaten bevatten geen imgs/imgSrc-ruis', () => {
    const r = zoekListings([{ ...fixtureListings()[0], imgs: ['a', 'b'], imgSrc: 'x' }], {});
    assert.equal('imgs' in r.resultaten[0], false);
    assert.equal('imgSrc' in r.resultaten[0], false);
    assert.ok('url' in r.resultaten[0]);
  });
});

test('DEALSCORE_UITLEG', async (t) => {
  await t.test('is een niet-lege string met de kernpunten', () => {
    assert.equal(typeof DEALSCORE_UITLEG, 'string');
    assert.ok(DEALSCORE_UITLEG.includes('0'));
    assert.ok(DEALSCORE_UITLEG.toLowerCase().includes('geen') && DEALSCORE_UITLEG.toLowerCase().includes('kwaliteitsoordeel'));
  });
});

test('marktStatsVoorMerk', async (t) => {
  const historie = [
    { datum: '2026-08-01', segmenten: { audi: { n: 500, avg: 20000, med: 18000, min: 5000, max: 60000, p25: 12000, p75: 26000 } } },
    { datum: '2026-08-31', segmenten: { audi: { n: 520, avg: 21500, med: 19000, min: 5000, max: 62000, p25: 12500, p75: 27000 } } },
  ];

  await t.test('geeft de laatste entry + trend t.o.v. ~30 dagen terug', () => {
    const r = marktStatsVoorMerk(historie, 'Audi');
    assert.equal(r.datum, '2026-08-31');
    assert.equal(r.gemiddeldePrijs, 21500);
    assert.equal(r.aantalAdvertenties, 520);
    assert.equal(r.trend30Dagen.percentage, 7.5);
    assert.equal(r.trend30Dagen.referentieDatum, '2026-08-01');
  });

  await t.test('hoofdletterongevoelig op merknaam', () => {
    const r = marktStatsVoorMerk(historie, 'AUDI');
    assert.ok(r);
    assert.equal(r.merk, 'AUDI');
  });

  await t.test('onbekend merk geeft null', () => {
    assert.equal(marktStatsVoorMerk(historie, 'Onbekendmerk'), null);
  });

  await t.test('lege/ontbrekende historie geeft null', () => {
    assert.equal(marktStatsVoorMerk([], 'Audi'), null);
    assert.equal(marktStatsVoorMerk(null, 'Audi'), null);
  });

  await t.test('geen referentiepunt ver genoeg terug: trend30Dagen is null', () => {
    const kort = [{ datum: '2026-08-30', segmenten: { audi: { n: 1, avg: 100 } } }, { datum: '2026-08-31', segmenten: { audi: { n: 1, avg: 110 } } }];
    const r = marktStatsVoorMerk(kort, 'Audi');
    assert.equal(r.trend30Dagen, null);
  });
});
