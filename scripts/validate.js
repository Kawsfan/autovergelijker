#!/usr/bin/env node
// Lichte PR-validatie: vangt syntaxfouten in gewijzigde .js/.json/index.html-bestanden
// af vóórdat ze naar main gaan. De Netlify/Cloudflare-previews controleren alleen of de
// build lukt, niet of de JavaScript daadwerkelijk parsed -- dit vult dat gat.

const { execSync } = require('child_process');
const fs = require('fs');

function gewijzigdeBestanden() {
  const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';
  try {
    execSync(`git fetch origin ${process.env.GITHUB_BASE_REF || 'main'} --depth=50`, { stdio: 'ignore' });
    const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch (e) {
    console.log('Kon gewijzigde bestanden niet bepalen, val terug op volledige scan.');
    return null;
  }
}

let fout = false;
const bestanden = gewijzigdeBestanden();
const check = (f) => bestanden === null || bestanden.includes(f);

// .js-bestanden syntax-checken
const jsBestanden = (bestanden || execSync("git ls-files '*.js'", { encoding: 'utf8' }).split('\n').filter(Boolean))
  .filter(f => f.endsWith('.js') && fs.existsSync(f) && !f.startsWith('node_modules/'));
for (const f of jsBestanden) {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
    console.log(`OK  ${f}`);
  } catch (e) {
    fout = true;
    console.error(`FOUT ${f}:\n${e.stderr}`);
  }
}

// .json-bestanden valideren
const jsonBestanden = (bestanden || execSync("git ls-files '*.json'", { encoding: 'utf8' }).split('\n').filter(Boolean))
  .filter(f => f.endsWith('.json') && fs.existsSync(f));
for (const f of jsonBestanden) {
  try {
    JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log(`OK  ${f}`);
  } catch (e) {
    fout = true;
    console.error(`FOUT ${f}: ${e.message}`);
  }
}

// Artikelen: SEO/GEO-template + huisstijl (scripts/artikelen/check-artikel.js).
// Alleen gewijzigde artikelen, zodat oudere artikelen die nog niet aan elke
// regel voldoen een PR niet blokkeren; waarschuwingen blokkeren nooit.
const { checkArtikel } = require('./artikelen/check-artikel');
for (const f of jsonBestanden.filter(f => /^data\/artikelen\/[^/]+\.json$/.test(f))) {
  let r;
  try { r = checkArtikel(JSON.parse(fs.readFileSync(f, 'utf8')), { bestandsnaam: f }); } catch (e) { continue; }
  r.waarschuwingen.forEach(w => console.log(`  ! ${f}: ${w}`));
  if (r.fouten.length) {
    fout = true;
    console.error(`FOUT ${f} (artikel-template):\n` + r.fouten.map(x => '  ✗ ' + x).join('\n'));
  } else {
    console.log(`OK  ${f} (artikel-template)`);
  }
}

// Inline <script>-blokken in index.html
if (check('index.html') && fs.existsSync('index.html')) {
  const html = fs.readFileSync('index.html', 'utf8');
  const blokken = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  blokken.forEach((s, i) => {
    try {
      new Function(s);
    } catch (e) {
      fout = true;
      console.error(`FOUT index.html inline <script> blok ${i}: ${e.message}`);
    }
  });
  console.log(`OK  index.html (${blokken.length} inline script-blokken geparsed)`);
}

if (fout) {
  console.error('\nValidatie gefaald.');
  process.exit(1);
}
console.log('\nAlle gecontroleerde bestanden zijn geldig.');
