// test/carkijker-core.test.js
// Draai met: node --test
// Gebruikt Node's ingebouwde testrunner (node:test) -- geen nieuwe
// dependency, in lijn met de rest van dit project (0 runtime-dependencies).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isDealer,
  slugifyMerk,
  dealScoreKleur,
  resolveUrlParamNaam,
  URL_PARAM_NAAM,
  schatInruilwaarde,
} = require('../lib/carkijker-core');

test('isDealer', async (t) => {
  await t.test('zonder advertentie geeft null', () => {
    assert.equal(isDealer(null), null);
    assert.equal(isDealer(undefined), null);
  });

  await t.test('Gaspedaal, ViaBovag en AutoScout24 zijn altijd dealer', () => {
    assert.equal(isDealer({ bron: 'Gaspedaal' }), true);
    assert.equal(isDealer({ bron: 'ViaBovag' }), true);
    assert.equal(isDealer({ bron: 'AutoScout24' }), true);
    // hoofdlettergevoeligheid mag niet uitmaken
    assert.equal(isDealer({ bron: 'gaspedaal' }), true);
  });

  await t.test('Marktplaats zonder dealer-signaalwoorden is particulier', () => {
    assert.equal(isDealer({ bron: 'Marktplaats', titel: 'Volkswagen Golf 1.6 TDI' }), false);
  });

  await t.test('Marktplaats met dealer-signaalwoord in titel is toch dealer', () => {
    assert.equal(isDealer({ bron: 'Marktplaats', titel: 'Autobedrijf Jansen - Golf' }), true);
    assert.equal(isDealer({ bron: 'Marktplaats', titel: 'Garage de Vries occasion' }), true);
  });

  await t.test('een dealer-signaalwoord in de titel telt bij elke bron, niet alleen Marktplaats', () => {
    assert.equal(isDealer({ bron: 'AutoTrack', titel: 'Garage Peters - Polo' }), true);
  });

  await t.test('onbekende/overige bron zonder signaalwoord blijft onbekend (null), geen gok', () => {
    assert.equal(isDealer({ bron: 'AutoTrack', titel: 'Volkswagen Polo 1.0' }), null);
    assert.equal(isDealer({ bron: '', titel: 'Volkswagen Polo 1.0' }), null);
  });
});

test('slugifyMerk', async (t) => {
  await t.test('kleine letters en spaties naar streepjes', () => {
    assert.equal(slugifyMerk('Alfa Romeo'), 'alfa-romeo');
  });

  await t.test('bestaande streepjes blijven staan', () => {
    assert.equal(slugifyMerk('Mercedes-Benz'), 'mercedes-benz');
  });

  await t.test('diakrieten worden gestript (e.g. ë -> e)', () => {
    assert.equal(slugifyMerk('Citroën'), 'citroen');
  });

  await t.test('leidende/volgende streepjes worden getrimd', () => {
    assert.equal(slugifyMerk('  Tesla  '), 'tesla');
  });

  await t.test('lege/ontbrekende naam geeft lege string, geen crash', () => {
    assert.equal(slugifyMerk(''), '');
    assert.equal(slugifyMerk(null), '');
    assert.equal(slugifyMerk(undefined), '');
  });
});

test('dealScoreKleur', async (t) => {
  await t.test('boven de 60 is groen', () => {
    assert.deepEqual(dealScoreKleur(100), { bg: '#dcfce7', fg: '#15803d' });
    assert.deepEqual(dealScoreKleur(61), { bg: '#dcfce7', fg: '#15803d' });
  });

  await t.test('60 zelf is nog geen groen (grens is exclusief)', () => {
    assert.deepEqual(dealScoreKleur(60), { bg: '#fef9c3', fg: '#854d0e' });
  });

  await t.test('onder de 35 is rood', () => {
    assert.deepEqual(dealScoreKleur(0), { bg: '#fee2e2', fg: '#b91c1c' });
    assert.deepEqual(dealScoreKleur(34), { bg: '#fee2e2', fg: '#b91c1c' });
  });

  await t.test('35 zelf is nog geen rood (grens is exclusief)', () => {
    assert.deepEqual(dealScoreKleur(35), { bg: '#fef9c3', fg: '#854d0e' });
  });

  await t.test('ertussenin is geel', () => {
    assert.deepEqual(dealScoreKleur(50), { bg: '#fef9c3', fg: '#854d0e' });
  });
});

test('resolveUrlParamNaam -- regressietest voor de GSC "Page with redirect"-bug (#131)', async (t) => {
  await t.test('de 4 DOM-id\'s die afwijken van hun canonieke URL-parameternaam', () => {
    assert.equal(resolveUrlParamNaam('merkFilter'), 'merk');
    assert.equal(resolveUrlParamNaam('modelInput'), 'model');
    assert.equal(resolveUrlParamNaam('brandstofFilter'), 'brandstof');
    assert.equal(resolveUrlParamNaam('carrosserieFilter'), 'carrosserie');
  });

  await t.test('een id die al gelijk is aan zijn parameternaam blijft ongewijzigd', () => {
    assert.equal(resolveUrlParamNaam('jaarMin'), 'jaarMin');
    assert.equal(resolveUrlParamNaam('prijsMax'), 'prijsMax');
  });

  await t.test('URL_PARAM_NAAM bevat precies deze 4 mappings, niet meer en niet minder', () => {
    assert.deepEqual(Object.keys(URL_PARAM_NAAM).sort(), [
      'brandstofFilter',
      'carrosserieFilter',
      'merkFilter',
      'modelInput',
    ]);
  });
});

