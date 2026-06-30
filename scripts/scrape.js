// scripts/scrape.js - AutoVergelijker dagelijkse scraper
// Strategie: slechts 3 algemene paginas om WAF-blokkade te vermijden
// 3 paginas x 30 listings = ~90 unieke listings per dag

const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Cache-Control': 'max-age=0',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Slechts 3 paginas - minder = minder kans op WAF-blokkade
const SEARCH_URLS = [
  'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100',
  'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100&currentPage=2',
  'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100&currentPage=3',
];

async function scrapeMarktplaats() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < SEARCH_URLS.length; i++) {
    const url = SEARCH_URLS[i];
    const label = `p${i + 1}`;

    try {
      const resp = await fetch(url, { headers: HEADERS });
      console.log(`  ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;

      const html = await resp.text();
      const found = parseer(html, gezien);
      all.push(...found);
      console.log(`  ${label}: ${found.length} nieuw → totaal ${all.length}`);
    } catch (e) {
      console.log(`  ${label}: fout - ${e.message}`);
    }

    // Langere pauze tussen requests om WAF te omzeilen
    if (i < SEARCH_URLS.length - 1) await sleep(8000);
  }

  return all;
}

function parseer(html, gezien) {
  // Probeer __NEXT_DATA__ JSON eerst
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const items = data?.props?.pageProps?.searchRequestAndResponse?.listings || [];
      if (items.length > 0) {
        console.log(`    __NEXT_DATA__: ${items.length} items gevonden`);
        return parseItems(items, gezien);
      }
    } catch (e) {
      console.log(`    JSON fout: ${e.message}`);
    }
  }

  // Fallback: regex op href links
  console.log(`    Fallback regex...`);
  return parseerFallback(html, gezien);
}

function parseItems(items, gezien) {
  const results = [];
  for (const item of items) {
    const relUrl = item.vipUrl || '';
    if (!relUrl) continue;
    const fullUrl = 'https://www.marktplaats.nl' + relUrl;
    if (gezien.has(fullUrl)) continue;
    gezien.add(fullUrl);

    const prijs = Math.round((item.priceInfo?.priceCents || 0) / 100);
    if (!prijs || prijs < 500 || prijs > 300000) continue;

    const attrs = {};
    for (const a of (item.attributes || [])) attrs[a.key] = a.value;

    results.push({
      id: 'mp-' + item.itemId,
      bron: 'Marktplaats',
      titel: (item.title || '').substring(0, 80),
      prijs,
      jaar: attrs.constructionYear ? parseInt(attrs.constructionYear) : null,
      km: attrs.mileage ? parseInt(attrs.mileage) : null,
      brandstof: attrs.fuel || '',
      carrosserie: attrs.body || '',
      transmissie: attrs.transmission || '',
      kleur: attrs.color || '',
      locatie: item.location?.cityName || 'Nederland',
      url: fullUrl,
      imgSrc: item.imageUrls?.[0] || item.pictures?.[0]?.url || '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

function parseerFallback(html, gezien) {
  const results = [];
  const re = /href="(\/(v|m)\/auto-s\/[^/]+\/[am]\d+[^"]*?)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 100) {
    const href = m[1];
    const fullUrl = 'https://www.marktplaats.nl' + href;
    if (gezien.has(fullUrl)) continue;

    const ctx = html.substring(Math.max(0, m.index - 300), m.index + 1500);
    const pm = ctx.match(/€\s*([\d.]+)(?:,-|\s)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/\./g, '''));
    if (!prijs || prijs < 500) continue;

    gezien.add(fullUrl);
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const sl = href.match(/\/[am]\d+-(.+)$/);
    const titel = sl
      ? decodeURIComponent(sl[1]).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 70)
      : '';
    if (!titel || titel.length < 5) continue;

    results.push({
      id: 'mp-fb-' + results.length,
      bron: 'Marktplaats',
      titel,
      prijs,
      jaar: jm ? parseInt(jm[1]) : null,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: '', carrosserie: '', transmissie: '', kleur: '',
      locatie: 'Nederland',
      url: fullUrl,
      imgSrc: '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

async function main() {
  console.log('🚗 Scraper gestart:', new Date().toISOString());

  const listings = await scrapeMarktplaats();

  // Sla op, ook als 0 resultaten (dan blijft oude data bewaard via git)
  if (listings.length === 0) {
    console.log('⚠️  0 listings gevonden - schrijf toch zodat bijgewerkt-timestamp klopt');
  }

  const data = {
    bijgewerkt: new Date().toISOString(),
    totaal: listings.length,
    bronnen: listings.length > 0 ? ['Marktplaats'] : [],
    listings
  };

  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Klaar: ${listings.length} listings`);
}

main().catch(e => { console.error('❌ Fout:', e); process.exit(1); });
