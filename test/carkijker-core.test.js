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
