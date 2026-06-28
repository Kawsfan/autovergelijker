// scripts/scrape.js
// Standalone scraper voor GitHub Actions
// Schrijft resultaten naar data/listings.json

const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function vertaalBrandstof(id) {
  const map = { E: 'Elektrisch', H: 'Hybride', D: 'Diesel', B: 'Benzine', LPG: 'LPG' };
  return map[id] || '';
}

// ── MARKTPLAATS ──────────────────────────────────────────────────────────────
async function scrapeMarktplaats() {
  const listings = [];
  const searches = [
    'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/toyota/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/volkswagen/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/ford/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/opel/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/renault/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/peugeot/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/honda/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/mercedes-benz/?numberOfResultsPerPage=100',
  ];
  for (const url of searches) {
    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerMarktplaats(html, listings.length));
    } catch (e) { console.error('MP error:', url, e.message); }
    await sleep(1500);
  }
  return listings;
}

function parseerMarktplaats(html, offset = 0) {
  const results = [], gezien = new Set();
  const re = /href="(\/(v|m)\/auto-s\/[^/]+\/[am]\d+[^"]*?)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 100) {
    const href = m[1], fullUrl = 'https://www.marktplaats.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 200), m.index + 2000);
    const pm = ctx.match(/€\s*([\d.]+)(?:,-|\s)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/\./g, ''));
    if (!prijs || prijs < 500 || prijs > 200000) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]{1,9})\s*km/i);
    let bf = '';
    if (/[Ee]lektrisch/.test(ctx)) bf = 'Elektrisch';
    else if (/[Hh]ybride/.test(ctx)) bf = 'Hybride';
    else if (/[Dd]iesel/.test(ctx)) bf = 'Diesel';
    else if (/[Bb]enzine/.test(ctx)) bf = 'Benzine';
    let cr = '';
    for (const [z, l] of [['Stationwagon','Stationwagon'],['Hatchback','Hatchback'],['SUV of Terreinwagen','SUV'],['Sedan','Sedan'],['Cabriolet','Cabrio'],['Coupe','Coupe'],['MPV','MPV']]) {
      if (ctx.includes(z)) { cr = l; break; }
    }
    let tr = '';
    if (/[Aa]utomaat/.test(ctx)) tr = 'Automaat';
    else if (/[Hh]andgeschakeld/.test(ctx)) tr = 'Handgeschakeld';
    const sl = href.match(/\/[am]\d+-(.+)$/);
    let titel = sl ? decodeURIComponent(sl[1]).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim().substring(0, 70) : '';
    if (!titel || titel.length < 4) continue;
    const img = ctx.match(/src="(https:\/\/images\.marktplaats\.com[^"]+)"/);
    let locatie = 'Nederland';
    for (const s of ['Amsterdam','Rotterdam','Utrecht','Den Haag','Eindhoven','Tilburg','Groningen','Breda','Nijmegen','Haarlem','Almere','Apeldoorn','Arnhem','Enschede','Leiden']) {
      if (ctx.includes(s)) { locatie = s; break; }
    }
    results.push({ id: 'mp-'+(offset+results.length), bron:'Marktplaats', titel, prijs, jaar: jm?parseInt(jm[1]):null, km:km?parseInt(km[1].replace(/\./g,'')):null, brandstof:bf, carrosserie:cr, transmissie:tr, locatie, url:fullUrl, imgSrc:img?img[1]:'', bijgewerkt:new Date().toISOString().split('T')[0] });
  }
  return results;
}

// ── AUTOSCOUT24 ──────────────────────────────────────────────────────────────
async function scrapeAutoScout24() {
  const listings = [];
  const pages = [
    'https://www.autoscout24.nl/lst?sort=age&desc=0&ustate=N%2CU&size=20&page=1&fregfrom=2015',
    'https://www.autoscout24.nl/lst?sort=age&desc=0&ustate=N%2CU&size=20&page=2&fregfrom=2015',
    'https://www.autoscout24.nl/lst?sort=age&desc=0&ustate=N%2CU&size=20&page=3&fregfrom=2015',
  ];
  for (const url of pages) {
    try {
      const resp = await fetch(url, { headers: { ...HEADERS, 'Referer': 'https://www.autoscout24.nl/' } });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerAutoScout24(html, listings.length));
    } catch (e) { console.error('AS24 error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

function parseerAutoScout24(html, offset = 0) {
  const results = [], gezien = new Set();
  const re = /href="(\/auto\/[^"]+\/id-\d+[^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 60) {
    const href = m[1], fullUrl = 'https://www.autoscout24.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 3000);
    const pm = ctx.match(/(\d{1,3}(?:\.\d{3})*)\s*€|€\s*(\d{1,3}(?:\.\d{3})*)/);
    if (!pm) continue;
    const prijs = parseInt((pm[1]||pm[2]).replace(/\./g,''));
    if (!prijs || prijs < 500) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    results.push({ id:'as24-'+(offset+results.length), bron:'AutoScout24', titel:href.split('/').slice(-2,-1)[0]?.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).substring(0,70)||'Auto', prijs, jaar:jm?parseInt(jm[1]):null, km:km?parseInt(km[1].replace(/\./g,'')):null, brandstof:'', carrosserie:'', transmissie:'', locatie:'Nederland', url:fullUrl, imgSrc:'', bijgewerkt:new Date().toISOString().split('T')[0] });
  }
  return results;
}

// ── GASPEDAAL ────────────────────────────────────────────────────────────────
async function scrapeGaspedaal() {
  const listings = [];
  const urls = [
    'https://www.gaspedaal.nl/occasion/occasions?sort=recent&page=1',
    'https://www.gaspedaal.nl/occasion/occasions?sort=recent&page=2',
    'https://www.gaspedaal.nl/occasion/toyota/occasions',
    'https://www.gaspedaal.nl/occasion/volkswagen/occasions',
    'https://www.gaspedaal.nl/occasion/bmw/occasions',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerGeneric(html, listings.length, 'gp', 'Gaspedaal', 'https://www.gaspedaal.nl', /href="(\/occasion\/[^/]+\/[^/]+\/[^"]+)"/g));
    } catch (e) { console.error('Gaspedaal error:', e.message); }
    await sleep(1500);
  }
  return listings;
}

