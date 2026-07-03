// scripts/scrape.js - AutoVergelijker dagelijkse scraper
// Bronnen: Marktplaats + Gaspedaal + viaBOVAG

const fs = require('fs');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── HEADERS ───────────────────────────────────────────────────────────────────

const HEADERS_MP = {
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

const HEADERS_GP = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const HEADERS_VB = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
};

// ── MARKTPLAATS ───────────────────────────────────────────────────────────────

const MP_URLS = [
  'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100',
  'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100&currentPage=2',
  'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100&currentPage=3',
];

async function scrapeMarktplaats() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < MP_URLS.length; i++) {
    const url = MP_URLS[i];
    const label = `MP p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_MP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerMarktplaats(html, gezien);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal MP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < MP_URLS.length - 1) await sleep(8000);
  }
  return all;
}

function parseerMarktplaats(html, gezien) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const items = data?.props?.pageProps?.searchRequestAndResponse?.listings || [];
      if (items.length > 0) {
        console.log(` __NEXT_DATA__: ${items.length} items`);
        return parseerMPItems(items, gezien);
      }
    } catch (e) {
      console.log(` JSON fout: ${e.message}`);
    }
  }
  console.log(` Fallback regex...`);
  return parseerMPFallback(html, gezien);
}

function parseerMPItems(items, gezien) {
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

function parseerMPFallback(html, gezien) {
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
    const prijs = parseInt(pm[1].replace(/\./g, ''));
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

// ── GASPEDAAL ─────────────────────────────────────────────────────────────────

const GP_URLS = [
  'https://www.gaspedaal.nl/zoeken?srt=df-a',
  'https://www.gaspedaal.nl/zoeken?srt=df-a&p=2',
];

async function scrapeGaspedaal() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < GP_URLS.length; i++) {
    const url = GP_URLS[i];
    const label = `GP p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_GP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerGaspedaal(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal GP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < GP_URLS.length - 1) await sleep(6000);
  }
  return all;
}

