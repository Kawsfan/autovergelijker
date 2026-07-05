// scripts/scrape.js - AutoVergelijker dagelijkse scraper
// Bronnen: Marktplaats + Gaspedaal + viaBOVAG + AutoTrack + AutoScout24 + AutoTrader

const fs = require('fs');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── HEADERS ───────────────────────────────────────────────────────────────────

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

// ── MARKTPLAATS ───────────────────────────────────────────────────────────────

const MP_API_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100';
const MP_OFFSETS = [0, 100, 200];
const MP_EV_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=elektrisch';
const MP_EV_OFFSETS = [0, 100, 200];

async function scrapeMarktplaats() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < MP_OFFSETS.length; i++) {
    const url = MP_API_BASE + '&offset=' + MP_OFFSETS[i];
    const label = `MP p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_MP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = data.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal MP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    await sleep(3000);
  }

  for (let i = 0; i < MP_EV_OFFSETS.length; i++) {
    const url = MP_EV_BASE + '&offset=' + MP_EV_OFFSETS[i];
    const label = `MP EV p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_MP });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = data.listings || [];
      const found = parseerMPItems(items, gezien);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal MP ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < MP_EV_OFFSETS.length - 1) await sleep(4000);
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

// ── GASPEDAAL ─────────────────────────────────────────────────────────────────

