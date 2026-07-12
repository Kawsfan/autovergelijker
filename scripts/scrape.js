// scripts/scrape.js - AutoVergelijker dagelijkse scraper
// Bronnen: Marktplaats + Gaspedaal + viaBOVAG + AutoTrack + AutoScout24 + AutoTrader

const fs = require('fs');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, options = {}, maxPogingen = 3) {
  for (let poging = 1; poging <= maxPogingen; poging++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok) return resp;
      if (poging < maxPogingen) {
        const wacht = poging * 2000;
        console.log(`    â» HTTP ${resp.status} â retry ${poging}/${maxPogingen - 1} (wacht ${wacht/1000}s)...`);
        await sleep(wacht);
      } else {
        console.log(`    â HTTP ${resp.status} na ${maxPogingen} pogingen: ${url.slice(0,80)}`);
        return resp;
      }
    } catch (err) {
      if (poging < maxPogingen) {
        const wacht = poging * 2000;
        console.log(`    â» Fout (${err.message}) â retry ${poging}/${maxPogingen - 1} (wacht ${wacht/1000}s)...`);
        await sleep(wacht);
      } else {
        console.log(`    â Opgegeven na ${maxPogingen} pogingen: ${err.message}`);
        throw err;
      }
    }
  }
}

// Ã¢ÂÂÃ¢ÂÂ HEADERS Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

const HEADERS_MP = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Referer': 'https://www.marktplaats.nl/l/auto-s/',
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

const HEADERS_AT = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const HEADERS_AS24 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const HEADERS_ATR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// Ã¢ÂÂÃ¢ÂÂ MARKTPLAATS Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

const MP_API_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100';
const MP_OFFSETS = [0, 100, 200];
const MP_EV_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=elektrisch';
const MP_EV_OFFSETS = [0, 100, 200];

const MP_TESLA_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=tesla';
const MP_TESLA_OFFSETS = [0, 100, 200, 300, 400];
const MP_FORD_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=ford+mach-e';
const MP_FORD_OFFSETS = [0, 100, 200];
const MP_FORD_EXPLORER_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=ford+explorer+elektrisch';
const MP_FORD_EXPLORER_OFFSETS = [0, 100];
const MP_JEEP_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=jeep';
const MP_JEEP_OFFSETS = [0, 100];
const MP_ALFA_ROMEO_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=alfa+romeo';
const MP_ALFA_ROMEO_OFFSETS = [0, 100];
const MP_SUZUKI_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=suzuki';
const MP_SUZUKI_OFFSETS = [0, 100];
const MP_MITSUBISHI_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=mitsubishi';
const MP_MITSUBISHI_OFFSETS = [0, 100];
const MP_CUPRA_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=cupra';
const MP_CUPRA_OFFSETS = [0, 100];
const MP_MG_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=mg';
const MP_MG_OFFSETS = [0, 100];
const MP_POLESTAR_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=polestar';
const MP_POLESTAR_OFFSETS = [0, 100];
const MP_JAGUAR_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=jaguar';
const MP_JAGUAR_OFFSETS = [0, 100];
const MP_SUBARU_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=subaru';
const MP_SUBARU_OFFSETS = [0, 100];
const MP_LEXUS_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=lexus';
const MP_LEXUS_OFFSETS = [0, 100];
const MP_BYD_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=byd';
const MP_BYD_OFFSETS = [0, 100];
const MP_SMART_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=smart';
const MP_SMART_OFFSETS = [0, 100];
const MP_DS_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=ds';
const MP_DS_OFFSETS = [0, 100];