function parseerGaspedaal(html, gezien, label) {
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let items = [];
  for (const block of ldBlocks) {
    try {
      const d = JSON.parse(block[1]);
      if (d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
        items = d.itemListElement.map(e => e.item);
        console.log(` ${label}: ${items.length} JSON-LD items`);
        break;
      }
    } catch (e) { /* doorgaan */ }
  }

  if (items.length === 0) {
    console.log(` ${label}: geen JSON-LD items gevonden`);
    return [];
  }

  const portaalMatches = [...html.matchAll(/\\"portalen\\":\[/g)];
  const klikUrls = portaalMatches.map(m => {
    const chunk = html.substring(m.index, m.index + 800);
    const match = chunk.match(/https:\/\/api\.gaspedaal\.nl\/redirect\/vehicle\/(\d+)/);
    return match ? 'https://api.gaspedaal.nl/redirect/vehicle/' + match[1] : null;
  }).filter(Boolean);

  console.log(` ${label}: ${klikUrls.length} klikUrls gevonden`);

  const results = [];
  const limit = Math.min(items.length, klikUrls.length);

  for (let i = 0; i < limit; i++) {
    const item = items[i];
    const url = klikUrls[i];

    const rawId = item['@id']?.split('#')[1];
    if (!rawId) continue;
    const id = 'gp-' + rawId;
    if (gezien.has(id)) continue;
    gezien.add(id);

    const prijs = item.offers?.price || 0;
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    results.push({
      id,
      bron: 'Gaspedaal',
      titel: (item.name || '').substring(0, 80),
      prijs,
      jaar: item.productionDate || null,
      km: item.mileageFromOdometer?.value ?? null,
      brandstof: item.fuelType || '',
      carrosserie: item.bodyType || '',
      transmissie: item.vehicleTransmission || '',
      kleur: item.color || '',
      locatie: item.offers?.seller?.address?.addressLocality || 'Nederland',
      url,
      imgSrc: item.image || '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ── VIABOVAG ──────────────────────────────────────────────────────────────────

const VB_URLS = [
  'https://www.viabovag.nl/auto/occasion',
  'https://www.viabovag.nl/auto/occasion?pagina=2',
  'https://www.viabovag.nl/auto/occasion?pagina=3',
  'https://www.viabovag.nl/auto/occasion?pagina=4',
];

async function scrapeViaBovag() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < VB_URLS.length; i++) {
    const url = VB_URLS[i];
    const label = `VB p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_VB });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerViaBovag(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal VB ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < VB_URLS.length - 1) await sleep(7000);
  }
  return all;
}

function parseerViaBovag(html, gezien, label) {
  const results = [];

  // Collect all unique car URLs — each car appears ~3x (responsive layouts)
  const allUrlMatches = [...html.matchAll(/href="(\/auto\/aanbod\/[^"]+)"/g)];
  const uniqueUrls = [...new Set(allUrlMatches.map(m => m[1]))];
  console.log(` ${label}: ${uniqueUrls.length} unieke auto-URLs`);

  for (const relUrl of uniqueUrls) {
    // Stable ID = 7-char code at end of slug
    const idCode = (relUrl.match(/([a-z0-9]{7})$/) || [])[1];
    if (!idCode) continue;
    const id = 'vb-' + idCode;
    if (gezien.has(id)) continue;

    // Get context window: from first occurrence to next car URL (max 5000 chars)
    const startIdx = html.indexOf(`href="${relUrl}"`);
    if (startIdx < 0) continue;
    // Find next different car URL after this one
    const afterThis = html.indexOf('/auto/aanbod/', startIdx + relUrl.length + 10);
    const windowEnd = afterThis > 0 ? Math.min(afterThis + 50, startIdx + 5000) : startIdx + 5000;
    const chunk = html.substring(startIdx, windowEnd);

    // Price: "31.850,-" or "9.500,-"
    const priceM = chunk.match(/([\d]+\.[\d]+),-|([\d]+),-/);
    const prijs = priceM ? parseInt((priceM[1] || priceM[2]).replace(/\./g, '')) : 0;
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    // Title from h2/h3 inside this chunk
    const titleM = chunk.match(/<h[2-4][^>]*>([^<]{3,60})<\/h[2-4]>/);
    const slugTitle = relUrl
      .replace(/\/auto\/aanbod\//, '')
      .replace(/-[a-z0-9]{7}$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .substring(0, 80);
    const titel = titleM ? titleM[1].trim().substring(0, 80) : slugTitle;

    // KM: "3.090 km"
    const kmM = chunk.match(/([\d]+\.[\d]+|[\d]+)\s*km\b/i);
    const km = kmM ? parseInt(kmM[1].replace(/\./g, '')) : null;

    // Year from "MM-YYYY" date
    const yearM = chunk.match(/\b\d{2}-(20\d{2})\b/);
    const jaar = yearM ? parseInt(yearM[1]) : null;

    // Fuel: Benzine, Diesel, Elektrisch, Hybride
    const bsM = chunk.match(/\b(Benzine|Diesel|Elektrisch|Hybride|LPG|Waterstof)\b/i);
    const brandstof = bsM ? bsM[1] : '';

    // Image from Azure blob
    const imgM = chunk.match(/https:\/\/stsharedprdweu\.blob\.core\.windows\.net\/vehicles-media\/[^"'\s>]+/);
    const imgSrc = imgM ? imgM[0] : '';

    // Location: uppercase Dutch city (before the price, e.g. "BORNERBROEK")
    const locM = chunk.match(/\b([A-Z][A-Z\s\-]{2,25}[A-Z])\b/);
    const locatie = (locM && !locM[1].includes('BOVAG') && !locM[1].includes('HTTP'))
      ? locM[1].trim()
      : 'Nederland';

    gezien.add(id);
    results.push({
      id,
      bron: 'viaBOVAG',
      titel,
      prijs,
      jaar,
      km,
      brandstof,
      carrosserie: '',
      transmissie: '',
      kleur: '',
      locatie,
      url: 'https://www.viabovag.nl' + relUrl,
      imgSrc,
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚗 Scraper gestart:', new Date().toISOString());

  console.log('\n📦 Marktplaats...');
  const mpListings = await scrapeMarktplaats();
  console.log(`✓ Marktplaats: ${mpListings.length} listings`);

  console.log('\n⛽ Gaspedaal...');
  const gpListings = await scrapeGaspedaal();
  console.log(`✓ Gaspedaal: ${gpListings.length} listings`);

  console.log('\n🏷️ viaBOVAG...');
  const vbListings = await scrapeViaBovag();
  console.log(`✓ viaBOVAG: ${vbListings.length} listings`);

  const listings = [...mpListings, ...gpListings, ...vbListings];
  console.log(`\n📊 Totaal: ${listings.length} listings`);

  const data = {
    bijgewerkt: new Date().toISOString(),
    totaal: listings.length,
    bronnen: [...new Set(listings.map(l => l.bron))],
    listings
  };

  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Opgeslagen naar ${outPath}`);
}

main().catch(e => { console.error('❌ Fout:', e); process.exit(1); });
