// test/dealscore.test.js
// Draai met: node --test
// Dit was tot nu toe het meest risicovolle stukje logica in de codebase
// zonder ENKELE test: de regressiewiskunde die elke dealscore op de site
// bepaalt. Zie lib/dealscore.js.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  groepKey,
  solveLinear3,
  scoreVanZ,
  berekenGroepStatistieken,
  berekenRegressieCoef,
  berekenDealScores,
} = require('../lib/dealscore');

test('groepKey', async (t) => {
  await t.test('gebruikt de schone merk/model-velden als die er zijn', () => {
    assert.equal(groepKey({ merk: 'Volkswagen', model: 'Golf' }), 'volkswagen|golf');
  });

  await t.test('valt terug op titel-extractie zonder model-veld', () => {
    assert.equal(groepKey({ merk: 'Volkswagen', titel: 'Volkswagen Golf 1.6 TDI' }), 'volkswagen|golf 1.6');
  });

  await t.test('twee schrijfwijzes van dezelfde auto belanden in dezelfde groep', () => {
    const a = groepKey({ merk: 'BMW', model: '3-serie' });
    const b = groepKey({ merk: 'bmw', model: '3-SERIE' });
    assert.equal(a, b);
  });
});

test('solveLinear3', async (t) => {
  await t.test('lost een simpel, exact oplosbaar stelsel op', () => {
    // x=1, y=2, z=3 als oplossing van de identiteitsmatrix
    const oplossing = solveLinear3(
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      [1, 2, 3]
    );
    assert.deepEqual(oplossing, [1, 2, 3]);
  });

  await t.test('retourneert null bij een singuliere matrix', () => {
    // alle rijen identiek -- geen unieke oplossing
    const oplossing = solveLinear3(
      [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
      [3, 3, 3]
    );
    assert.equal(oplossing, null);
  });
});

test('scoreVanZ', async (t) => {
  await t.test('z=0 (precies de verwachte prijs) geeft score 50', () => {
    assert.equal(scoreVanZ(0), 50);
  });

  await t.test('negatieve z (goedkoper dan verwacht) geeft een hogere score', () => {
    assert.equal(scoreVanZ(-1), 67); // ((1+3)/6)*100 = 66.67 -> 67
    assert.equal(scoreVanZ(-3), 100);
  });

  await t.test('positieve z (duurder dan verwacht) geeft een lagere score', () => {
    assert.equal(scoreVanZ(1), 33); // ((-1+3)/6)*100 = 33.33 -> 33
    assert.equal(scoreVanZ(3), 0);
  });

  await t.test('extreme uitschieters worden geclipt aan 0/100, niet daarbuiten', () => {
    assert.equal(scoreVanZ(-100), 100);
    assert.equal(scoreVanZ(100), 0);
  });
});

test('berekenGroepStatistieken', async (t) => {
  await t.test('gemiddelde en standaarddeviatie van een bekende reeks', () => {
    const { gem, std } = berekenGroepStatistieken([10000, 20000, 30000]);
    assert.equal(gem, 20000);
    assert.ok(Math.abs(std - 8164.97) < 1);
  });
});

test('berekenRegressieCoef', async (t) => {
  await t.test('herkent een perfect lineair prijsverband (jonger = duurder)', () => {
    // Synthetische, ruisvrije dataset: prijs daalt exact €1000 per jaar ouder.
    // km varieert bewust NIET 1-op-1 met het bouwjaar (i%3 i.p.v. een vaste
    // toename), anders valt de log(km)-kolom samen met de bouwjaar-kolom en
    // is de matrix (bijna) singulier -- zie solveLinear3.
    const items = [];
    for (let i = 0; i < 10; i++) {
      const jaar = 2015 + i;
      const km = 50000 + (i % 3) * 7000;
      items.push({ jaar, km, prijs: 30000 - (2025 - jaar) * 1000 });
    }
    const coef = berekenRegressieCoef(items);
    assert.ok(coef, 'had een regressiemodel moeten vinden');
    assert.ok(Math.abs(coef.b1 - 1000) < 5, 'b1 (prijs per bouwjaar) moet rond de 1000 liggen, kreeg ' + coef.b1);
  });

  await t.test('retourneert null bij een singuliere invoer (bv. iedereen exact hetzelfde bouwjaar én km)', () => {
    const items = Array.from({ length: 10 }, () => ({ jaar: 2020, km: 50000, prijs: 20000 }));
    assert.equal(berekenRegressieCoef(items), null);
  });
});

test('berekenDealScores -- regressiepad (>=8 complete datapunten in de groep)', async (t) => {
  // 10 exemplaren van hetzelfde merk/model, prijs daalt lineair met leeftijd.
  // Twee uitschieters: één duidelijk te goedkoop (hoge score), één duidelijk
  // te duur (lage score) voor zijn bouwjaar/km-stand.
  function maakGroep() {
    // km bewust NIET constant (dat maakt de regressiematrix singulier -- de
    // log(km)-kolom valt dan samen met de constante/intercept-kolom, zie
    // solveLinear3) maar ook niet 1-op-1 gekoppeld aan het bouwjaar (i%3 i.p.v.
    // een vaste toename), zodat b1 (bouwjaar-effect) schoon te toetsen blijft.
    const items = [];
    for (let i = 0; i < 10; i++) {
      const jaar = 2015 + i;
      const km = 50000 + (i % 3) * 7000;
      items.push({ id: 'norm-' + i, merk: 'Volkswagen', model: 'Golf', jaar, km, prijs: 30000 - (2025 - jaar) * 1000 });
    }
    items.push({ id: 'koopje', merk: 'Volkswagen', model: 'Golf', jaar: 2020, km: 57000, prijs: 15000 }); // veel goedkoper dan verwacht (~€25.000)
    items.push({ id: 'duur', merk: 'Volkswagen', model: 'Golf', jaar: 2020, km: 57000, prijs: 40000 }); // veel duurder dan verwacht
    return items;
  }

  await t.test('een advertentie die veel goedkoper is dan verwacht krijgt een hoge dealscore', () => {
    const items = maakGroep();
    berekenDealScores(items);
    const koopje = items.find(l => l.id === 'koopje');
    assert.equal(koopje.dealBasis, 'regressie');
    assert.ok(koopje.dealScore > 80, 'verwachtte score > 80, kreeg ' + koopje.dealScore);
  });

  await t.test('een advertentie die veel duurder is dan verwacht krijgt een lage dealscore', () => {
    const items = maakGroep();
    berekenDealScores(items);
    const duur = items.find(l => l.id === 'duur');
    assert.equal(duur.dealBasis, 'regressie');
    assert.ok(duur.dealScore < 20, 'verwachtte score < 20, kreeg ' + duur.dealScore);
  });

  await t.test('afschrijvingJaar wordt gezet en heeft het juiste teken (jonger = duurder in deze dataset)', () => {
    const items = maakGroep();
    berekenDealScores(items);
    const norm = items.find(l => l.id === 'norm-5');
    assert.ok(norm.afschrijvingJaar > 0, 'afschrijvingJaar moet positief zijn');
    assert.ok(Math.abs(norm.afschrijvingJaar - 1000) < 50, 'verwachtte ~1000, kreeg ' + norm.afschrijvingJaar);
  });
});

test('berekenDealScores -- randgevallen', async (t) => {
  await t.test('listings zonder prijs krijgen score 50 en dealBasis "onbekend", geen crash', () => {
    const items = [{ id: 'x', merk: 'Skoda', model: 'Octavia', jaar: 2020, km: 50000, prijs: null }];
    berekenDealScores(items);
    assert.equal(items[0].dealScore, 50);
    assert.equal(items[0].dealBasis, 'onbekend');
  });

  await t.test('een te kleine groep (<8 complete datapunten) valt terug op het platte groepsgemiddelde, niet regressie', () => {
    const items = [
      { id: 'a', merk: 'Lada', model: 'Niva', jaar: 2018, km: 80000, prijs: 8000 },
      { id: 'b', merk: 'Lada', model: 'Niva', jaar: 2019, km: 70000, prijs: 9000 },
      { id: 'c', merk: 'Lada', model: 'Niva', jaar: 2020, km: 60000, prijs: 20000 }, // duidelijke uitschieter
    ];
    berekenDealScores(items);
    for (const l of items) assert.equal(l.dealBasis, 'groep', l.id + ' had dealBasis=' + l.dealBasis + ' i.p.v. "groep"');
    // de uitschieter (veel duurder dan de andere twee) moet een lage score krijgen
    assert.ok(items[2].dealScore < items[0].dealScore);
  });

  await t.test('een groep van precies 1 advertentie krijgt "onbekend" (geen std te berekenen)', () => {
    const items = [{ id: 'solo', merk: 'Bugatti', model: 'Veyron', jaar: 2015, km: 5000, prijs: 900000 }];
    berekenDealScores(items);
    assert.equal(items[0].dealBasis, 'onbekend');
    assert.equal(items[0].dealScore, 50);
  });

  await t.test('lege lijst crasht niet', () => {
    assert.deepEqual(berekenDealScores([]), { regressie: 0, groepScore: 0, onbekend: 0 });
  });
});
