// scripts/scrape.js - AutoVergelijker dagelijkse scraper
// Strategie: __NEXT_DATA__ JSON parsing per merk (30 listings/pagina)
// 20 merken × 3 paginas = 60 searches → verwacht 400-800 unieke listings

const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.7',
  'Cache-Control': 'no-cache',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 20 merken × 3 paginas = 60 zoekopdrachten, geen algemene pagina's (te veel overlap)
const MERKEN = [
  'volkswagen','toyota','ford','opel','bmw','mercedes-benz',
  'audi','renault','peugeot','seat','skoda','honda',
  'hyundai','kia','volvo','mazda','tesla','citroen',
  'nissan','fiat'
];

const SEARCH_URLS = [];
for (const merk of MERKEN) {
  for (let p = 1; p <= 3; p++) {
    SEARCH_URLS.push(
      `https://www.marktplaats.nl/l/auto-s/${merk}/?numberOfResultsPerPage=100${p > 1 ? '&currentPage=' + p : ''}`
    );
  }
}

async function scrapeMarktplaats() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < SEARCH_URLS.length; i++) {
    const url = SEARCH_URLS[i];
    const merkNaam = url.split('/auto-s/')[1]?.split('/')[0] || 'onbekend';
    const pageNum = url.includes('currentPage=') ? url.match(/currentPage=(\d+)/)[1] : '1';

    try {
      const resp = await fetch(url, { headers: HEADERS });
      if (!resp.ok) {
        console.log(`  ${merkNaam} p${pageNum}: HTTP ${resp.status}`);
        continue;
      }
      const html = await resp.text();
      const found = parseerNextData(html, gezien);
      all.push(...found);
      console.log(`  ${merkNaam} p${pageNum}: ${found.length} nieuw → totaal ${all.length}`);
    } catch (e) {
      console.log(`  ${merkNaam} p${pageNum}: fout - ${e.message}`);
    }

    // Pauze: 2s normaal, 4s elke 10 verzoeken
    await sleep((i + 1) % 10 === 0 ? 4000 : 2000);
  }

  return all;
}

function parseerNextData(html, gezien) {
  const results = [];
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (!match) {
    console.log('    (geen __NEXT_DATA__ gevonden)');
    return results;
  }

  let items;
  try {
    const data = JSON.parse(match[1]);
    items = data?.props?.pageProps?.searchRequestAndResponse?.listings || [];
  } catch (e) {
    console.log(`    (JSON parse fout: ${e.message})`);
    return results;
  }

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

async function main() {
  console.log('🚗 AutoVergelijker scraper gestart:', new Date().toISOString());
  console.log(`Totaal ${SEARCH_URLS.length} zoekopdrachten (20 merken × 3 paginas)`);

  const listings = await scrapeMarktplaats();

  const bronnen = [...new Set(listings.map(l => l.bron))];
  const data = { bijgewerkt: new Date().toISOString(), totaal: listings.length, bronnen, listings };

  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\n✅ Klaar! ${listings.length} listings opgeslagen (${bronnen.join(', ')})`);
}

main().catch(e => { console.error('❌ Fout:', e); process.exit(1); });
