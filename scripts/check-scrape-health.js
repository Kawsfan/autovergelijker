#!/usr/bin/env node
// Controleert of elke bekende bron nog actieve advertenties oplevert.
// Faalt (exit 1) de workflow-run zichtbaar als een bron plotseling wegvalt
// of fors inzakt t.o.v. de vorige run — zodat een kapotte scraper niet
// weken onopgemerkt blijft (zoals met AutoTrack/AutoTrader gebeurde).

const fs = require('fs');
const path = require('path');

const VERWACHTE_BRONNEN = ['Marktplaats', 'Gaspedaal', 'AutoScout24', 'ViaBovag', 'AutoTrack', 'AutoTrader'];
const DROP_DREMPEL = 0.5; // faal als een bron >50% inzakt t.o.v. de vorige run
const MIN_VOOR_DROPCHECK = 20; // onder deze grootte is een procentuele daling te ruizig om op te reageren

const shPath = path.join(process.cwd(), 'data', 'scrape-health.json');
let history = [];
try {
  history = JSON.parse(fs.readFileSync(shPath, 'utf8'));
} catch (e) {
  console.log('Geen data/scrape-health.json gevonden — sla check over.');
  process.exit(0);
}

if (history.length < 2) {
  console.log('Nog geen historische data om mee te vergelijken — sla check over.');
  process.exit(0);
}

const vandaag = history[history.length - 1].tellingen || {};
const gisteren = history[history.length - 2].tellingen || {};

let fout = false;
for (const bron of VERWACHTE_BRONNEN) {
  const nu = vandaag[bron] || 0;
  const was = gisteren[bron] || 0;
  if (nu === 0 && was > 0) {
    console.error(`✗ ${bron}: 0 actieve advertenties (was ${was}) — bron lijkt volledig gestopt.`);
    fout = true;
  } else if (was >= MIN_VOOR_DROPCHECK && nu < was * DROP_DREMPEL) {
    const pct = Math.round(100 * (1 - nu / was));
    console.error(`✗ ${bron}: gedaald van ${was} naar ${nu} (-${pct}%) — mogelijk kapot.`);
    fout = true;
  } else {
    console.log(`✓ ${bron}: ${nu} actief${was ? ` (was ${was})` : ''}`);
  }
}

if (fout) {
  console.error('\nScrape-health check gefaald — controleer de betreffende scraper(s) in scripts/scrape.js.');
  process.exit(1);
}
console.log('\nAlle bronnen gezond.');
