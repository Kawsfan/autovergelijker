// scripts/scrape.js
// Dagelijkse scraper voor AutoVergelijker
// Gebruikt __NEXT_DATA__ JSON parsing voor Marktplaats (30-100 listings per pagina)

const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Cache-Control': 'no-cache',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── MARKTPLAATS via __NEXT_DATA__ ────────────────────────────────────────────
async function scrapeMarktplaats() {
  const listings = [];
  const searches = [
    'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100&currentPage=2',
    'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100&currentPage=3',
    'https://www.marktplaats.nl/l/auto-s/toyota/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/volkswagen/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/ford/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/opel/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/renault/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/peugeot/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/mercedes-benz/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/audi/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/seat/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/skoda/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/honda/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/hyundai/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/kia/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/tesla/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/volvo/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/mazda/?numberOfResultsPerPage=100',
  ];

  const gezien = new Set();
  for (const url of searches) {
    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) { console.error('MP HTTP', resp.status, url); continue; }
      const html = await resp.text();
      const found = parseerNextData(html, gezien, listings.length);
      listings.push(...found);
      console.log(`  MP ${url.split('/l/auto-s/')[1]?.split('?')[0] || 'alle'}: ${found.length} nieuw, totaal ${listings.length}`);
    } catch (e) { console.error('MP error:', url, e.message); }
    await sleep(2000);
  }
  return listings;
}

function parseerNextData(html, gezien = new Set(), offset = 0) {
  const results = [];
  // Extract __NEXT_DATA__ JSON
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (!match) return parseerFallback(html, gezien, offset);

  try {
    const data = JSON.parse(match[1]);
    const items = data?.props?.pageProps?.searchRequestAndResponse?.listings || [];

    for (const item of items) {
      const url = 'https://www.marktplaats.nl' + (item.vipUrl || '');
      if (gezien.has(url)) continue;
      gezien.add(url);

      const prijs = Math.round((item.priceInfo?.priceCents || 0) / 100);
      if (!prijs || prijs < 500 || prijs > 250000) continue;

      const attrs = {};
      for (const a of (item.attributes || [])) {
        attrs[a.key] = a.value;
      }

      const brandstofMap = { Benzine:'Benzine', Diesel:'Diesel', Elektrisch:'Elektrisch', Hybride:'Hybride', LPG:'LPG' };
      const carrosMap = { Hatchback:'Hatchback', Sedan:'Sedan', Stationwagon:'Stationwagon', SUV:'SUV', Cabrio:'Cabrio', Coupe:'Coupe', MPV:'MPV', Bestelauto:'Bestelauto' };

      results.push({
        id: 'mp-' + item.itemId,
        bron: 'Marktplaats',
        titel: (item.title || '').substring(0, 70),
        prijs,
        jaar: attrs.constructionYear ? parseInt(attrs.constructionYear) : null,
        km: attrs.mileage ? parseInt(attrs.mileage) : null,
        brandstof: brandstofMap[attrs.fuel] || attrs.fuel || '',
        carrosserie: carrosMap[attrs.body] || attrs.body || '',
        transmissie: attrs.transmission || '',
        locatie: item.location?.cityName || 'Nederland',
        url,
        imgSrc: item.imageUrls?.[0] || '',
        bijgewerkt: new Date().toISOString().split('T')[0]
      });
    }
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return parseerFallback(html, gezien, offset);
  }
  return results;
}

function parseerFallback(html, gezien = new Set(), offset = 0) {
  const results = [];
  const re = /href="(\/(v|m)\/auto-s\/[^/]+\/[am]\d+[^"]*?)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 50) {
    const href = m[1], fullUrl = 'https://www.marktplaats.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 200), m.index + 2000);
    const pm = ctx.match(/€\s*([\d.]+)(?:,-|\s)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/\./g, ''));
    if (!prijs || prijs < 500) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const sl = href.match(/\/[am]\d+-(.+)$/);
    const titel = sl ? decodeURIComponent(sl[1]).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).substring(0,70) : '';
    if (!titel || titel.length < 4) continue;
    results.push({ id:'mp-'+(offset+results.length), bron:'Marktplaats', titel, prijs, jaar:jm?parseInt(jm[1]):null, km:km?parseInt(km[1].replace(/\./g,'')):null, brandstof:'', carrosserie:'', transmissie:'', locatie:'Nederland', url:fullUrl, imgSrc:'', bijgewerkt:new Date().toISOString().split('T')[0] });
  }
  return results;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚗 Scraper gestart:', new Date().toISOString());

  console.log('Scraping Marktplaats...');
  const all = await scrapeMarktplaats();
  console.log(`Marktplaats totaal: ${all.length} listings`);

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