async function scrapeMarktplaats() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < MP_OFFSETS.length; i++) {
    const url = MP_API_BASE + '&offset=' + MP_OFFSETS[i];
    const label = `MP p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_MP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = data.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal MP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    await sleep(3000);
  }

  for (let i = 0; i < MP_EV_OFFSETS.length; i++) {
    const url = MP_EV_BASE + '&offset=' + MP_EV_OFFSETS[i];
    const label = `MP EV p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_MP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = data.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal MP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < MP_EV_OFFSETS.length - 1) await sleep(4000);
  }


  // Tesla extra
  for (let i = 0; i < MP_TESLA_OFFSETS.length; i++) {
    const url = MP_TESLA_BASE + '&offset=' + MP_TESLA_OFFSETS[i];
    const label = `MP Tesla p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_MP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = data.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal MP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < MP_TESLA_OFFSETS.length - 1) await sleep(4000);
  }

  // Ford Mach-E extra
  for (let i = 0; i < MP_FORD_OFFSETS.length; i++) {
    const url = MP_FORD_BASE + '&offset=' + MP_FORD_OFFSETS[i];
    const label = 'MP Ford Mach-E p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_FORD_OFFSETS.length - 1) await sleep(4000);
  }

  // Ford Explorer Elektrisch extra
  for (let i = 0; i < MP_FORD_EXPLORER_OFFSETS.length; i++) {
    const url = MP_FORD_EXPLORER_BASE + '&offset=' + MP_FORD_EXPLORER_OFFSETS[i];
    const label = 'MP Ford Explorer p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_FORD_EXPLORER_OFFSETS.length - 1) await sleep(4000);
  }

  return all;
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
      imgs: (item.imageUrls || []).slice(0, 10),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// Ã¢ÂÂÃ¢ÂÂ GASPEDAAL Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

const GP_URLS = [
  'https://www.gaspedaal.nl/zoeken?srt=df-a',
  'https://www.gaspedaal.nl/zoeken?srt=df-a&p=2',
  'https://www.gaspedaal.nl/elektrisch',
  'https://www.gaspedaal.nl/elektrisch?p=2',
  'https://www.gaspedaal.nl/tesla',
  'https://www.gaspedaal.nl/tesla?p=2',
  'https://www.gaspedaal.nl/tesla?p=3',
  // Ford Elektrisch
  'https://www.gaspedaal.nl/ford/elektrisch',
  'https://www.gaspedaal.nl/ford/elektrisch?p=2',
  'https://www.gaspedaal.nl/ford/mach-e',
  'https://www.gaspedaal.nl/ford/mach-e?p=2',

  // Jeep
  'https://www.gaspedaal.nl/jeep',
  'https://www.gaspedaal.nl/jeep?p=2',
  // Alfa Romeo
  'https://www.gaspedaal.nl/alfa-romeo',
  'https://www.gaspedaal.nl/alfa-romeo?p=2',
  // Suzuki
  'https://www.gaspedaal.nl/suzuki',
  'https://www.gaspedaal.nl/suzuki?p=2',
  // Mitsubishi
  'https://www.gaspedaal.nl/mitsubishi',
  'https://www.gaspedaal.nl/mitsubishi?p=2',
  // Cupra
  'https://www.gaspedaal.nl/cupra',
  'https://www.gaspedaal.nl/cupra?p=2',
  // MG
  'https://www.gaspedaal.nl/mg',
  'https://www.gaspedaal.nl/mg?p=2',
  // Polestar
  'https://www.gaspedaal.nl/polestar',
  // Jaguar
  'https://www.gaspedaal.nl/jaguar',
  'https://www.gaspedaal.nl/jaguar?p=2',
  // Subaru
  'https://www.gaspedaal.nl/subaru',
  'https://www.gaspedaal.nl/subaru?p=2',
  // Lexus
  'https://www.gaspedaal.nl/lexus',
  'https://www.gaspedaal.nl/lexus?p=2',
  // BYD
  'https://www.gaspedaal.nl/byd',
  // Smart
  'https://www.gaspedaal.nl/smart',
  'https://www.gaspedaal.nl/smart?p=2',
  // DS
  'https://www.gaspedaal.nl/ds',
  'https://www.gaspedaal.nl/ds?p=2',
];

async function scrapeGaspedaal() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < GP_URLS.length; i++) {
    const url = GP_URLS[i];
    const label = `GP p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_GP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerGaspedaal(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal GP ${all.length}`);
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
      imgs: item.image ? [item.image] : [],
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// Ã¢ÂÂÃ¢ÂÂ VIABOVAG Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

const VB_URLS = [
  'https://www.viabovag.nl/auto/occasion',
  'https://www.viabovag.nl/auto/occasion?pagina=2',
  'https://www.viabovag.nl/auto/occasion?pagina=3',
  'https://www.viabovag.nl/auto/occasion?pagina=4',
  'https://www.viabovag.nl/auto/occasion?brandstof=Elektrisch',
  'https://www.viabovag.nl/auto/occasion?brandstof=Elektrisch&pagina=2',
  'https://www.viabovag.nl/auto/occasion?brandstof=Elektrisch&pagina=3',
];

async function scrapeViaBovag() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < VB_URLS.length; i++) {
    const url = VB_URLS[i];
    const label = `VB p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_VB });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerViaBovag(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal VB ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < VB_URLS.length - 1) await sleep(7000);
  }
  return all;
}

function parseerViaBovag(html, gezien, label) {
  const results = [];

  // Extract __NEXT_DATA__ JSON â veel betrouwbaarder dan HTML regex
  const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (!ndMatch) {
    console.log(` ${label}: geen __NEXT_DATA__ gevonden, skip`);
    return results;
  }

  let items;
  try {
    const nd = JSON.parse(ndMatch[1]);
    const sr = nd.props?.pageProps?.serverSearchResults;
    items = sr?.results || [];
    console.log(` ${label}: ${items.length} resultaten in __NEXT_DATA__`);
  } catch (e) {
    console.log(` ${label}: JSON parse fout: ${e.message}`);
    return results;
  }

  for (const item of items) {
    if (!item.url || !item.id) continue;
    const id = 'vb_' + item.id;
    if (gezien.has(id)) continue;
    gezien.add(id);

    const v = item.vehicle || {};
    const fuelArr = Array.isArray(v.fuelTypes) ? v.fuelTypes : (v.fuelTypes ? [v.fuelTypes] : []);
    const brandstof = fuelArr[0] || null;

    results.push({
      id,
      bron: 'ViaBovag',
      titel: item.title || (`${v.brand || ''} ${v.model || ''}`).trim(),
      prijs: item.price != null ? parseInt(item.price) : null,
      km: v.mileage != null ? parseInt(v.mileage) : null,
      jaar: v.year || null,
      brandstof,
      locatie: item.company?.city || null,
      url: 'https://www.viabovag.nl' + item.url,
      afbeelding: item.imageUrl || null,
      bijgewerkt: new Date().toISOString().slice(0, 10),
    });
  }

  return results;
}

