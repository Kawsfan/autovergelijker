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
