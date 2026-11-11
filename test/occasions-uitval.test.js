// Regressietest: een merk/model-pagina die ooit bestond mag niet stilletjes
// een 404 worden zodra het aanbod onder MIN_MODEL_COUNT / buiten de top
// MAX_MODELS zakt (nov '26: /occasions/peugeot/e-5008/ en
// /occasions/ford/mondeo/ verdwenen, waarna artikellinks en de artikelen-test
// braken). Draait generate-occasions.js twee keer op een tijdelijke map
// (CARKIJKER_ROOT): eerst mét, dan zonder aanbod voor het model.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { occasionUrl } = require('../scripts/artikelen/marktdata');

const GENERATOR = path.join(__dirname, '..', 'generate-occasions.js');
const SITEMAP_LEEG = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';

function auto(merk, model, i, prijs) {
  return {
    merk: merk, model: model, titel: merk + ' ' + model + ' ' + i, prijs: prijs + i * 100,
    km: 50000 + i * 1000, jaar: 2019, bron: 'marktplaats', url: 'https://example.com/' + merk + '-' + model + '-' + i,
  };
}
function reeks(merk, model, n, prijs) {
  return Array.from({ length: n }, function (_, i) { return auto(merk, model, i, prijs); });
}

function draai(root, listings) {
  fs.writeFileSync(path.join(root, 'data', 'listings.json'), JSON.stringify({ listings: listings }));
  // Net als in de workflow herschrijft scrape.js de basis-sitemap vóór elke run.
  fs.writeFileSync(path.join(root, 'sitemap.xml'), SITEMAP_LEEG);
  execFileSync(process.execPath, [GENERATOR], { env: Object.assign({}, process.env, { CARKIJKER_ROOT: root }), stdio: 'pipe' });
}
const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf-8');
const bestaat = (root, rel) => fs.existsSync(path.join(root, rel));

function nieuweRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'carkijker-uitval-'));
  fs.mkdirSync(path.join(root, 'data'));
  return root;
}

test('model dat onder de drempel zakt blijft bereikbaar als noindex-pagina, buiten de sitemap', () => {
  const root = nieuweRoot();
  try {
    const basis = reeks('peugeot', 'rifter', 6, 15000).concat(reeks('peugeot', 'partner', 5, 24000), reeks('ford', 'focus', 5, 12000));
    draai(root, basis.concat(reeks('peugeot', 'e-5008', 3, 32000)));

    const pagina = 'occasions/peugeot/e-5008/index.html';
    assert.ok(bestaat(root, pagina), 'run 1: modelpagina gegenereerd');
    assert.doesNotMatch(lees(root, pagina), /noindex/);
    assert.match(lees(root, 'sitemap.xml'), /<loc>https:\/\/carkijker\.nl\/occasions\/peugeot\/e-5008\/<\/loc>/);
    const reg1 = JSON.parse(lees(root, 'data/model-paginas.json'));
    assert.strictEqual(reg1.merken.peugeot.modellen['e-5008'].laatsteAantal, 3);
    assert.ok(reg1.merken.peugeot.modellen['e-5008'].laatsteMediaanprijs > 0);

    // Run 2: geen e-5008 meer in het aanbod.
    draai(root, basis);
    assert.ok(bestaat(root, pagina), 'run 2: modelpagina bestaat nog (geen 404)');
    const html = lees(root, pagina);
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.doesNotMatch(html, /rel="canonical"/);
    assert.match(html, /data-aanbod-status="leeg"/);
    assert.match(html, /href="\/occasions\/peugeot\/"/, 'linkt naar de merkpagina');
    assert.match(html, /href="\/occasions\/peugeot\/rifter\/"/, 'linkt naar andere modellen van het merk');
    assert.match(html, /Laatst met een volledig overzicht op/, 'toont wanneer er voor het laatst aanbod was');

    const markt = 'marktanalyse/peugeot/e-5008/index.html';
    assert.ok(bestaat(root, markt), 'marktanalyse-pagina blijft ook bestaan');
    assert.match(lees(root, markt), /noindex/);

    const sitemap = lees(root, 'sitemap.xml');
    assert.doesNotMatch(sitemap, /e-5008/, 'noindex-pagina staat niet in de sitemap');
    assert.match(sitemap, /<loc>https:\/\/carkijker\.nl\/occasions\/peugeot\/rifter\/<\/loc>/);

    // Nieuwe artikelen linken dan naar de merkpagina, niet naar de lege pagina.
    assert.strictEqual(occasionUrl('Peugeot', 'e-5008', root), '/occasions/peugeot/');
    assert.strictEqual(occasionUrl('Peugeot', 'rifter', root), '/occasions/peugeot/rifter/');

    const reg2 = JSON.parse(lees(root, 'data/model-paginas.json'));
    assert.ok(reg2.merken.peugeot.modellen['e-5008'], 'register vergeet het model niet');
    assert.strictEqual(reg2.merken.peugeot.modellen['e-5008'].laatsteAantal, 3, 'laatst bekende stand blijft bewaard');

    // Run 3: aanbod terug -> weer een volwaardige, indexeerbare pagina.
    draai(root, basis.concat(reeks('peugeot', 'e-5008', 4, 32000)));
    assert.doesNotMatch(lees(root, pagina), /noindex/);
    assert.match(lees(root, 'sitemap.xml'), /occasions\/peugeot\/e-5008\//);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('model dat alleen uit de top-MAX_MODELS zakt houdt zijn volwaardige pagina', () => {
  const root = nieuweRoot();
  try {
    // 10 modellen met meer aanbod + 'klein' met 2: in run 1 is klein nog top-10.
    const groot = [];
    for (let i = 0; i < 9; i++) groot.push(...reeks('ford', 'model' + String.fromCharCode(97 + i), 5, 10000 + i * 1000));
    draai(root, groot.concat(reeks('ford', 'klein', 2, 9000)));
    assert.ok(bestaat(root, 'occasions/ford/klein/index.html'));

    draai(root, groot.concat(reeks('ford', 'extra', 5, 9500), reeks('ford', 'klein', 2, 9000)));
    const html = lees(root, 'occasions/ford/klein/index.html');
    assert.doesNotMatch(html, /noindex/, 'er is nog aanbod: gewone pagina');
    assert.match(lees(root, 'sitemap.xml'), /occasions\/ford\/klein\//);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('merk dat helemaal onder de drempel zakt: merk- en modelpagina blijven (noindex)', () => {
  const root = nieuweRoot();
  try {
    const basis = reeks('peugeot', 'rifter', 6, 15000);
    draai(root, basis.concat(reeks('ford', 'mondeo', 4, 11000)));
    assert.ok(bestaat(root, 'occasions/ford/mondeo/index.html'));

    draai(root, basis);
    assert.match(lees(root, 'occasions/ford/index.html'), /noindex/);
    const html = lees(root, 'occasions/ford/mondeo/index.html');
    assert.match(html, /noindex/);
    assert.match(html, /href="\/occasions\/"/, 'merk is weg: linkt naar /occasions/');
    assert.doesNotMatch(lees(root, 'sitemap.xml'), /occasions\/ford\//);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