test('schatInruilwaarde', async (t) => {
  // 10 advertenties Volkswagen Golf, prijs daalt lineair met leeftijd, km
  // bewust NIET 1-op-1 gekoppeld aan bouwjaar (i%3 i.p.v. een vaste
  // toename) -- zelfde reden als in test/dealscore.test.js: anders valt de
  // km-kolom samen met de jaar-kolom en is de regressiematrix singulier.
  function maakAdvertenties() {
    var lijst = [];
    for (var i = 0; i < 10; i++) {
      var jaar = 2015 + i;
      var km = 50000 + (i % 3) * 7000;
      lijst.push({ merk: 'Volkswagen', model: 'Golf', jaar: jaar, km: km, prijs: 30000 - (2025 - jaar) * 1000 });
    }
    return lijst;
  }

  await t.test('geen merk/model geeft een foutmelding, geen crash', () => {
    assert.ok(schatInruilwaarde(maakAdvertenties(), '', '', 80000, 2019).fout);
    assert.ok(schatInruilwaarde(maakAdvertenties(), 'Volkswagen', '', 80000, 2019).fout);
  });

  await t.test('geen/ongeldige km geeft een foutmelding', () => {
    assert.ok(schatInruilwaarde(maakAdvertenties(), 'Volkswagen', 'Golf', 0, 2019).fout);
    assert.ok(schatInruilwaarde(maakAdvertenties(), 'Volkswagen', 'Golf', null, 2019).fout);
  });

  await t.test('geen/ongeldig bouwjaar geeft een foutmelding', () => {
    assert.ok(schatInruilwaarde(maakAdvertenties(), 'Volkswagen', 'Golf', 80000, 0).fout);
    assert.ok(schatInruilwaarde(maakAdvertenties(), 'Volkswagen', 'Golf', 80000, 1900).fout);
    assert.ok(schatInruilwaarde(maakAdvertenties(), 'Volkswagen', 'Golf', 80000, 2099).fout);
  });

  await t.test('te weinig advertenties van dit merk+model geeft een foutmelding', () => {
    var lijst = maakAdvertenties().slice(0, 3);
    assert.ok(schatInruilwaarde(lijst, 'Volkswagen', 'Golf', 80000, 2019).fout);
  });

  await t.test('advertenties van een ander merk/model tellen niet mee voor de drempel', () => {
    var lijst = maakAdvertenties().slice(0, 3).concat([
      { merk: 'Toyota', model: 'Yaris', jaar: 2020, km: 40000, prijs: 15000 },
      { merk: 'Toyota', model: 'Yaris', jaar: 2021, km: 30000, prijs: 16000 },
    ]);
    assert.ok(schatInruilwaarde(lijst, 'Volkswagen', 'Golf', 80000, 2019).fout);
  });

  await t.test('happy path: geeft marktwaarde en een inruilbereik van 70-85% daarvan', () => {
    var r = schatInruilwaarde(maakAdvertenties(), 'Volkswagen', 'Golf', 80000, 2019);
    assert.ok(!r.fout, 'verwachtte geen foutmelding, kreeg: ' + r.fout);
    assert.ok(r.marktwaarde > 0);
    assert.equal(r.inruilMin, Math.round(r.marktwaarde * 0.70 / 50) * 50);
    assert.equal(r.inruilMax, Math.round(r.marktwaarde * 0.85 / 50) * 50);
    assert.ok(r.inruilMin < r.inruilMax);
    assert.equal(r.n, 10);
  });

  await t.test('een jongere auto met minder km krijgt een hogere schatting dan een oudere met meer km', () => {
    var lijst = maakAdvertenties();
    var jong = schatInruilwaarde(lijst, 'Volkswagen', 'Golf', 40000, 2023);
    var oud = schatInruilwaarde(lijst, 'Volkswagen', 'Golf', 120000, 2016);
    assert.ok(jong.marktwaarde > oud.marktwaarde, 'jong=' + jong.marktwaarde + ' oud=' + oud.marktwaarde);
  });

  await t.test('fallback (5-7 complete datapunten, geen multiple regressie) crasht niet en geeft toch een schatting', () => {
    var lijst = maakAdvertenties().slice(0, 6);
    var r = schatInruilwaarde(lijst, 'Volkswagen', 'Golf', 80000, 2019);
    assert.ok(!r.fout, 'verwachtte geen foutmelding, kreeg: ' + r.fout);
    assert.ok(r.marktwaarde > 0);
    assert.equal(r.n, 6);
  });

  await t.test('lege lijst crasht niet', () => {
    assert.ok(schatInruilwaarde([], 'Volkswagen', 'Golf', 80000, 2019).fout);
  });
});