const GP_URLS = [
  'https://www.gaspedaal.nl/zoeken?srt=df-a',
  'https://www.gaspedaal.nl/zoeken?srt=df-a&p=2',
  'https://www.gaspedaal.nl/elektrisch',
  'https://www.gaspedaal.nl/elektrisch?p=2',
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
      imgs: item.image ? [item.image] : [],
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

  const allUrlMatches = [...html.matchAll(/href="(\/auto\/aanbod\/[^"]+)"/g)];
  const uniqueUrls = [...new Set(allUrlMatches.map(m => m[1]))];
  console.log(` ${label}: ${uniqueUrls.length} unieke auto-URLs`);

  for (const relUrl of uniqueUrls) {
    const idCode = (relUrl.match(/([a-z0-9]{7})$/) || [])[1];
    if (!idCode) continue;
    const id = 'vb-' + idCode;
    if (gezien.has(id)) continue;

    const startIdx = html.indexOf(`href="${relUrl}"`);
    if (startIdx < 0) continue;
    const afterThis = html.indexOf('/auto/aanbod/', startIdx + relUrl.length + 10);
    const windowEnd = afterThis > 0 ? Math.min(afterThis + 50, startIdx + 5000) : startIdx + 5000;
    const chunk = html.substring(startIdx, windowEnd);

    const priceM = chunk.match(/([\d]+\.[\d]+),-|([\d]+),-/);
    const prijs = priceM ? parseInt((priceM[1] || priceM[2]).replace(/\./g, '')) : 0;
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    const titleM = chunk.match(/<h[2-4][^>]*>([^<]{3,60})<\/h[2-4]>/);
    const slugTitle = relUrl
      .replace(/\/auto\/aanbod\//, '')
      .replace(/-[a-z0-9]{7}$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .substring(0, 80);
    const titel = titleM ? titleM[1].trim().substring(0, 80) : slugTitle;

    const kmM = chunk.match(/([\d]+\.[\d]+|[\d]+)\s*km\b/i);
    const km = kmM ? parseInt(kmM[1].replace(/\./g, '')) : null;

    const yearM = chunk.match(/\b\d{2}-(20\d{2})\b/);
    const jaar = yearM ? parseInt(yearM[1]) : null;

    const bsM = chunk.match(/\b(Benzine|Diesel|Elektrisch|Hybride|LPG|Waterstof)\b/i);
    const brandstof = bsM ? bsM[1] : '';

    const imgM = chunk.match(/https:\/\/stsharedprdweu\.blob\.core\.windows\.net\/vehicles-media\/[^"'\s>]+/);
    const imgSrc = imgM ? imgM[0] : '';

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
      imgs: imgSrc ? [imgSrc] : [],
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ── AUTOTRACK ─────────────────────────────────────────────────────────────────
// Uitgebreid: algemeen + hybride + elektrisch

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
];

async function scrapeAutoTrack() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < AT_URLS.length; i++) {
    const url = AT_URLS[i];
    const label = `AT p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_AT });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoTrack(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal AT ${all.length}`);
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

// ── AUTOSCOUT24 ───────────────────────────────────────────────────────────────
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
];

async function scrapeAutoScout24() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < AS24_URLS.length; i++) {
    const url = AS24_URLS[i];
    const label = `AS24 p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_AS24 });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoScout24(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal AS24 ${all.length}`);
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

  // Navigeer naar listings — AutoScout24 wisselt soms van structuur
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

  const results = [];
  for (const item of listings) {
    const id = 'as24-' + (item.id || item.guid || '');
    if (!id || id === 'as24-' || gezien.has(id)) continue;
    gezien.add(id);

    // Prijs kan op meerdere plekken staan
    const prijsRaw =
      item.prices?.publicPrice?.priceRaw ||
      item.prices?.publicPrice?.value ||
      item.vehicle?.prices?.publicPrice?.priceRaw ||
      item.vehicle?.price?.amount ||
      item.price?.amount ||
      (typeof item.price === 'number' ? item.price : 0);
    const prijs = typeof prijsRaw === 'number' ? Math.round(prijsRaw) :
                  typeof prijsRaw === 'string' ? parseInt(prijsRaw.replace(/[^\d]/g,'')) : 0;
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    const relUrl = item.url || item.detailPageUrl || '';
    const url = relUrl.startsWith('http') ? relUrl : 'https://www.autoscout24.nl' + relUrl;

    const fuelKey = item.fuelCategory?.key || item.fuel?.key || '';
    const brandstof = BRANDSTOF_MAP[fuelKey] || fuelKey || '';

    // Afbeelding
    const imgs = item.images || item.pictures || [];
    const imgRaw = imgs[0]?.url || imgs[0]?.src || imgs[0] || '';
    const imgSrc = typeof imgRaw === 'string' ? imgRaw : '';

    results.push({
      id,
      bron: 'AutoScout24',
      titel: (() => {
        const mk = item.make || item.vehicle?.make || '';
        const mo = item.model || item.vehicle?.model || '';
        const ve = item.version || item.vehicle?.version || '';
        if (mk) return `${mk} ${mo} ${ve}`.trim().substring(0, 80);
        const slug = (item.url || item.detailPageUrl || '').replace(/.*\/aanbod\//, '').replace(/-$/, '');
        const pts = slug.split('-');
        return `${pts[0]||''} ${pts[1]||''}`.replace(/\b\w/g, c => c.toUpperCase()).trim().substring(0, 80);
      })(),
      prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : Math.round(prijs),
      jaar: item.firstRegistrationYear || item.registrationYear || null,
      km: item.mileageInKm || item.mileage || null,
      brandstof,
      carrosserie: item.bodyType?.key || item.bodyType || '',
      transmissie: item.gear?.key || item.transmission?.key || '',
      kleur: item.color?.key || item.color || '',
      locatie: item.location?.city || item.seller?.address?.city || 'Nederland',
      url,
      imgSrc,
      imgs: (item.images || item.pictures || []).slice(0, 10).map(img => { const r = img?.url || img?.src || img || ''; return typeof r === 'string' ? r : ''; }).filter(Boolean),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ── AUTOTRADER ────────────────────────────────────────────────────────────────
// autotrader.nl — JSON-LD schema.org + __NEXT_DATA__ fallback

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
];

async function scrapeAutoTrader() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < ATR_URLS.length; i++) {
    const url = ATR_URLS[i];
    const label = `ATR p${i + 1}`;
    try {
      const resp = await fetch(url, { headers: HEADERS_ATR });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoTrader(html, gezien, label);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw → totaal ATR ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < ATR_URLS.length - 1) await sleep(6000);
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

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚗 Scraper gestart:', new Date().toISOString());

  console.log('\n📦 Marktplaats (algemeen + EV)...');
  const mpListings = await scrapeMarktplaats();
  console.log(`✓ Marktplaats: ${mpListings.length} listings`);

  console.log('\n⛽ Gaspedaal (algemeen + elektrisch)...');
  const gpListings = await scrapeGaspedaal();
  console.log(`✓ Gaspedaal: ${gpListings.length} listings`);

  console.log('\n🏷️ viaBOVAG (algemeen + elektrisch)...');
  const vbListings = await scrapeViaBovag();
  console.log(`✓ viaBOVAG: ${vbListings.length} listings`);

  console.log('\n⚡ AutoTrack (algemeen + hybride + elektrisch)...');
  const atListings = await scrapeAutoTrack();
  console.log(`✓ AutoTrack: ${atListings.length} listings`);

  console.log('\n🔍 AutoScout24 (algemeen + EV + hybride)...');
  const as24Listings = await scrapeAutoScout24();
  console.log(`✓ AutoScout24: ${as24Listings.length} listings`);

  console.log('\n🚘 AutoTrader (algemeen + EV + hybride)...');
  const atrListings = await scrapeAutoTrader();
  console.log(`✓ AutoTrader: ${atrListings.length} listings`);

  const nieuw = [...mpListings, ...gpListings, ...vbListings, ...atListings, ...as24Listings, ...atrListings];
  console.log(`\n🆕 Vandaag gescrapt: ${nieuw.length} listings`);

  // ── Bestaande listings inladen en samenvoegen ─────────────────────────────
  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  const byId = {};

  try {
    const bestaand = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    for (const l of (bestaand.listings || [])) byId[l.id] = l;
    console.log(`📂 Bestaand: ${Object.keys(byId).length} listings geladen`);
  } catch (e) {
    console.log(`📂 Geen bestaand bestand, begin vers`);
  }

  for (const l of nieuw) byId[l.id] = l;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const listings = Object.values(byId).filter(l => l.bijgewerkt >= cutoffStr);

  const verwijderd = Object.keys(byId).length - listings.length;
  if (verwijderd > 0) console.log(`🗑️  ${verwijderd} verlopen listings verwijderd (>30 dagen)`);

  console.log(`📊 Totaal na merge: ${listings.length} listings`);

  const data = {
    bijgewerkt: new Date().toISOString(),
    totaal: listings.length,
    bronnen: [...new Set(listings.map(l => l.bron))],
    listings
  };

  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Opgeslagen naar ${outPath}`);
}

main().catch(e => { console.error('❌ Fout:', e); process.exit(1); });