const AT_URLS = [
  // Algemeen aanbod
  'https://www.autotrack.nl/tweedehands-auto/',
  'https://www.autotrack.nl/tweedehands-auto/?pagina=2',
  'https://www.autotrack.nl/tweedehands-auto/?pagina=3',
  // Hybride
  'https://www.autotrack.nl/tweedehands-auto/hybride/',
  'https://www.autotrack.nl/tweedehands-auto/hybride/?pagina=2',
  // Elektrisch
  'https://www.autotrack.nl/tweedehands-auto/elektrisch/',
  'https://www.autotrack.nl/tweedehands-auto/elektrisch/?pagina=2',
  'https://www.autotrack.nl/tweedehands-auto/elektrisch/?pagina=3',
  'https://www.autotrack.nl/tweedehands-auto/tesla/',
  'https://www.autotrack.nl/tweedehands-auto/tesla/?pagina=2',
  'https://www.autotrack.nl/tweedehands-auto/tesla/?pagina=3',
  // Ford Mach-E
  'https://www.autotrack.nl/tweedehands-auto/ford/mach-e/',
  'https://www.autotrack.nl/tweedehands-auto/ford/mach-e/?pagina=2',
  'https://www.autotrack.nl/tweedehands-auto/ford/mach-e/?pagina=3',
  // Ford Explorer Elektrisch
  'https://www.autotrack.nl/tweedehands-auto/ford/explorer/',
  'https://www.autotrack.nl/tweedehands-auto/ford/explorer/?pagina=2',
];

async function scrapeAutoTrack() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < AT_URLS.length; i++) {
    const url = AT_URLS[i];
    const label = `AT p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_AT });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoTrack(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal AT ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < AT_URLS.length - 1) await sleep(6000);
  }
  return all;
}

function parseerAutoTrack(html, gezien, label) {
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let items = [];

  for (const block of ldBlocks) {
    try {
      const d = JSON.parse(block[1]);
      if (d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
        items = d.itemListElement.map(e => e.item || e).filter(Boolean);
        console.log(` ${label}: ${items.length} JSON-LD items`);
        break;
      }
    } catch (e) { /* doorgaan */ }
  }

  if (items.length === 0) {
    for (const block of ldBlocks) {
      try {
        const d = JSON.parse(block[1]);
        if (Array.isArray(d) && d[0]?.['@type'] === 'Car') {
          items = d;
          console.log(` ${label}: ${items.length} Car items (array)`);
          break;
        }
      } catch (e) { /* doorgaan */ }
    }
  }

  if (items.length === 0) {
    console.log(` ${label}: geen JSON-LD items gevonden`);
    return [];
  }

  const results = [];
  for (const item of items) {
    const rawUrl = item.url || item['@id'] || '';
    if (!rawUrl) continue;

    const url = rawUrl.startsWith('http') ? rawUrl : 'https://www.autotrack.nl' + rawUrl;
    if (gezien.has(url)) continue;
    gezien.add(url);

    const idM = url.match(/\/(\d{6,})\/?$/);
    if (!idM) continue;
    const id = 'at-' + idM[1];

    const prijs = item.offers?.price || item.price || 0;
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    const kmRaw = item.mileageFromOdometer?.value ?? item.mileage ?? null;
    const km = kmRaw ? parseInt(String(kmRaw).replace(/[^\d]/g, '')) : null;

    const yearRaw = item.productionDate || item.modelDate || '';
    const yearM2 = String(yearRaw).match(/\b(19|20)\d{2}\b/);
    const jaar = yearM2 ? parseInt(yearM2[0]) : null;

    const imgSrc = (Array.isArray(item.image) ? item.image[0] : item.image) || '';

    results.push({
      id,
      bron: 'AutoTrack',
      titel: (item.name || '').substring(0, 80),
      prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : prijs,
      jaar,
      km,
      brandstof: item.fuelType || '',
      carrosserie: item.bodyType || '',
      transmissie: item.vehicleTransmission || '',
      kleur: item.color || '',
      locatie: item.offers?.seller?.address?.addressLocality || 'Nederland',
      url,
      imgSrc: typeof imgSrc === 'string' ? imgSrc : '',
      imgs: (Array.isArray(item.image) ? item.image : (item.image ? [item.image] : [])).slice(0, 10).map(u => typeof u === 'string' ? u : '').filter(Boolean),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// Ã¢ÂÂÃ¢ÂÂ AUTOSCOUT24 Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Gebruikt __NEXT_DATA__ JSON embedded in de pagina

const AS24_URLS = [
  // Algemeen aanbod (gesorteerd op nieuwste)
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=3',
  // Elektrisch (fuel=E)
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=1&fuel=E',
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=2&fuel=E',
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=3&fuel=E',
  // Hybride (fuel=M = mild hybrid, H = volledig hybride)
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=1&fuel=M%2CH',
  'https://www.autoscout24.nl/lst/?sort=standard&desc=0&ustate=N%2CU&size=20&page=2&fuel=M%2CH',

  // Tesla
  'https://www.autoscout24.nl/lst/tesla?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/tesla?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/tesla?sort=standard&desc=0&ustate=N%2CU&size=20&page=3',
  'https://www.autoscout24.nl/lst/tesla?sort=standard&desc=0&ustate=N%2CU&size=20&page=4',
  'https://www.autoscout24.nl/lst/tesla?sort=standard&desc=0&ustate=N%2CU&size=20&page=5',
  // Ford Elektrisch
  'https://www.autoscout24.nl/lst/ford?sort=standard&desc=0&ustate=N%2CU&size=20&page=1&fuel=E',
  'https://www.autoscout24.nl/lst/ford?sort=standard&desc=0&ustate=N%2CU&size=20&page=2&fuel=E',
  'https://www.autoscout24.nl/lst/ford?sort=standard&desc=0&ustate=N%2CU&size=20&page=3&fuel=E',

  // Jeep
  'https://www.autoscout24.nl/lst/jeep?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/jeep?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Alfa Romeo
  'https://www.autoscout24.nl/lst/alfa-romeo?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/alfa-romeo?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Suzuki
  'https://www.autoscout24.nl/lst/suzuki?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/suzuki?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Mitsubishi
  'https://www.autoscout24.nl/lst/mitsubishi?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/mitsubishi?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Cupra
  'https://www.autoscout24.nl/lst/cupra?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/cupra?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // MG
  'https://www.autoscout24.nl/lst/mg?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/mg?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Polestar
  'https://www.autoscout24.nl/lst/polestar?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/polestar?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Jaguar
  'https://www.autoscout24.nl/lst/jaguar?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/jaguar?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Subaru
  'https://www.autoscout24.nl/lst/subaru?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/subaru?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Lexus
  'https://www.autoscout24.nl/lst/lexus?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/lexus?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // BYD
  'https://www.autoscout24.nl/lst/byd?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/byd?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Smart
  'https://www.autoscout24.nl/lst/smart?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/smart?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // DS
  'https://www.autoscout24.nl/lst/ds?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/ds?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
];

async function scrapeAutoScout24() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < AS24_URLS.length; i++) {
    const url = AS24_URLS[i];
    const label = `AS24 p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_AS24 });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoScout24(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal AS24 ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < AS24_URLS.length - 1) await sleep(7000);
  }
  return all;
}

