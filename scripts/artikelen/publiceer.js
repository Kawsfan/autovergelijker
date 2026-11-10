#!/usr/bin/env node
// scripts/artikelen/publiceer.js
// Draait in artikel-publiceren.yml direct na het mergen van een artikelconcept.
// Een concept kan dagen in review staan; de datum die de generator invulde is
// dan de concept-datum, niet de publicatiedatum. Voor Article-schema
// (datePublished) en de byline moet dat de echte live-datum zijn, dus zetten we
// gepubliceerd/bijgewerkt hier op vandaag voor NIEUW toegevoegde artikelen.
//
// Gebruik: node scripts/artikelen/publiceer.js data/artikelen/a.json [...]
'use strict';

const fs = require('fs');

function stempel(art, vandaag) {
  return Object.assign({}, art, { gepubliceerd: vandaag, bijgewerkt: vandaag });
}

module.exports = { stempel };

if (require.main === module) {
  const vandaag = process.env.PUBLICATIEDATUM || new Date().toISOString().slice(0, 10);
  for (const f of process.argv.slice(2)) {
    if (!fs.existsSync(f)) continue;
    const art = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (art.gepubliceerd === vandaag && art.bijgewerkt === vandaag) continue;
    fs.writeFileSync(f, JSON.stringify(stempel(art, vandaag), null, 2) + '\n', 'utf-8');
    console.log('Publicatiedatum gezet op ' + vandaag + ': ' + f);
  }
}
