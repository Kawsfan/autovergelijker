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
  berekenPrijsHistogram,
  berekenJaarVerdeling,
  berekenTopDeals,
  berekenMerkenRanglijst,
  modelMarktStats,
  berekenAlleModelStats,
  vindVergelijkbareModellen,
  berekenRegionaleTop,
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

  await t.test('geeft ook groepMin/groepMax van de vergelijkbare advertenties, voor de visuele balk', () => {
    var lijst = maakAdvertenties();
    var r = schatInruilwaarde(lijst, 'Volkswagen', 'Golf', 80000, 2019);
    var prijzen = lijst.map(function (a) { return a.prijs; });
    assert.equal(r.groepMin, Math.min.apply(null, prijzen));
    assert.equal(r.groepMax, Math.max.apply(null, prijzen));
    assert.ok(r.groepMin <= r.groepMax);
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

test('berekenPrijsHistogram', async (t) => {
  await t.test('lege lijst geeft null, geen crash', () => {
    assert.equal(berekenPrijsHistogram([]), null);
  });

  await t.test('telt alle prijzen mee in de buckets als er geen uitschieters zijn', () => {
    var prijzen = [10000, 12000, 14000, 16000, 18000, 20000];
    var h = berekenPrijsHistogram(prijzen, 6);
    var totaal = h.counts.reduce(function (s, c) { return s + c; }, 0);
    assert.equal(totaal, prijzen.length);
    assert.equal(h.buitenBereik, 0);
  });

  await t.test('een extreme uitschieter valt buiten het IQR-bereik en telt als buitenBereik', () => {
    var prijzen = [9000, 9500, 10000, 10500, 11000, 10200, 9800, 400000];
    var h = berekenPrijsHistogram(prijzen);
    assert.ok(h.buitenBereik >= 1);
    assert.ok(h.histMax < 400000);
  });

  await t.test('mediaan klopt met een simpele oneven reeks', () => {
    var h = berekenPrijsHistogram([1000, 2000, 3000]);
    assert.equal(h.mediaan, 2000);
  });
});

test('berekenJaarVerdeling', async (t) => {
  await t.test('groepeert per bouwjaar binnen 2008-huidig, telt oudere jaren niet mee', () => {
    var lijst = [
      { jaar: 2020 }, { jaar: 2020 }, { jaar: 2021 }, { jaar: 2005 },
    ];
    var v = berekenJaarVerdeling(lijst);
    assert.deepEqual(v.jaren, [2020, 2021]);
    assert.deepEqual(v.counts, [2, 1]);
  });

  await t.test('lege lijst crasht niet', () => {
    var v = berekenJaarVerdeling([]);
    assert.deepEqual(v.jaren, []);
  });
});

test('berekenTopDeals', async (t) => {
  function maakData() {
    var lijst = [];
    for (var i = 0; i < 10; i++) {
      lijst.push({ prijs: 15000, jaar: 2018, km: 80000 });
    }
    // Een duidelijke uitschieter naar beneden qua prijs, verder vergelijkbaar.
    lijst.push({ prijs: 8000, jaar: 2018, km: 80000 });
    return lijst;
  }

  await t.test('zonder mediaan (0) geeft een lege lijst, geen crash', () => {
    assert.deepEqual(berekenTopDeals(maakData(), 0), []);
  });

  await t.test('de opvallend goedkope advertentie komt bovenaan', () => {
    var deals = berekenTopDeals(maakData(), 15000);
    assert.ok(deals.length >= 1);
    assert.equal(deals[0].advertentie.prijs, 8000);
    assert.ok(deals[0].pct < 0);
  });

  await t.test('respecteert de limit-parameter', () => {
    var lijst = [];
    for (var i = 0; i < 20; i++) lijst.push({ prijs: 5000 + i * 10, jaar: 2018, km: 80000 });
    var deals = berekenTopDeals(lijst, 15000, 3);
    assert.equal(deals.length, 3);
  });
});

test('berekenMerkenRanglijst', async (t) => {
  function maakData() {
    var lijst = [];
    for (var i = 0; i < 25; i++) lijst.push({ merk: 'Volkswagen', prijs: 15000 });
    for (var j = 0; j < 5; j++) lijst.push({ merk: 'Dacia', prijs: 8000 });
    lijst.push({ merk: 'overig', prijs: 5000 }); // moet genegeerd worden
    return lijst;
  }

  await t.test('topVolume sorteert op aantal advertenties', () => {
    var r = berekenMerkenRanglijst(maakData());
    assert.equal(r.topVolume[0].merk, 'Volkswagen');
    assert.equal(r.topVolume[0].n, 25);
  });

  await t.test('"overig" telt niet mee als merk', () => {
    var r = berekenMerkenRanglijst(maakData());
    assert.ok(!r.topVolume.some(function (m) { return m.merk === 'overig'; }));
  });

  await t.test('topGoedkoop vereist minimaal 20 advertenties, Dacia (n=5) valt dus af', () => {
    var r = berekenMerkenRanglijst(maakData());
    assert.ok(!r.topGoedkoop.some(function (m) { return m.merk === 'Dacia'; }));
    assert.ok(r.topGoedkoop.some(function (m) { return m.merk === 'Volkswagen'; }));
  });
});

test('modelMarktStats en vindVergelijkbareModellen', async (t) => {
  function maakData() {
    var lijst = [];
    for (var i = 0; i < 10; i++) lijst.push({ merk: 'Volkswagen', model: 'Golf', prijs: 15000, km: 80000 + i * 1000 });
    for (var j = 0; j < 8; j++) lijst.push({ merk: 'Volkswagen', model: 'Polo', prijs: 12000, km: 70000 + j * 1000 });
    for (var k = 0; k < 6; k++) lijst.push({ merk: 'Skoda', model: 'Octavia', prijs: 40000, km: 60000 + k * 1000 });
    return lijst;
  }

  await t.test('modelMarktStats geeft null bij te weinig advertenties', () => {
    assert.equal(modelMarktStats([{ merk: 'X', model: 'Y', prijs: 1000 }], 'X', 'Y'), null);
  });

  await t.test('modelMarktStats berekent een mediaan en n', () => {
    var s = modelMarktStats(maakData(), 'Volkswagen', 'Golf');
    assert.equal(s.mediaan, 15000);
    assert.equal(s.n, 10);
  });

  await t.test('berekenAlleModelStats levert voor elk segment met n>=5 exact hetzelfde als modelMarktStats', () => {
    var alle = berekenAlleModelStats(maakData());
    var golf = alle.find(function (s) { return s.merk === 'Volkswagen' && s.model === 'Golf'; });
    assert.deepEqual(golf, modelMarktStats(maakData(), 'Volkswagen', 'Golf'));
  });

  await t.test('vindVergelijkbareModellen kiest het model met de dichtstbijzijnde mediaanprijs, sluit zichzelf uit', () => {
    var alle = berekenAlleModelStats(maakData());
    var r = vindVergelijkbareModellen(alle, 'Volkswagen', 'Golf', 2);
    assert.ok(r.vergelijkbaar.length >= 1);
    assert.ok(!r.vergelijkbaar.some(function (s) { return s.merk === 'Volkswagen' && s.model === 'Golf'; }));
    // Polo (€12.000) ligt dichter bij Golf (€15.000) dan Octavia (€40.000).
    assert.equal(r.vergelijkbaar[0].model, 'Polo');
  });

  await t.test('geen basis-model geeft null', () => {
    var alle = berekenAlleModelStats(maakData());
    assert.equal(vindVergelijkbareModellen(alle, 'Onbekend', 'Merk', 2), null);
  });
});

test('berekenRegionaleTop', async (t) => {
  function maakData() {
    var lijst = [];
    for (var i = 0; i < 6; i++) lijst.push({ prijs: 15000, locatie: 'Utrecht' });
    for (var j = 0; j < 4; j++) lijst.push({ prijs: 20000, locatie: 'Amsterdam' });
    lijst.push({ prijs: 12000, locatie: 'Zwolle' }); // n=1, valt onder de drempel van 3
    return lijst;
  }

  await t.test('te weinig advertenties met locatie geeft null', () => {
    assert.equal(berekenRegionaleTop([{ prijs: 15000, locatie: 'Utrecht' }]), null);
  });

  await t.test('sorteert steden op advertentie-aantal, sluit steden onder de drempel uit', () => {
    var r = berekenRegionaleTop(maakData());
    assert.equal(r.steden[0].locatie, 'Utrecht');
    assert.equal(r.steden[0].n, 6);
    assert.ok(!r.steden.some(function (s) { return s.locatie === 'Zwolle'; }));
  });

  await t.test('landelijkMediaan wordt over de hele subset (met locatie) berekend', () => {
    var r = berekenRegionaleTop(maakData());
    assert.equal(r.landelijkN, 11);
  });
});