function parseerAutoScout24(html, gezien, label) {
  // Probeer __NEXT_DATA__ (Next.js app)
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (!nextMatch) {
    // Fallback: probeer window.__INITIAL_STATE__
    console.log(` ${label}: geen __NEXT_DATA__ gevonden`);
    return [];
  }

  let data;
  try {
    data = JSON.parse(nextMatch[1]);
  } catch (e) {
    console.log(` ${label}: JSON parse fout - ${e.message}`);
    return [];
  }

  // Navigeer naar listings Ã¢ÂÂ AutoScout24 wisselt soms van structuur
  const pp = data?.props?.pageProps;
  const listings =
    pp?.listings ||
    pp?.searchResult?.listings ||
    pp?.initialState?.list?.items ||
    pp?.listingSearchResult?.listings ||
    [];

  if (!listings.length) {
    console.log(` ${label}: geen listings in __NEXT_DATA__ (keys: ${Object.keys(pp || {}).join(', ')})`);
    return [];
  }

  console.log(` ${label}: ${listings.length} listings in __NEXT_DATA__`);

  const BRANDSTOF_MAP = {
    'E': 'Elektrisch', 'B': 'Benzine', 'D': 'Diesel',
    'M': 'Hybride', 'H': 'Hybride', 'L': 'LPG', 'C': 'CNG',
  };

  const results = [];  for (const item of listings) {
    const id = 'as24-' + (item.id || item.guid || '');
    if (!id || id === 'as24-' || gezien.has(id)) continue;
    gezien.add(id);

    // Prijs kan op meerdere plekken staan
    const prijs = Math.round(item.price?.priceRaw || 0);
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    const relUrl = item.url || item.detailPageUrl || '';
    const url = relUrl.startsWith('http') ? relUrl : 'https://www.autoscout24.nl' + relUrl;

    const fuelKey = item.vehicle?.fuel?.key || item.vehicle?.fuel || item.fuelCategory?.key || item.fuel?.key || '';
    const brandstof = BRANDSTOF_MAP[fuelKey] || (typeof fuelKey === 'string' ? fuelKey : '') || '';

    // Afbeelding
    const imgs = item.images || item.pictures || [];
    const imgRaw = imgs[0]?.url || imgs[0]?.src || imgs[0] || '';
    const imgSrc = typeof imgRaw === 'string' ? imgRaw : '';

    results.push({
      id,
      bron: 'AutoScout24',
      titel: (() => {
        const sv = v => typeof v === 'string' ? v : (v?.label || v?.value || v?.key || v?.name || '');
        const mk = sv(item.vehicle?.make) || sv(item.make) || '';
        const mo = sv(item.vehicle?.model) || sv(item.model) || '';
        const va = sv(item.vehicle?.variant) || sv(item.vehicle?.version) || sv(item.version) || '';
        if (mk) return `${mk} ${mo} ${va}`.trim().substring(0, 80);
        // Fallback: from URL slug
        const slug = (item.url || '').replace(/.*\/aanbod\//, '').split('cat_')[0].replace(/-+$/, '');
        return slug.split('-').slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim().substring(0, 80);
      })(),
      prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : Math.round(prijs),
      jaar: item.firstRegistrationYear || item.vehicle?.firstRegistrationYear || item.registrationYear || (item.firstRegistration ? parseInt(String(item.firstRegistration).slice(0,4)) : null) || null,
      km: (() => { const v = item.vehicle?.mileageInKm ?? item.mileageInKm ?? item.mileage; if (v == null) return null; return typeof v === 'number' ? Math.round(v) : parseInt(String(v).replace(/[^0-9]/g,'')); })(),
      brandstof,
      carrosserie: item.vehicle?.bodyType?.key || item.vehicle?.bodyType || item.bodyType?.key || item.bodyType || '',
      transmissie: item.vehicle?.transmission?.key || item.vehicle?.transmission || item.gear?.key || item.transmission?.key || '',
      kleur: item.color?.key || item.color || '',
      locatie: (() => { const c = item.location?.city || item.seller?.address?.city || ''; return c ? c.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ') : 'Nederland'; })(),
      url,
      imgSrc,
      imgs: (item.images || item.pictures || []).slice(0, 10).map(img => { const r = img?.url || img?.src || img || ''; return typeof r === 'string' ? r : ''; }).filter(Boolean),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// Ã¢ÂÂÃ¢ÂÂ AUTOTRADER Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// autotrader.nl Ã¢ÂÂ JSON-LD schema.org + __NEXT_DATA__ fallback

const ATR_URLS = [
  // Algemeen aanbod
  'https://www.autotrader.nl/occasion/',
  'https://www.autotrader.nl/occasion/?pagina=2',
  'https://www.autotrader.nl/occasion/?pagina=3',
  // Elektrisch
  'https://www.autotrader.nl/occasion/?brandstof=elektrisch',
  'https://www.autotrader.nl/occasion/?brandstof=elektrisch&pagina=2',
  // Hybride
  'https://www.autotrader.nl/occasion/?brandstof=hybride',
  'https://www.autotrader.nl/occasion/?brandstof=hybride&pagina=2',

  // Jeep
  'https://www.autotrack.nl/tweedehands-auto/jeep/',
  'https://www.autotrack.nl/tweedehands-auto/jeep/?pagina=2',
  // Alfa Romeo
  'https://www.autotrack.nl/tweedehands-auto/alfa-romeo/',
  'https://www.autotrack.nl/tweedehands-auto/alfa-romeo/?pagina=2',
  // Suzuki
  'https://www.autotrack.nl/tweedehands-auto/suzuki/',
  'https://www.autotrack.nl/tweedehands-auto/suzuki/?pagina=2',
  // Mitsubishi
  'https://www.autotrack.nl/tweedehands-auto/mitsubishi/',
  'https://www.autotrack.nl/tweedehands-auto/mitsubishi/?pagina=2',
  // Cupra
  'https://www.autotrack.nl/tweedehands-auto/cupra/',
  'https://www.autotrack.nl/tweedehands-auto/cupra/?pagina=2',
  // MG
  'https://www.autotrack.nl/tweedehands-auto/mg/',
  'https://www.autotrack.nl/tweedehands-auto/mg/?pagina=2',
  // Polestar
  'https://www.autotrack.nl/tweedehands-auto/polestar/',
  // Jaguar
  'https://www.autotrack.nl/tweedehands-auto/jaguar/',
  'https://www.autotrack.nl/tweedehands-auto/jaguar/?pagina=2',
  // Subaru
  'https://www.autotrack.nl/tweedehands-auto/subaru/',
  'https://www.autotrack.nl/tweedehands-auto/subaru/?pagina=2',
  // Lexus
  'https://www.autotrack.nl/tweedehands-auto/lexus/',
  'https://www.autotrack.nl/tweedehands-auto/lexus/?pagina=2',
  // BYD
  'https://www.autotrack.nl/tweedehands-auto/byd/',
  // Smart
  'https://www.autotrack.nl/tweedehands-auto/smart/',
  'https://www.autotrack.nl/tweedehands-auto/smart/?pagina=2',
  // DS
  'https://www.autotrack.nl/tweedehands-auto/ds/',
  'https://www.autotrack.nl/tweedehands-auto/ds/?pagina=2',
];

async function scrapeAutoTrader() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < ATR_URLS.length; i++) {
    const url = ATR_URLS[i];
    const label = `ATR p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_ATR });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoTrader(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw Ã¢ÂÂ totaal ATR ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < ATR_URLS.length - 1) await sleep(6000);
  }

  // Jeep extra
  for (let i = 0; i < MP_JEEP_OFFSETS.length; i++) {
    const url = MP_JEEP_BASE + '&offset=' + MP_JEEP_OFFSETS[i];
    const label = 'MP Jeep p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_JEEP_OFFSETS.length - 1) await sleep(4000);
  }

  // Alfa Romeo extra
  for (let i = 0; i < MP_ALFA_ROMEO_OFFSETS.length; i++) {
    const url = MP_ALFA_ROMEO_BASE + '&offset=' + MP_ALFA_ROMEO_OFFSETS[i];
    const label = 'MP Alfa Romeo p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_ALFA_ROMEO_OFFSETS.length - 1) await sleep(4000);
  }

  // Suzuki extra
  for (let i = 0; i < MP_SUZUKI_OFFSETS.length; i++) {
    const url = MP_SUZUKI_BASE + '&offset=' + MP_SUZUKI_OFFSETS[i];
    const label = 'MP Suzuki p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_SUZUKI_OFFSETS.length - 1) await sleep(4000);
  }

  // Mitsubishi extra
  for (let i = 0; i < MP_MITSUBISHI_OFFSETS.length; i++) {
    const url = MP_MITSUBISHI_BASE + '&offset=' + MP_MITSUBISHI_OFFSETS[i];
    const label = 'MP Mitsubishi p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_MITSUBISHI_OFFSETS.length - 1) await sleep(4000);
  }

  // Cupra extra
  for (let i = 0; i < MP_CUPRA_OFFSETS.length; i++) {
    const url = MP_CUPRA_BASE + '&offset=' + MP_CUPRA_OFFSETS[i];
    const label = 'MP Cupra p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_CUPRA_OFFSETS.length - 1) await sleep(4000);
  }

  // MG extra
  for (let i = 0; i < MP_MG_OFFSETS.length; i++) {
    const url = MP_MG_BASE + '&offset=' + MP_MG_OFFSETS[i];
    const label = 'MP MG p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_MG_OFFSETS.length - 1) await sleep(4000);
  }

  // Polestar extra
  for (let i = 0; i < MP_POLESTAR_OFFSETS.length; i++) {
    const url = MP_POLESTAR_BASE + '&offset=' + MP_POLESTAR_OFFSETS[i];
    const label = 'MP Polestar p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_POLESTAR_OFFSETS.length - 1) await sleep(4000);
  }

  // Jaguar extra
  for (let i = 0; i < MP_JAGUAR_OFFSETS.length; i++) {
    const url = MP_JAGUAR_BASE + '&offset=' + MP_JAGUAR_OFFSETS[i];
    const label = 'MP Jaguar p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_JAGUAR_OFFSETS.length - 1) await sleep(4000);
  }

  // Subaru extra
  for (let i = 0; i < MP_SUBARU_OFFSETS.length; i++) {
    const url = MP_SUBARU_BASE + '&offset=' + MP_SUBARU_OFFSETS[i];
    const label = 'MP Subaru p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_SUBARU_OFFSETS.length - 1) await sleep(4000);
  }

  // Lexus extra
  for (let i = 0; i < MP_LEXUS_OFFSETS.length; i++) {
    const url = MP_LEXUS_BASE + '&offset=' + MP_LEXUS_OFFSETS[i];
    const label = 'MP Lexus p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_LEXUS_OFFSETS.length - 1) await sleep(4000);
  }

  // BYD extra
  for (let i = 0; i < MP_BYD_OFFSETS.length; i++) {
    const url = MP_BYD_BASE + '&offset=' + MP_BYD_OFFSETS[i];
    const label = 'MP BYD p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_BYD_OFFSETS.length - 1) await sleep(4000);
  }

  // Smart extra
  for (let i = 0; i < MP_SMART_OFFSETS.length; i++) {
    const url = MP_SMART_BASE + '&offset=' + MP_SMART_OFFSETS[i];
    const label = 'MP Smart p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_SMART_OFFSETS.length - 1) await sleep(4000);
  }

  // DS extra
  for (let i = 0; i < MP_DS_OFFSETS.length; i++) {
    const url = MP_DS_BASE + '&offset=' + MP_DS_OFFSETS[i];
    const label = 'MP DS p' + (i+1);
    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const items = json.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(label + ': ' + found.length + ' nieuw');
    } catch (e) { console.log(label + ': fout - ' + e.message); }
    if (i < MP_DS_OFFSETS.length - 1) await sleep(4000);
  }

  return all;
}

function parseerAutoTrader(html, gezien, label) {
  const results = [];

  // Poging 1: JSON-LD ItemList (schema.org)
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let items = [];

  for (const block of ldBlocks) {
    try {
      const d = JSON.parse(block[1]);
      if (d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
        items = d.itemListElement.map(e => e.item || e).filter(Boolean);
        console.log(` ${label}: ${items.length} JSON-LD items`);
        break;
      }
      // Array van Car-objecten
      if (Array.isArray(d) && (d[0]?.['@type'] === 'Car' || d[0]?.['@type'] === 'Vehicle')) {
        items = d;
        console.log(` ${label}: ${items.length} Car/Vehicle items`);
        break;
      }
    } catch (e) { /* doorgaan */ }
  }

  if (items.length > 0) {
    for (const item of items) {
      const rawUrl = item.url || item['@id'] || '';
      if (!rawUrl) continue;
      const url = rawUrl.startsWith('http') ? rawUrl : 'https://www.autotrader.nl' + rawUrl;
      if (gezien.has(url)) continue;
      gezien.add(url);

      const idM = url.match(/\/(\d{5,})\/?$/);
      const id = 'atr-' + (idM ? idM[1] : url.split('/').filter(Boolean).pop());
      if (!id) continue;

      const prijs = item.offers?.price || item.price || 0;
      if (!prijs || prijs < 500 || prijs > 500000) continue;

      const kmRaw = item.mileageFromOdometer?.value ?? item.mileage ?? null;
      const km = kmRaw ? parseInt(String(kmRaw).replace(/[^\d]/g, '')) : null;

      const yearRaw = item.productionDate || item.modelDate || '';
      const yearM = String(yearRaw).match(/\b(19|20)\d{2}\b/);
      const jaar = yearM ? parseInt(yearM[0]) : null;

      const imgRaw = (Array.isArray(item.image) ? item.image[0] : item.image) || '';

      results.push({
        id,
        bron: 'AutoTrader',
        titel: (item.name || '').substring(0, 80),
        prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : prijs,
        jaar,
        km,
        brandstof: item.fuelType || '',
        carrosserie: item.bodyType || '',
        transmissie: item.vehicleTransmission || '',
        kleur: item.color || '',
        locatie: item.offers?.seller?.address?.addressLocality || 'Nederland',
        url,
        imgSrc: typeof imgRaw === 'string' ? imgRaw : '',
        imgs: (Array.isArray(item.image) ? item.image : (item.image ? [item.image] : [])).slice(0, 10).map(u => typeof u === 'string' ? u : '').filter(Boolean),
        bijgewerkt: new Date().toISOString().split('T')[0]
      });
    }
    return results;
  }

  // Poging 2: __NEXT_DATA__
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]);
      const pp = data?.props?.pageProps;
      const listings =
        pp?.listings ||
        pp?.vehicles ||
        pp?.searchResult?.listings ||
        pp?.cars ||
        [];

      console.log(` ${label}: ${listings.length} items via __NEXT_DATA__`);

      for (const item of listings) {
        const id = 'atr-' + (item.id || item.slug || '');
        if (!id || id === 'atr-' || gezien.has(id)) continue;
        gezien.add(id);

        const prijs = item.price?.amount || item.price || item.prijs || 0;
        if (!prijs || prijs < 500 || prijs > 500000) continue;

        const relUrl = item.url || item.slug || '';
        const url = relUrl.startsWith('http') ? relUrl : 'https://www.autotrader.nl' + relUrl;
        const imgs = item.images || item.photos || [];
        const imgSrc = imgs[0]?.url || imgs[0] || '';

        results.push({
          id,
          bron: 'AutoTrader',
          titel: (item.title || item.name || `${item.make || ''} ${item.model || ''}`).trim().substring(0, 80),
          prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : prijs,
          jaar: item.year || item.registrationYear || null,
          km: item.mileage || item.km || null,
          brandstof: item.fuel || item.fuelType || '',
          carrosserie: item.bodyType || item.body || '',
          transmissie: item.transmission || item.gearbox || '',
          kleur: item.color || item.kleur || '',
          locatie: item.city || item.location?.city || 'Nederland',
          url,
          imgSrc: typeof imgSrc === 'string' ? imgSrc : '',
          imgs: (item.images || item.photos || []).slice(0, 10).map(function(i) { const u = i?.url || i || ''; return typeof u === 'string' ? u : ''; }).filter(Boolean),
          bijgewerkt: new Date().toISOString().split('T')[0]
        });
      }
    } catch (e) {
      console.log(` ${label}: __NEXT_DATA__ parse fout - ${e.message}`);
    }
  }

  if (results.length === 0) {
    console.log(` ${label}: geen data gevonden (${html.length} chars HTML)`);
  }

  return results;
}

// Ã¢ÂÂÃ¢ÂÂ MAIN Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

async function main() {
  console.log('Ã°ÂÂÂ Scraper gestart:', new Date().toISOString());

  console.log('\nÃ°ÂÂÂ¦ Marktplaats (algemeen + EV)...');
  const mpListings = await scrapeMarktplaats();
  console.log(`Ã¢ÂÂ Marktplaats: ${mpListings.length} listings`);

  console.log('\nÃ¢ÂÂ½ Gaspedaal (algemeen + elektrisch)...');
  const gpListings = await scrapeGaspedaal();
  console.log(`Ã¢ÂÂ Gaspedaal: ${gpListings.length} listings`);

  console.log('\nÃ°ÂÂÂ·Ã¯Â¸Â viaBOVAG (algemeen + elektrisch)...');
  const vbListings = await scrapeViaBovag();
  console.log(`Ã¢ÂÂ viaBOVAG: ${vbListings.length} listings`);

  console.log('\nÃ¢ÂÂ¡ AutoTrack (algemeen + hybride + elektrisch)...');
  const atListings = await scrapeAutoTrack();
  console.log(`Ã¢ÂÂ AutoTrack: ${atListings.length} listings`);

  console.log('\nÃ°ÂÂÂ AutoScout24 (algemeen + EV + hybride)...');
  const as24Listings = await scrapeAutoScout24();
  console.log(`Ã¢ÂÂ AutoScout24: ${as24Listings.length} listings`);

  console.log('\nÃ°ÂÂÂ AutoTrader (algemeen + EV + hybride)...');
  const atrListings = await scrapeAutoTrader();
  console.log(`Ã¢ÂÂ AutoTrader: ${atrListings.length} listings`);

  const nieuw = [...mpListings, ...gpListings, ...vbListings, ...atListings, ...as24Listings, ...atrListings];
  console.log(`\nÃ°ÂÂÂ Vandaag gescrapt: ${nieuw.length} listings`);

  // Ã¢ÂÂÃ¢ÂÂ Bestaande listings inladen en samenvoegen Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  const byId = {};

  try {
    const bestaand = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    for (const l of (bestaand.listings || [])) byId[l.id] = l;
    console.log(`Ã°ÂÂÂ Bestaand: ${Object.keys(byId).length} listings geladen`);
  } catch (e) {
    console.log(`Ã°ÂÂÂ Geen bestaand bestand, begin vers`);
  }

  for (const l of nieuw) {
      const prev = byId[l.id];
      if (prev && prev.prijs != null && l.prijs != null && prev.prijs !== l.prijs) {
        const hist = prev.prijsHistorie ? [...prev.prijsHistorie] : [];
        hist.push({ datum: prev.bijgewerkt || new Date().toISOString().slice(0,10), prijs: prev.prijs });
        l.prijsHistorie = hist.slice(-5);
        console.log(` ð° Prijswijziging ${l.id}: â¬${prev.prijs} â â¬${l.prijs}`);
      } else if (prev && prev.prijsHistorie) {
        l.prijsHistorie = prev.prijsHistorie;
      }
      byId[l.id] = l;
    }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  let listings = Object.values(byId)
    .filter(l => l.bijgewerkt >= cutoffStr)
    .filter(l => !(l.bron === 'AutoScout24' && !l.titel && !l.prijs));
  // Deduplicatie: verwijder zelfde auto van meerdere platforms
  const _dedupMap = {};
  const _dedupList = [];
  for (const l of listings) {
    if (!l.merk || !l.prijs) { _dedupList.push(l); continue; }
    const _key = [
      (l.merk || "").toLowerCase().replace(/\s+/g, ""),
      l.jaar || 0,
      Math.round((l.km || 0) / 5000) * 5000,
      Math.round((l.prijs || 0) / 500) * 500
    ].join("_");
    const _score = x => (x.brandstof?1:0)+(x.km?1:0)+(x.jaar?1:0)+(x.imgSrc?1:0)+(x.transmissie?1:0);
    if (!_dedupMap[_key]) {
      _dedupMap[_key] = { listing: l, idx: _dedupList.length };
      _dedupList.push(l);
    } else if (_score(l) > _score(_dedupMap[_key].listing)) {
      _dedupList[_dedupMap[_key].idx] = l;
      _dedupMap[_key].listing = l;
    }
  }
  const _dupCount = listings.length - _dedupList.length;
  if (_dupCount > 0) console.log(` ð  ${_dupCount} duplicaten verwijderd`);
  listings = _dedupList;


  const verwijderd = Object.keys(byId).length - listings.length;
  if (verwijderd > 0) console.log(`Ã°ÂÂÂÃ¯Â¸Â  ${verwijderd} verlopen listings verwijderd (>30 dagen)`);

  console.log(`Ã°ÂÂÂ Totaal na merge: ${listings.length} listings`);

  const data = {
    bijgewerkt: new Date().toISOString(),
    totaal: listings.length,
    bronnen: [...new Set(listings.map(l => l.bron))],
    listings
  };

    const bronStats = {};
  for (const l of nieuw) { const b = l.bron || 'Onbekend'; bronStats[b] = (bronStats[b] || 0) + 1; }
  const rapport = { timestamp: new Date().toISOString(), totaalNieuw: nieuw.length, bronnen: bronStats };
  const rapportPad = path.join(__dirname, '..', 'data', 'scrape-report.json');
  fs.writeFileSync(rapportPad, JSON.stringify(rapport, null, 2));
  console.log('\nð Scraper rapport:');
  for (const [bron, n] of Object.entries(bronStats)) console.log(`   ${bron.padEnd(14)}: ${n} listings`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rijen = Object.entries(bronStats).map(([b,n]) => `| ${b} | ${n} |`).join('\n');
    const summary = ['## ð Scraper Rapport', `**${rapport.timestamp.slice(0,10)}** â ${nieuw.length} listings vandaag`, '', '| Bron | Listings |', '|------|----------|', rijen, '', `**Totaal in database:** ${Object.keys(byId).length}`].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  // ── Sitemap genereren ──
  const _merken = [...new Set((data.listings||[]).map(l => l.merk).filter(Boolean))].sort();
  const _today = new Date().toISOString().slice(0,10);
  const _BASE = 'https://kawsfan.github.io/autovergelijker/';
  const _urlTags = _merken.map(m =>
    '  <url>\n    <loc>' + _BASE + '?merk=' + encodeURIComponent(m.toLowerCase()) +
    '</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n    <lastmod>' + _today + '</lastmod>\n  </url>'
  ).join('\n');
  const _sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>' + _BASE + '</loc>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '    <lastmod>' + _today + '</lastmod>',
    '  </url>',
    _urlTags,
    '</urlset>'
  ].join('\n');
  const _sitemapPad = path.join(process.cwd(), 'sitemap.xml');
  fs.writeFileSync(_sitemapPad, _sitemap);
  console.log('\u{1F5FA}\uFE0F  Sitemap: ' + _merken.length + ' merken → ' + _sitemapPad);

  // ── Marktstatistieken bijwerken ──
  try {
    const _mhPath = path.join(process.cwd(), 'data', 'markt-history.json');
    const _today = new Date().toISOString().slice(0, 10);
    const _segMap = {};
    for (const l of (data.listings || [])) {
      if (!l.merk || !l.prijs || l.prijs < 500 || l.prijs > 300000) continue;
      const _key = (l.merk + (l.model ? '_' + l.model : '')).toLowerCase().replace(/\\s+/g, '_');
      if (!_segMap[_key]) _segMap[_key] = [];
      _segMap[_key].push(l.prijs);
    }
    const _segStats = {};
    for (const [k, pp] of Object.entries(_segMap)) {
      if (pp.length < 3) continue;
      pp.sort((a, b) => a - b);
      const avg = Math.round(pp.reduce((s, p) => s + p, 0) / pp.length);
      const med = pp[Math.floor(pp.length / 2)];
      _segStats[k] = { n: pp.length, avg, med, min: pp[0], max: pp[pp.length - 1],
        p25: pp[Math.floor(pp.length * 0.25)], p75: pp[Math.floor(pp.length * 0.75)] };
    }
    let _mhData = [];
    try { _mhData = JSON.parse(fs.readFileSync(_mhPath, 'utf8')); } catch(e) {}
    _mhData = _mhData.filter(d => d.datum !== _today);
    _mhData.push({ datum: _today, segmenten: _segStats });
    if (_mhData.length > 365) _mhData = _mhData.slice(-365);
    fs.writeFileSync(_mhPath, JSON.stringify(_mhData));
    console.log(`📊  Markthistorie: ${Object.keys(_segStats).length} segmenten → ${_mhPath}`);
  } catch (_mhErr) { console.warn('⚠️  Markthistorie fout:', _mhErr.message); }

  console.log(`Ã¢ÂÂ Opgeslagen naar ${outPath}`);
}

main().catch(e => { console.error('Ã¢ÂÂ Fout:', e); process.exit(1); });