// ── VIABOVAG ─────────────────────────────────────────────────────────────────
async function scrapeViaBOVAG() {
  const listings = [];
  const urls = [
    'https://www.viabovag.nl/occasions?sortOrder=DateDescending&pageSize=50&pageIndex=1',
    'https://www.viabovag.nl/occasions?sortOrder=DateDescending&pageSize=50&pageIndex=2',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerGeneric(html, listings.length, 'vb', 'ViaBOVAG', 'https://www.viabovag.nl', /href="(\/occasion\/[^"]+)"/g));
    } catch (e) { console.error('ViaBOVAG error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

// ── AUTOTRADER ───────────────────────────────────────────────────────────────
async function scrapeAutotrader() {
  const listings = [];
  const urls = [
    'https://www.autotrader.nl/autos?sort=registrationDate&sortOrder=desc&page=1',
    'https://www.autotrader.nl/autos?sort=registrationDate&sortOrder=desc&page=2',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerGeneric(html, listings.length, 'at', 'Autotrader', 'https://www.autotrader.nl', /href="(\/auto\/[^"]+\/\d+[^"]*)"/g));
    } catch (e) { console.error('Autotrader error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

// ── AUTOLINE ─────────────────────────────────────────────────────────────────
async function scrapeAutoline() {
  const listings = [];
  const urls = [
    'https://autoline.nl/auto-personenautos/?new_used=used&sort=updated-desc',
    'https://autoline.nl/auto-personenautos/?new_used=used&sort=updated-desc&p=2',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerGeneric(html, listings.length, 'al', 'Autoline', 'https://autoline.nl', /href="(\/auto-personenautos\/[^"]+\/[^"]+)"/g));
    } catch (e) { console.error('Autoline error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

// ── GENERIEKE PARSER ─────────────────────────────────────────────────────────
function parseerGeneric(html, offset, prefix, bron, baseUrl, re) {
  const results = [], gezien = new Set();
  let m;
  while ((m = re.exec(html)) !== null && results.length < 60) {
    const href = m[1], fullUrl = baseUrl + href;
    if (gezien.has(fullUrl) || !href.match(/\d/)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 2000);
    const pm = ctx.match(/€\s*[\s]?([\d.,]+)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/[.,]/g,'').substring(0,7));
    if (!prijs || prijs < 500 || prijs > 200000) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const img = ctx.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    let bf = '';
    if (/[Ee]lektrisch|electric/i.test(ctx)) bf = 'Elektrisch';
    else if (/[Hh]ybride/i.test(ctx)) bf = 'Hybride';
    else if (/[Dd]iesel/i.test(ctx)) bf = 'Diesel';
    else if (/[Bb]enzine/i.test(ctx)) bf = 'Benzine';
    const slugParts = href.split('/').filter(Boolean);
    const titel = slugParts.slice(-2).join(' ').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).substring(0,70);
    if (titel.length < 4) continue;
    results.push({ id:prefix+'-'+(offset+results.length), bron, titel, prijs, jaar:jm?parseInt(jm[1]):null, km:km?parseInt(km[1].replace(/\./g,'')):null, brandstof:bf, carrosserie:'', transmissie:'', locatie:'Nederland', url:fullUrl, imgSrc:img?img[1]:'', bijgewerkt:new Date().toISOString().split('T')[0] });
  }
  return results;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚗 Scraper gestart:', new Date().toISOString());
  const all = [];
  
  console.log('Scraping Marktplaats...');
  all.push(...await scrapeMarktplaats());
  console.log(`  → ${all.length} listings`);

  console.log('Scraping AutoScout24...');
  const as24 = await scrapeAutoScout24();
  all.push(...as24);
  console.log(`  → ${as24.length} new, totaal ${all.length}`);

  console.log('Scraping Gaspedaal...');
  const gp = await scrapeGaspedaal();
  all.push(...gp);
  console.log(`  → ${gp.length} new, totaal ${all.length}`);

  console.log('Scraping ViaBOVAG...');
  const vb = await scrapeViaBOVAG();
  all.push(...vb);
  console.log(`  → ${vb.length} new, totaal ${all.length}`);

  console.log('Scraping Autotrader...');
  const at = await scrapeAutotrader();
  all.push(...at);
  console.log(`  → ${at.length} new, totaal ${all.length}`);

  console.log('Scraping Autoline...');
  const al = await scrapeAutoline();
  all.push(...al);
  console.log(`  → ${al.length} new, totaal ${all.length}`);

  const bronnen = [...new Set(all.map(l => l.bron))];
  const data = {
    bijgewerkt: new Date().toISOString(),
    totaal: all.length,
    bronnen,
    listings: all
  };

  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Opgeslagen: ${all.length} listings van ${bronnen.join(', ')}`);
}

main().catch(e => { console.error('❌ Fout:', e); process.exit(1); });
