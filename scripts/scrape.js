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
        console.log(`    ÃÂ¢ÃÂÃÂ» HTTP ${resp.status} ÃÂ¢ÃÂÃÂ retry ${poging}/${maxPogingen - 1} (wacht ${wacht/1000}s)...`);
        await sleep(wacht);
      } else {
        console.log(`    ÃÂ¢ÃÂÃÂ HTTP ${resp.status} na ${maxPogingen} pogingen: ${url.slice(0,80)}`);
        return resp;
      }
    } catch (err) {
      if (poging < maxPogingen) {
        const wacht = poging * 2000;
        console.log(`    ÃÂ¢ÃÂÃÂ» Fout (${err.message}) ÃÂ¢ÃÂÃÂ retry ${poging}/${maxPogingen - 1} (wacht ${wacht/1000}s)...`);
        await sleep(wacht);
      } else {
        console.log(`    ÃÂ¢ÃÂÃÂ Opgegeven na ${maxPogingen} pogingen: ${err.message}`);
        throw err;
      }
    }
  }
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ HEADERS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

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

const HEADERS_AW = {
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

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ MARKTPLAATS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

const MP_API_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100';
const MP_OFFSETS = Array.from({length:10},(_,i)=>i*100);
const MP_EV_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=elektrisch';
const MP_EV_OFFSETS = [0, 100, 200];

const MP_TESLA_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=tesla';
const MP_TESLA_OFFSETS = [0, 100, 200, 300, 400];
const MP_FORD_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=ford+mach-e';
const MP_FORD_OFFSETS = [0, 100, 200];
const MP_FORD_EXPLORER_BASE = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=ford+explorer+elektrisch';
const MP_FORD_EXPLORER_OFFSETS = [0, 100];
// Merk-specifieke Marktplaats-queries: elke entry een eigen, onafhankelijke
// zoekopdracht (dus met een eigen ~1.000-resultaten-budget bij Marktplaats'
// zoek-API -- zie MP_OFFSETS hierboven, die budget zit voor de algemene
// query al vol). offsets bepaalt hoe diep we die eigen 1.000 in gaan.
//
// MP_MIDDEN_DIEPTE (5 offsets = tot 500 resultaten) i.p.v. meteen de volle
// MP_VOLLE_DIEPTE (10 offsets = tot 1.000): elke offset is 1 extra request +
// sleep, en met 35 merken hieronder telt dat snel op in workflow-runtime.
// Bewuste tussenstap -- na de eerstvolgende run(s) is aan scrape-report.json
// per merk te zien welke query's tegen hun 500-limiet aanlopen (dus meer
// aanbod laten liggen) en die kunnen gericht naar MP_VOLLE_DIEPTE.
//
// Twee groepen, samengevoegd 2 sep n.a.v. sessie-analyse ("waarom stokt het
// totaal aanbod rond 22-24k"):
// - De eerste 13 (Jeep t/m DS) bestonden al, maar stonden op maar 200 van
//   hun beschikbare 1.000 (offsets [0,100]) -- gratis winst op bewezen
//   werkende queries, nu naar MP_MIDDEN_DIEPTE getrokken.
// - De overige 22 (Volkswagen t/m Ford) zijn nieuw: de grootste merken in
//   Nederland, die tot nu toe GEEN eigen query hadden en dus volledig
//   afhankelijk waren van de algemene query -- die al aan de eigen
//   1.000-resultatenlimiet van Marktplaats vastzit. Dit is de belangrijkste
//   hefboom om het totale aanbod voorbij het huidige plafond te krijgen.
const MP_VOLLE_DIEPTE = Array.from({length:10},(_,i)=>i*100);
const MP_MIDDEN_DIEPTE = [0, 100, 200, 300, 400];
const MP_MERK_QUERIES = [
  { naam: 'Jeep', query: 'jeep' },
  { naam: 'Alfa Romeo', query: 'alfa+romeo' },
  { naam: 'Suzuki', query: 'suzuki' },
  { naam: 'Mitsubishi', query: 'mitsubishi' },
  { naam: 'Cupra', query: 'cupra' },
  { naam: 'MG', query: 'mg' },
  { naam: 'Polestar', query: 'polestar' },
  { naam: 'Jaguar', query: 'jaguar' },
  { naam: 'Subaru', query: 'subaru' },
  { naam: 'Lexus', query: 'lexus' },
  { naam: 'BYD', query: 'byd' },
  { naam: 'Smart', query: 'smart' },
  { naam: 'DS', query: 'ds' },
  { naam: 'Volkswagen', query: 'volkswagen' },
  { naam: 'BMW', query: 'bmw' },
  { naam: 'Toyota', query: 'toyota' },
  { naam: 'Audi', query: 'audi' },
  { naam: 'Peugeot', query: 'peugeot' },
  { naam: 'Renault', query: 'renault' },
  { naam: 'Hyundai', query: 'hyundai' },
  { naam: 'Kia', query: 'kia' },
  { naam: 'Volvo', query: 'volvo' },
  { naam: 'Skoda', query: 'skoda' },
  { naam: 'Mercedes-Benz', query: 'mercedes-benz' },
  { naam: 'Seat', query: 'seat' },
  { naam: 'Opel', query: 'opel' },
  { naam: 'Fiat', query: 'fiat' },
  { naam: 'Honda', query: 'honda' },
  { naam: 'Mazda', query: 'mazda' },
  { naam: 'Nissan', query: 'nissan' },
  { naam: 'Dacia', query: 'dacia' },
  { naam: 'Mini', query: 'mini' },
  { naam: 'Land Rover', query: 'land+rover' },
  { naam: 'Porsche', query: 'porsche' },
  // Algemeen Ford (Focus/Fiesta/Puma/Kuga e.d.) -- MP_FORD_BASE hierboven is
  // specifiek de Mach-E-EV-query, dekt de rest van het merk niet.
  { naam: 'Ford', query: 'ford' },
];

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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal MP ${all.length}`);
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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal MP ${all.length}`);
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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal MP ${all.length}`);
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

  // Merk-specifieke queries (zie MP_MERK_QUERIES hierboven) -- 13 bestaande
  // niche/EV-merken nu dieper (200->500), plus 22 nieuwe mainstream-merken
  // die tot nu toe geen eigen query hadden.
  for (const merk of MP_MERK_QUERIES) {
    const base = 'https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&numberOfResultsPerPage=100&query=' + merk.query;
    for (let i = 0; i < MP_MIDDEN_DIEPTE.length; i++) {
      const url = base + '&offset=' + MP_MIDDEN_DIEPTE[i];
      const label = 'MP ' + merk.naam + ' p' + (i + 1);
      try {
        const res = await fetchWithRetry(url, { headers: HEADERS_MP });
        if (!res.ok) { console.log(label + ': HTTP ' + res.status); continue; }
        const json = await res.json();
        const items = json.listings || [];
        const found = parseerMPItems(items, gezien);
        all.push(...found);
        console.log(label + ': ' + found.length + ' nieuw');
      } catch (e) { console.log(label + ': fout - ' + e.message); }
      if (i < MP_MIDDEN_DIEPTE.length - 1) await sleep(4000);
    }
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
      imgSrc: (item.pictures?.[0] ? (typeof item.pictures[0]==='string' ? item.pictures[0] : (item.pictures[0].extraExtraLargeUrl || item.pictures[0].largeUrl || item.pictures[0].mediumUrl || item.pictures[0].url || '')) : item.imageUrls?.[0]) || '',
      imgs: [...new Set([...(item.imageUrls||[]),...(item.pictures||[]).map(function(p){return typeof p==='string'?p:(p.extraExtraLargeUrl||p.largeUrl||p.mediumUrl||p.url||'')})])].filter(Boolean).slice(0,20),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ GASPEDAAL ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

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

  // Nieuw (2 sep, sessie-analyse "waarom stokt het totaal aanbod"): de
  // grootste merken in Nederland hadden hier tot nu toe geen eigen pad,
  // dus leunden volledig op de algemene /zoeken-query hierboven (die maar
  // 2 pagina's diep gaat). Zelfde bescheiden diepte (2 pagina's) als de
  // bestaande merk-paden hierboven -- bewuste startdiepte, later gericht
  // dieper op basis van scrape-report.json-yield per merk.
  'https://www.gaspedaal.nl/volkswagen',
  'https://www.gaspedaal.nl/volkswagen?p=2',
  'https://www.gaspedaal.nl/bmw',
  'https://www.gaspedaal.nl/bmw?p=2',
  'https://www.gaspedaal.nl/toyota',
  'https://www.gaspedaal.nl/toyota?p=2',
  'https://www.gaspedaal.nl/audi',
  'https://www.gaspedaal.nl/audi?p=2',
  'https://www.gaspedaal.nl/peugeot',
  'https://www.gaspedaal.nl/peugeot?p=2',
  'https://www.gaspedaal.nl/renault',
  'https://www.gaspedaal.nl/renault?p=2',
  'https://www.gaspedaal.nl/hyundai',
  'https://www.gaspedaal.nl/hyundai?p=2',
  'https://www.gaspedaal.nl/kia',
  'https://www.gaspedaal.nl/kia?p=2',
  'https://www.gaspedaal.nl/volvo',
  'https://www.gaspedaal.nl/volvo?p=2',
  'https://www.gaspedaal.nl/skoda',
  'https://www.gaspedaal.nl/skoda?p=2',
  'https://www.gaspedaal.nl/mercedes-benz',
  'https://www.gaspedaal.nl/mercedes-benz?p=2',
  'https://www.gaspedaal.nl/seat',
  'https://www.gaspedaal.nl/seat?p=2',
  'https://www.gaspedaal.nl/opel',
  'https://www.gaspedaal.nl/opel?p=2',
  'https://www.gaspedaal.nl/fiat',
  'https://www.gaspedaal.nl/fiat?p=2',
  'https://www.gaspedaal.nl/honda',
  'https://www.gaspedaal.nl/honda?p=2',
  'https://www.gaspedaal.nl/mazda',
  'https://www.gaspedaal.nl/mazda?p=2',
  'https://www.gaspedaal.nl/nissan',
  'https://www.gaspedaal.nl/nissan?p=2',
  'https://www.gaspedaal.nl/dacia',
  'https://www.gaspedaal.nl/dacia?p=2',
  'https://www.gaspedaal.nl/mini',
  'https://www.gaspedaal.nl/mini?p=2',
  'https://www.gaspedaal.nl/land-rover',
  'https://www.gaspedaal.nl/land-rover?p=2',
  'https://www.gaspedaal.nl/porsche',
  'https://www.gaspedaal.nl/porsche?p=2',
  // Algemeen Ford (Focus/Fiesta/Puma/Kuga e.d.) -- /ford/elektrisch en
  // /ford/mach-e hierboven dekken alleen de EV-varianten.
  'https://www.gaspedaal.nl/ford',
  'https://www.gaspedaal.nl/ford?p=2',
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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal GP ${all.length}`);
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

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ VIABOVAG ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ


function vbUrl(p){ return p===1?'https://www.viabovag.nl/auto/occasion':'https://www.viabovag.nl/auto/occasion'+(p>1?'?pagina='+p:''); }
const VB_URLS = Array.from({length:30},(_,i)=>vbUrl(i+1));

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
      const found = parseerViaBovag(html, gezien, label, i === 0);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal VB ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < VB_URLS.length - 1) await sleep(7000);
  }
  return all;
}

// Next.js App Router/RSC serialiseert server-data als self.__next_f.push
// ([chunkId, "regel1\nregel2\n..."])-aanroepen; elke regel is doorgaans
// "<id>:<payload>" waarbij <payload> ofwel direct geldige JSON is, ofwel
// geldige JSON na een enkel type-letterteken (I=import, H=hint, T=text,
// etc. -- React's eigen Flight-notatie). We reïmplementeren die notatie niet
// volledig; in plaats daarvan zoeken we alle JSON-parseerbare regel-payloads
// af op objecten die op een auto-listing lijken (bevat zowel een prijs- als
// een titel/merk-achtig veld), ongeacht waar ze in de boomstructuur zitten.
function extraheerViaBovagFlightItems(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[\d+,\s*"((?:\\.|[^"\\])*)"\]\)/g)]
    .map(function(m) {
      try { return JSON.parse('"' + m[1] + '"'); } catch (e) { return ''; }
    });

  const gevonden = [];
  const gezienObj = new Set();
  function lijktOpListing(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const laag = Object.keys(v).map(function(k){ return k.toLowerCase(); });
    const heeftPrijs = laag.some(function(k){ return k.includes('price') || k === 'prijs' || k === 'vraagprijs'; });
    const heeftTitel = laag.some(function(k){ return k.includes('title') || k === 'titel' || k.includes('brand') || k === 'merk' || k === 'name' || k === 'naam'; });
    return heeftPrijs && heeftTitel;
  }
  function doorzoek(v, diepte) {
    if (v == null || diepte > 8) return;
    if (typeof v !== 'object') return;
    if (lijktOpListing(v)) {
      const key = JSON.stringify(v).slice(0, 200);
      if (!gezienObj.has(key)) { gezienObj.add(key); gevonden.push(v); }
      return; // niet verder afdalen binnen een gevonden listing-object
    }
    if (Array.isArray(v)) { v.forEach(function(x){ doorzoek(x, diepte + 1); }); return; }
    Object.keys(v).forEach(function(k){ doorzoek(v[k], diepte + 1); });
  }

  chunks.forEach(function(chunkTekst) {
    if (!chunkTekst) return;
    chunkTekst.split('\n').forEach(function(regel) {
      const m = regel.match(/^[0-9a-f]+:(.*)$/i);
      const payload = m ? m[1] : regel;
      // Payload begint met JSON ([ of { of "), evt. na één type-letterteken.
      for (var offset = 0; offset <= 1; offset++) {
        const kandidaat = payload.slice(offset);
        if (!kandidaat || !/^[[{]/.test(kandidaat)) continue;
        try { doorzoek(JSON.parse(kandidaat), 0); break; } catch (e) { /* volgende offset of regel */ }
      }
    });
  });
  return gevonden;
}

// Diagnose voor het paginerings-mysterie uit #97: alle 30 "pagina's"
// (?pagina=2, ?pagina=3, ...) leverden identiek dezelfde 24 resultaten op --
// de nieuwe (RSC-)site lijkt die query-param niet meer server-side te
// respecteren. Zoekt in dezelfde Flight-chunks naar sleutels die op
// paginerings-metadata lijken (totalCount/totalPages/pageSize/currentPage/
// hasNextPage e.d.), zodat uit de eerstvolgende workflow-run-logs blijkt of
// de site dat soort info überhaupt meestuurt (en zo ja, onder welke naam)
// i.p.v. daar blind naar te gissen.
function vindViaBovagPaginaHints(html) {
  const hints = [];
  const patroon = /totalcount|totalpages|totalresults|totalitems|pagesize|currentpage|pagenumber|hasnextpage|resultcount/i;
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[\d+,\s*"((?:\\.|[^"\\])*)"\]\)/g)]
    .map(function(m) { try { return JSON.parse('"' + m[1] + '"'); } catch (e) { return ''; } });
  function doorzoek(v, pad, diepte) {
    if (v == null || diepte > 8 || hints.length >= 20) return;
    if (typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(function(x, i){ doorzoek(x, pad + '[' + i + ']', diepte + 1); }); return; }
    Object.keys(v).forEach(function(k) {
      if (patroon.test(k) && (typeof v[k] === 'number' || typeof v[k] === 'string')) {
        hints.push(pad + '.' + k + '=' + JSON.stringify(v[k]));
      }
      doorzoek(v[k], pad + '.' + k, diepte + 1);
    });
  }
  chunks.forEach(function(chunkTekst) {
    if (!chunkTekst) return;
    chunkTekst.split('\n').forEach(function(regel) {
      const m = regel.match(/^([0-9a-f]+):(.*)$/i);
      const idPrefix = m ? m[1] : '?';
      const payload = m ? m[2] : regel;
      for (var offset = 0; offset <= 1; offset++) {
        const kandidaat = payload.slice(offset);
        if (!kandidaat || !/^[[{]/.test(kandidaat)) continue;
        try { doorzoek(JSON.parse(kandidaat), 'chunk' + idPrefix, 0); break; } catch (e) { /* volgende offset/regel */ }
      }
    });
  });
  return hints;
}

// Paginerings-mysterie (#97/#98) afgesloten: vindViaBovagPaginaHints() vond
// geen paginerings-metadata in de HTML, en ?pagina=N levert altijd dezelfde
// 24 resultaten op. Als laatste poging is ook Next.js' eigen RSC-
// navigatiemechanisme geprobeerd (header "RSC: 1"/"Next-Url", die de kale
// Flight-payload teruggeeft i.p.v. de gecachete HTML) -- de server reageerde
// daar wel op (content-type text/x-component), maar een harde
// overlap-vergelijking in productie (run 33363417581, 31 aug) bevestigde dat
// dit exact dezelfde 24 advertenties zijn: "24/24 identiek aan pagina 1, 0
// ECHT NIEUW" voor beide headervarianten. ViaBovag negeert de paginering dus
// structureel, ook via deze route -- geen verder te proberen spoor zonder
// hun officiële API of live browser-inspectie.
//
// De 24-per-run-limiet blijkt in de praktijk minder erg dan de naam doet
// vermoeden: pagina 1 toont kennelijk een wisselende/roterende selectie (elke
// run een andere 24), die zich over de vele runs binnen het 7-dagen
// cutoff-venster opstapelt tot een totaal dat ruim boven de 24 uitkomt (in de
// praktijk 150-300+, zie data/scrape-health.json) -- geen garantie op het
// volledige ~500-560-aanbod, maar wel een aanzienlijk deel ervan.

// viaBOVAG leverde tot ~15 aug 2026 betrouwbaar __NEXT_DATA__; sindsdien
// levert dat blok niets meer op (site-herbouw, framework-wissel?). Tot we
// weten wat de nieuwe paginastructuur is, proberen we hier ook de twee
// andere gangbare SSR-hydratiepatronen (Nuxt, en JSON-LD zoals AutoTrack al
// succesvol gebruikt) voor we het opgeven -- en loggen we op de eerste
// pagina van elke run genoeg over de ruwe HTML om de echte nieuwe structuur
// te kunnen achterhalen uit de workflow-logs, zonder de site zelf te hoeven
// bezoeken.
function parseerViaBovag(html, gezien, label, uitgebreideDiagnose) {
  const results = [];

  let items = null;
  let bron = null;

  const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1]);
      const sr = nd.props?.pageProps?.serverSearchResults;
      items = sr?.results || [];
      bron = '__NEXT_DATA__';
    } catch (e) { /* val door naar volgende strategie */ }
  }

  if (!items) {
    const nuxtMatch = html.match(/<script id="__NUXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
      || html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/);
    if (nuxtMatch) {
      try {
        const nd = JSON.parse(nuxtMatch[1]);
        // Nuxt-payloads verschillen sterk per site-opzet; dit is een gok naar
        // de meest gangbare vindplaats. Faalt dit, dan valt de diagnose
        // hieronder terug op de ruwe structuur-dump.
        const guess = nd.data?.results || nd.state?.results || nd.props?.pageProps?.results;
        if (Array.isArray(guess)) { items = guess; bron = '__NUXT__'; }
      } catch (e) { /* val door */ }
    }
  }

  if (!items) {
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    for (const block of ldBlocks) {
      try {
        const d = JSON.parse(block[1]);
        if (d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
          items = d.itemListElement.map(e => e.item || e).filter(Boolean);
          bron = 'JSON-LD ItemList';
          break;
        }
      } catch (e) { /* volgend blok */ }
    }
  }

  // RSC Flight-protocol (Next.js App Router): viaBOVAG's SSR-hydratatiedata
  // zit sinds de framework-wissel in self.__next_f.push([id,"..."])-chunks
  // i.p.v. één __NEXT_DATA__-blob. De vorige diagnose (#92) bevestigde dit
  // (id="_R_"-webpack-chunk, geen bruikbare ld+json). Geen officieel
  // geparste boomstructuur -- we scannen de losgekoppelde chunk-teksten op
  // JSON-eilanden die op een auto-listing lijken (prijs + titel/merk-achtig
  // veld). Fragieler dan de andere strategieën (breekt mogelijk weer bij een
  // volgende ViaBovag-release), maar de enige route zonder hun officiële
  // Flight-boomstructuur te reïmplementeren.
  if (!items) {
    const flightItems = extraheerViaBovagFlightItems(html);
    if (flightItems.length) { items = flightItems; bron = 'RSC-Flight'; }
  }

  if (!items) {
    console.log(` ${label}: geen enkel bekend data-patroon gevonden (__NEXT_DATA__/__NUXT__/JSON-LD/RSC-Flight), skip`);
    if (uitgebreideDiagnose) {
      const scriptTags = [...html.matchAll(/<script\b([^>]*)>/g)]
        .map(m => m[1].trim()).filter(a => /id=|type="application/.test(a)).slice(0, 25);
      console.log(`   diagnose ${label}: HTML ${html.length} chars, title="${(html.match(/<title>([^<]*)<\/title>/)||[])[1] || '?'}"`);
      console.log(`   diagnose ${label}: relevante <script>-tags gevonden (max 25): ${JSON.stringify(scriptTags)}`);
      // Vervolgvraag na de vorige diagnose (zie #92): er staan wel 2
      // application/ld+json-blokken in de pagina, alleen niet van het
      // @type ItemList dat we herkennen. Log hier wat ze wél bevatten
      // (@type + eerste 300 tekens) -- misschien staan de listings er per
      // stuk in (bv. individuele Product/Car-items) i.p.v. als ItemList,
      // wat een veel simpelere fix zou zijn dan het RSC-Flight-protocol
      // (self.__next_f.push(...)) proberen te parsen, dat de duidelijkste
      // aanwijzing is (samen met id="_R_" op de webpack-chunk hierboven)
      // dat viaBOVAG inmiddels Next.js App Router + React Server
      // Components gebruikt i.p.v. de oude Pages Router met __NEXT_DATA__.
      const ldBlocksVoorDiagnose = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
      ldBlocksVoorDiagnose.forEach((block, i) => {
        try {
          const d = JSON.parse(block[1]);
          const typ = Array.isArray(d) ? `array[${d.length}], eerste @type=${d[0]?.['@type']}` : d['@type'];
          console.log(`   diagnose ${label}: ld+json-blok ${i + 1}/${ldBlocksVoorDiagnose.length}: @type=${typ}, snippet=${block[1].slice(0, 300).replace(/\s+/g, ' ')}`);
        } catch (e) {
          console.log(`   diagnose ${label}: ld+json-blok ${i + 1}/${ldBlocksVoorDiagnose.length}: parse-fout (${e.message}), snippet=${block[1].slice(0, 300).replace(/\s+/g, ' ')}`);
        }
      });
      const flightChunks = (html.match(/self\.__next_f\.push\(/g) || []).length;
      console.log(`   diagnose ${label}: self.__next_f.push(...)-chunks gevonden: ${flightChunks} (>0 bevestigt RSC/App Router i.p.v. Pages Router)`);
    }
    return results;
  }
  console.log(` ${label}: ${items.length} resultaten via ${bron}`);

  // RSC-Flight-items zijn heuristisch gevonden JSON-objecten met onbekende,
  // niet-gedocumenteerde veldnamen -- flexibele mapping die meerdere
  // gangbare varianten probeert i.p.v. één vaste vorm aan te nemen.
  if (bron === 'RSC-Flight') {
    // Eerste run (#97) onthulde de echte top-level sleutels: id, mobilityType,
    // url, friendlyUriPart, externalAdvertisementUrl, imageUrl, title, price,
    // priceExcludesVat, isFinanceable, vehicle, company, useAdbooster. title/
    // price/imageUrl mapten meteen goed; km/jaar/brandstof/locatie bleven
    // null omdat ze -- net als in de oude __NEXT_DATA__-vorm hierboven --
    // genest zitten in vehicle/company. Zelfde backend/domeinmodel, alleen
    // een andere renderlaag, dus hergebruikt hier bewust exact dezelfde
    // veldnamen (v.mileage/v.year/v.fuelTypes/company.city) die daar al
    // bewezen werken, met de generieke veld()-fallbacks als vangnet mocht
    // die aanname toch niet (meer) kloppen.
    for (const item of items) {
      const veld = function(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if (v!=null && v!=='') return v; } return null; };
      const rawUrl = veld(item.url, item.href, item.detailUrl, item.link, item.slug);
      if (!rawUrl) continue;
      const url = String(rawUrl).startsWith('http') ? String(rawUrl) : 'https://www.viabovag.nl' + (String(rawUrl).startsWith('/') ? '' : '/') + rawUrl;
      if (gezien.has(url)) continue;
      gezien.add(url);

      const idM = url.match(/(\d{4,})\/?$/);
      const id = 'vb_' + (idM ? idM[1] : url.replace(/[^a-z0-9]/gi, '').slice(-24));

      const v = item.vehicle || {};
      const co = item.company || {};
      const fuelArr = Array.isArray(v.fuelTypes) ? v.fuelTypes : (v.fuelTypes ? [v.fuelTypes] : []);

      const prijsRaw = veld(item.price, item.prijs, item.vraagprijs);
      const prijs = prijsRaw != null ? parseInt(String(prijsRaw).replace(/[^\d]/g, '')) || null : null;
      const kmRaw = veld(v.mileage, item.mileage, item.km, item.kilometerstand, item.mileageKm);
      const km = kmRaw != null ? parseInt(String(kmRaw).replace(/[^\d]/g, '')) || null : null;
      const jaarRaw = veld(v.year, item.year, item.jaar, item.bouwjaar, item.modelYear, item.constructionYear);
      const jaarM = String(jaarRaw||'').match(/\b(19|20)\d{2}\b/);
      const titel = veld(item.title, item.titel, item.name, item.naam);
      const imgSrc = veld(item.image, item.imageUrl, item.imgSrc, item.thumbnail, Array.isArray(item.images)?item.images[0]:null);

      results.push({
        id,
        bron: 'ViaBovag',
        titel: titel ? String(titel).substring(0, 80) : null,
        prijs,
        km,
        jaar: jaarM ? parseInt(jaarM[0]) : null,
        brandstof: veld(fuelArr[0], item.fuelType, item.brandstof) || '',
        locatie: veld(co.city, item.city, item.plaats, item.location) || null,
        url,
        imgSrc: typeof imgSrc === 'string' ? imgSrc : '',
        imgs: typeof imgSrc === 'string' ? [imgSrc] : [],
        bijgewerkt: new Date().toISOString().slice(0, 10),
      });
    }
    if (uitgebreideDiagnose && results.length) {
      console.log(`   diagnose ${label}: RSC-Flight voorbeeldobject (ruwe sleutels): ${JSON.stringify(Object.keys(items[0]))}`);
      console.log(`   diagnose ${label}: RSC-Flight vehicle-subobject: ${JSON.stringify(items[0].vehicle)}`);
      console.log(`   diagnose ${label}: RSC-Flight company-subobject: ${JSON.stringify(items[0].company)}`);
      console.log(`   diagnose ${label}: RSC-Flight eerste gemapte listing: ${JSON.stringify(results[0])}`);
      // Alle 30 "pagina's" (?pagina=N) leverden in #97 identiek dezelfde 24
      // resultaten op -- de site lijkt die query-param niet meer server-side
      // te respecteren. Check of er ergens paginerings-metadata meegestuurd
      // wordt, als aanwijzing voor hoe de échte paginering nu werkt.
      const paginaHints = vindViaBovagPaginaHints(html);
      console.log(`   diagnose ${label}: paginerings-achtige velden gevonden (max 20): ${paginaHints.length ? JSON.stringify(paginaHints) : '(geen)'}`);
    }
    return results;
  }

  // __NEXT_DATA__/__NUXT__ leveren viaBOVAG's eigen vehicle/company-vormige
  // items; JSON-LD is schema.org-gestructureerd (Car/Offer) zoals AutoTrack
  // ook gebruikt -- andere velden, dus niet door dezelfde mapping heen.
  if (bron === 'JSON-LD ItemList') {
    for (const item of items) {
      const rawUrl = item.url || item['@id'] || '';
      if (!rawUrl) continue;
      const url = rawUrl.startsWith('http') ? rawUrl : 'https://www.viabovag.nl' + rawUrl;
      if (gezien.has(url)) continue;
      gezien.add(url);

      const idM = url.match(/(\d{4,})\/?$/);
      const id = 'vb_' + (idM ? idM[1] : url.replace(/[^a-z0-9]/gi, '').slice(-24));

      const prijs = item.offers?.price || item.price || 0;
      const kmRaw = item.mileageFromOdometer?.value ?? item.mileage ?? null;
      const km = kmRaw ? parseInt(String(kmRaw).replace(/[^\d]/g, '')) : null;
      const yearM = String(item.productionDate || item.modelDate || '').match(/\b(19|20)\d{2}\b/);
      const imgSrc = (Array.isArray(item.image) ? item.image[0] : item.image) || '';

      results.push({
        id,
        bron: 'ViaBovag',
        titel: (item.name || '').substring(0, 80),
        prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : (prijs || null),
        km,
        jaar: yearM ? parseInt(yearM[0]) : null,
        brandstof: item.fuelType || '',
        locatie: item.offers?.seller?.address?.addressLocality || null,
        url,
        imgSrc: typeof imgSrc === 'string' ? imgSrc : '',
        imgs: (Array.isArray(item.image) ? item.image : (item.image ? [item.image] : [])).filter(u => typeof u === 'string'),
        bijgewerkt: new Date().toISOString().slice(0, 10),
      });
    }
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
      imgSrc: item.imageUrl || '',
      imgs: item.imageUrl ? [item.imageUrl] : [],
      bijgewerkt: new Date().toISOString().slice(0, 10),
    });
  }

  return results;
}

const AT_URLS = [
  // Algemeen aanbod
  'https://www.autotrack.nl/aanbod',
  'https://www.autotrack.nl/aanbod?pageNumber=2&pageSize=30',
  'https://www.autotrack.nl/aanbod?pageNumber=3&pageSize=30',
  // Hybride
  'https://www.autotrack.nl/aanbod/brandstofsoort/hybride-benzine',
  'https://www.autotrack.nl/aanbod/brandstofsoort/hybride-benzine?pageNumber=2&pageSize=30',
  // Elektrisch
  'https://www.autotrack.nl/aanbod/brandstofsoort/elektriciteit',
  'https://www.autotrack.nl/aanbod/brandstofsoort/elektriciteit?pageNumber=2&pageSize=30',
  'https://www.autotrack.nl/aanbod/brandstofsoort/elektriciteit?pageNumber=3&pageSize=30',
  'https://www.autotrack.nl/aanbod/merk/tesla',
  'https://www.autotrack.nl/aanbod/merk/tesla?pageNumber=2&pageSize=30',
  'https://www.autotrack.nl/aanbod/merk/tesla?pageNumber=3&pageSize=30',
  // Ford Mach-E
  'https://www.autotrack.nl/aanbod/merk/ford/model/mustang-mach-e',
  'https://www.autotrack.nl/aanbod/merk/ford/model/mustang-mach-e?pageNumber=2&pageSize=30',
  'https://www.autotrack.nl/aanbod/merk/ford/model/mustang-mach-e?pageNumber=3&pageSize=30',
  // Ford Explorer Elektrisch
  'https://www.autotrack.nl/aanbod/merk/ford/model/explorer',
  'https://www.autotrack.nl/aanbod/merk/ford/model/explorer?pageNumber=2&pageSize=30',
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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal AT ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < AT_URLS.length - 1) await sleep(6000);
  }
  return all;
}

function parseerAutoTrack(html, gezien, label) {
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
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

    const idM = url.match(/(\d{6,})\/?$/);
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

    // vehicleConfiguration: "Benzine, Handgeschakeld, SUV / Terreinwagen, 113 kW (154 PK)"
    const configParts = String(item.vehicleConfiguration || '').split(',').map(s => s.trim());

    results.push({
      id,
      bron: 'AutoTrack',
      titel: (item.name || '').substring(0, 80),
      prijs: typeof prijs === 'string' ? parseInt(prijs.replace(/[^\d]/g, '')) : prijs,
      jaar,
      km,
      brandstof: item.fuelType || configParts[0] || '',
      carrosserie: item.bodyType || configParts[2] || '',
      transmissie: item.vehicleTransmission || configParts[1] || '',
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

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AUTOSCOUT24 ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
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

  // Nieuw (2 sep, sessie-analyse "waarom stokt het totaal aanbod"): de
  // grootste merken in Nederland hadden hier tot nu toe geen eigen pad,
  // dus leunden volledig op de 3 algemene pagina's hierboven (60 items).
  // Zelfde bescheiden diepte (2 pagina's) als de bestaande merk-paden --
  // bewuste startdiepte, later gericht dieper op basis van scrape-
  // report.json-yield per merk.
  'https://www.autoscout24.nl/lst/volkswagen?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/volkswagen?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/bmw?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/bmw?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/toyota?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/toyota?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/audi?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/audi?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/peugeot?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/peugeot?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/renault?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/renault?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/hyundai?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/hyundai?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/kia?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/kia?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/volvo?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/volvo?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/skoda?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/skoda?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/mercedes-benz?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/mercedes-benz?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/seat?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/seat?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/opel?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/opel?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/fiat?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/fiat?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/honda?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/honda?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/mazda?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/mazda?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/nissan?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/nissan?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/dacia?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/dacia?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/mini?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/mini?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/land-rover?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/land-rover?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  'https://www.autoscout24.nl/lst/porsche?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/porsche?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
  // Algemeen Ford -- de bestaande /lst/ford-regel hierboven filtert al op
  // fuel=E (alleen elektrisch), dekt de rest van het merk niet.
  'https://www.autoscout24.nl/lst/ford?sort=standard&desc=0&ustate=N%2CU&size=20&page=1',
  'https://www.autoscout24.nl/lst/ford?sort=standard&desc=0&ustate=N%2CU&size=20&page=2',
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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal AS24 ${all.length}`);
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

  // Navigeer naar listings ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AutoScout24 wisselt soms van structuur
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

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AUTOTRADER ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
// autotrader.nl ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ JSON-LD schema.org + __NEXT_DATA__ fallback

const ATR_URLS = [
  // Algemeen aanbod
  'https://www.autotrader.nl/auto',
  'https://www.autotrader.nl/auto?page=2',
  'https://www.autotrader.nl/auto?page=3',
  // Elektrisch
  'https://www.autotrader.nl/auto?fuel=E',
  'https://www.autotrader.nl/auto?fuel=E&page=2',
  // Hybride (fuel 2 = Elektro/Benzine, 3 = Elektro/Diesel)
  'https://www.autotrader.nl/auto?fuel=2%2C3',
  'https://www.autotrader.nl/auto?fuel=2%2C3&page=2',
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
      console.log(` ${label}: ${found.length} nieuw ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ totaal ATR ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < ATR_URLS.length - 1) await sleep(6000);
  }

  return all;
}

function titleCaseLocatie(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
}

function parseerAutoTrader(html, gezien, label) {
  const results = [];

  // AutoTrader.nl draait tegenwoordig op het AutoScout24-platform; de listings
  // zitten in __NEXT_DATA__.props.pageProps.listings
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!nextMatch) {
    console.log(` ${label}: geen __NEXT_DATA__ gevonden (${html.length} chars HTML)`);
    return results;
  }

  let listings = [];
  try {
    const data = JSON.parse(nextMatch[1]);
    listings = data?.props?.pageProps?.listings || [];
    console.log(` ${label}: ${listings.length} items via __NEXT_DATA__`);
  } catch (e) {
    console.log(` ${label}: __NEXT_DATA__ parse fout - ${e.message}`);
    return results;
  }

  for (const item of listings) {
    const crossRefId = item.crossReferenceId || item.identifier?.crossReferenceId || item.id;
    if (!crossRefId) continue;
    const id = 'atr-' + crossRefId;
    if (gezien.has(id)) continue;
    gezien.add(id);

    const prijs = item.price?.priceRaw || 0;
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    const relUrl = item.url || '';
    if (!relUrl) continue;
    const url = relUrl.startsWith('http') ? relUrl : 'https://www.autotrader.nl' + relUrl;

    const vehicle = item.vehicle || {};
    const kmRaw = item.tracking?.mileage ?? vehicle.mileageInKm ?? null;
    const km = kmRaw ? parseInt(String(kmRaw).replace(/[^\d]/g, '')) : null;

    const yearM = String(item.tracking?.firstRegistration || '').match(/\b(19|20)\d{2}\b/);
    const jaar = yearM ? parseInt(yearM[0]) : null;

    const imgs = Array.isArray(item.images) ? item.images.filter(u => typeof u === 'string') : [];

    results.push({
      id,
      bron: 'AutoTrader',
      titel: `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim().substring(0, 80),
      prijs,
      jaar,
      km,
      brandstof: vehicle.fuel || '',
      carrosserie: vehicle.variant || '',
      transmissie: vehicle.transmission || '',
      kleur: '',
      locatie: titleCaseLocatie(item.location?.city) || 'Nederland',
      url,
      imgSrc: imgs[0] || '',
      imgs: imgs.slice(0, 10),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }

  if (results.length === 0) {
    console.log(` ${label}: geen data gevonden (${html.length} chars HTML)`);
  }

  return results;
}

// ── AUTOWERELD ───────────────────────────────────────────────────────────
// Zevende bron, toegevoegd 2 sep op verzoek van de gebruiker. autowereld.nl's
// exacte structuur (URL-paden, tech stack) is vanuit deze sandbox niet te
// verkennen -- zelfde netwerkbeperking als bij elke andere bron hier (zie
// ViaBovag/AutoTrack/AutoTrader hierboven, allemaal ontwikkeld door eerst
// een diagnostische eerste versie in productie te draaien en op basis van de
// workflow-run-logs bij te sturen).
//
// AW_URLS bevat daarom 3 verschillende gegokte top-level paden i.p.v. 3
// pagina's van hetzelfde pad -- levert bij de eerste run direct een
// HTTP-status per gok op, i.p.v. blind paginering te proberen op een pad dat
// misschien al fout is. parseerAutoWereld() probeert vervolgens, in volgorde,
// de patronen die de andere 6 bronnen al bleken te gebruiken (JSON-LD
// ItemList/Car -- AutoTrack's aanpak, en het gangbaarst voor Google's
// rich results -- dan een generieke zoektocht door een eventueel
// __NEXT_DATA__/__NUXT__-blob naar listing-achtige objecten, dezelfde
// diepte-onafhankelijke heuristiek als extraheerViaBovagFlightItems()
// hierboven) en logt bij nul resultaten expliciet genoeg over de ruwe
// pagina om na de eerstvolgende run direct te kunnen bijsturen i.p.v. blind
// te gissen.
const AW_URLS = [
  'https://www.autowereld.nl/occasions',
  'https://www.autowereld.nl/auto-kopen',
  'https://www.autowereld.nl/aanbod',
];

async function scrapeAutoWereld() {
  const all = [];
  const gezien = new Set();

  for (let i = 0; i < AW_URLS.length; i++) {
    const url = AW_URLS[i];
    const label = `AW p${i + 1}`;
    try {
      const resp = await fetchWithRetry(url, { headers: HEADERS_AW });
      console.log(` ${label}: HTTP ${resp.status}`);
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoWereld(html, gezien, label, true);
      all.push(...found);
      console.log(` ${label}: ${found.length} nieuw -- totaal AW ${all.length}`);
    } catch (e) {
      console.log(` ${label}: fout - ${e.message}`);
    }
    if (i < AW_URLS.length - 1) await sleep(6000);
  }
  return all;
}

// Zoekt, onafhankelijk van de exacte boomstructuur, naar objecten die op een
// auto-listing lijken (zowel een prijs- als titel/merk-achtig veld) --
// zelfde heuristiek als extraheerViaBovagFlightItems()/lijktOpListing()
// hierboven, maar toegepast op een reeds geparste JS-objectboom
// (__NEXT_DATA__/__NUXT__/etc.) i.p.v. op Flight-tekstchunks. Niet ViaBovag-
// specifiek, dus hier los herbruikbaar gehouden i.p.v. gekopieerd.
function vindListingAchtigeObjecten(v, resultaat, gezienObj, diepte) {
  if (v == null || diepte > 8 || resultaat.length >= 500) return;
  if (typeof v !== 'object') return;
  if (!Array.isArray(v)) {
    const laag = Object.keys(v).map(function(k){ return k.toLowerCase(); });
    const heeftPrijs = laag.some(function(k){ return k.includes('price') || k === 'prijs' || k === 'vraagprijs'; });
    const heeftTitel = laag.some(function(k){ return k.includes('title') || k === 'titel' || k.includes('brand') || k === 'merk' || k.includes('make') || k === 'name' || k === 'naam'; });
    if (heeftPrijs && heeftTitel) {
      const key = JSON.stringify(v).slice(0, 200);
      if (!gezienObj.has(key)) { gezienObj.add(key); resultaat.push(v); }
      return;
    }
  }
  if (Array.isArray(v)) { v.forEach(function(x){ vindListingAchtigeObjecten(x, resultaat, gezienObj, diepte + 1); }); return; }
  Object.keys(v).forEach(function(k){ vindListingAchtigeObjecten(v[k], resultaat, gezienObj, diepte + 1); });
}

function parseerAutoWereld(html, gezien, label, uitgebreideDiagnose) {
  const results = [];
  let items = [];
  let herkomst = '';

  // Strategie 1: JSON-LD ItemList/Car (schema.org) -- zelfde patroon als
  // parseerAutoTrack hierboven.
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const block of ldBlocks) {
    try {
      const d = JSON.parse(block[1]);
      if (d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
        items = d.itemListElement.map(function(e){ return e.item || e; }).filter(Boolean);
        herkomst = 'JSON-LD ItemList';
        break;
      }
      if (Array.isArray(d) && d[0] && d[0]['@type'] === 'Car') {
        items = d;
        herkomst = 'JSON-LD Car-array';
        break;
      }
    } catch (e) { /* volgende block */ }
  }

  // Strategie 2: __NEXT_DATA__/__NUXT__ -- generieke zoektocht naar
  // listing-achtige objecten ongeacht de boomstructuur.
  if (items.length === 0) {
    const stateMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
      || html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (stateMatch) {
      try {
        const data = JSON.parse(stateMatch[1]);
        const gevonden = [];
        vindListingAchtigeObjecten(data, gevonden, new Set(), 0);
        if (gevonden.length) { items = gevonden; herkomst = '__NEXT_DATA__/__NUXT__ generiek'; }
      } catch (e) { /* val door naar diagnose hieronder */ }
    }
  }

  if (items.length === 0) {
    console.log(` ${label}: geen listings gevonden (${html.length} chars HTML, JSON-LD blocks: ${ldBlocks.length}, __NEXT_DATA__: ${/__NEXT_DATA__/.test(html)}, __NUXT__: ${/__NUXT__/.test(html)})`);
    if (uitgebreideDiagnose) {
      console.log(`   diagnose ${label}: eerste 500 chars HTML: ${html.slice(0, 500).replace(/\s+/g, ' ')}`);
    }
    return results;
  }

  console.log(` ${label}: ${items.length} items via ${herkomst}`);
  if (uitgebreideDiagnose && items.length) {
    console.log(`   diagnose ${label}: ruwe sleutels eerste item: ${JSON.stringify(Object.keys(items[0]))}`);
    console.log(`   diagnose ${label}: eerste item (max 800 chars): ${JSON.stringify(items[0]).slice(0, 800)}`);
  }

  for (const item of items) {
    const rawUrl = item.url || item['@id'] || item.href || '';
    if (!rawUrl) continue;
    const url = rawUrl.startsWith('http') ? rawUrl : 'https://www.autowereld.nl' + rawUrl;
    if (gezien.has(url)) continue;
    gezien.add(url);

    const idM = url.match(/(\d{5,})\/?(?:$|[?#])/);
    const id = 'aw-' + (idM ? idM[1] : url.replace(/[^a-z0-9]/gi, '').slice(-24));

    const prijsRaw = (item.offers && item.offers.price) ?? item.price ?? item.prijs ?? 0;
    const prijs = typeof prijsRaw === 'string' ? parseInt(prijsRaw.replace(/[^\d]/g, '')) : (prijsRaw || null);
    if (!prijs || prijs < 500 || prijs > 500000) continue;

    const kmRaw = (item.mileageFromOdometer && item.mileageFromOdometer.value) ?? item.mileage ?? item.km ?? item.kilometerstand ?? null;
    const km = kmRaw ? parseInt(String(kmRaw).replace(/[^\d]/g, '')) : null;

    const yearRaw = item.productionDate || item.modelDate || item.jaar || item.bouwjaar || '';
    const yearM = String(yearRaw).match(/\b(19|20)\d{2}\b/);
    const jaar = yearM ? parseInt(yearM[0]) : null;

    const imgRaw = item.image || item.imgs || item.afbeeldingen || '';
    const imgs = (Array.isArray(imgRaw) ? imgRaw : (imgRaw ? [imgRaw] : [])).filter(function(u){ return typeof u === 'string'; });

    const locatieRaw = (item.offers && item.offers.seller && item.offers.seller.address && item.offers.seller.address.addressLocality) || item.locatie || item.plaats || '';

    results.push({
      id,
      bron: 'AutoWereld',
      titel: (item.name || item.title || item.titel || (`${item.brand || ''} ${item.model || ''}`).trim() || '').substring(0, 80),
      prijs,
      jaar,
      km,
      brandstof: item.fuelType || item.brandstof || '',
      carrosserie: item.bodyType || item.carrosserie || '',
      transmissie: item.vehicleTransmission || item.transmissie || '',
      kleur: item.color || item.kleur || '',
      locatie: titleCaseLocatie(locatieRaw) || 'Nederland',
      url,
      imgSrc: imgs[0] || '',
      imgs: imgs.slice(0, 10),
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }

  return results;
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ MAIN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ


// ââ GASPEDAAL IMAGE DOWNLOADER âââââââââââââââââââââââââââââââââââââââââââââ
async function downloadGaspedaalImages(listings) {
  const path = require('path');
  const imgDir = path.join(process.cwd(), 'data', 'images');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  const IMG_HEADERS = {
    'Referer': 'https://www.gaspedaal.nl/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'nl-NL,nl;q=0.9'
  };
  const currentIds = new Set(listings.map(l => l.id));
  try {
    for (const f of fs.readdirSync(imgDir)) {
      if (!currentIds.has(f.replace('.jpg',''))) try { fs.unlinkSync(path.join(imgDir,f)); } catch(e) {}
    }
  } catch(e) {}
  let downloaded=0, skipped=0, failed=0;
  const MAX_NEW = 300;
  for (const listing of listings) {
    const rawSrc = listing.imgSrc || '';
    if (!rawSrc.includes('cdn.gaspedaal.nl')) continue;
    const localFile = path.join(imgDir, listing.id + '.jpg');
    if (fs.existsSync(localFile)) { listing.imgSrc = '/data/images/' + listing.id + '.jpg'; skipped++; continue; }
    if (downloaded >= MAX_NEW) continue;
    try {
      const cleanSrc = rawSrc.startsWith('//') ? 'https:' + rawSrc.split('?')[0] : rawSrc.split('?')[0];
      const resp = await fetch(cleanSrc, { headers: IMG_HEADERS });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const buf = await resp.arrayBuffer();
      if (buf.byteLength < 1000) throw new Error('too small');
      fs.writeFileSync(localFile, Buffer.from(buf));
      listing.imgSrc = '/data/images/' + listing.id + '.jpg';
      downloaded++;
      await sleep(400);
    } catch(e) { failed++; }
  }
  console.log('  Afbeeldingen: ' + downloaded + ' nieuw, ' + skipped + ' al aanwezig, ' + failed + ' mislukt');
}

async function main() {
  console.log('ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Scraper gestart:', new Date().toISOString());

  console.log('\nÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¦ Marktplaats (algemeen + EV)...');
  const mpListings = await scrapeMarktplaats();
  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Marktplaats: ${mpListings.length} listings`);

  console.log('\nÃÂÃÂ¢ÃÂÃÂÃÂÃÂ½ Gaspedaal (algemeen + elektrisch)...');
  const gpListings = await scrapeGaspedaal();
  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Gaspedaal: ${gpListings.length} listings`);


  console.log('\nÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ·ÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ viaBOVAG (algemeen + elektrisch)...');
  const vbListings = await scrapeViaBovag();
  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ viaBOVAG: ${vbListings.length} listings`);

  console.log('\nÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¡ AutoTrack (algemeen + hybride + elektrisch)...');
  const atListings = await scrapeAutoTrack();
  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AutoTrack: ${atListings.length} listings`);

  console.log('\nÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ AutoScout24 (algemeen + EV + hybride)...');
  const as24Listings = await scrapeAutoScout24();
  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AutoScout24: ${as24Listings.length} listings`);

  console.log('\nÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ AutoTrader (algemeen + EV + hybride)...');
  const atrListings = await scrapeAutoTrader();
  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AutoTrader: ${atrListings.length} listings`);


  console.log('\nAutoWereld (occasions)...');
  const awListings = await scrapeAutoWereld();
  console.log(`AutoWereld: ${awListings.length} listings`);

  const nieuw = [...mpListings, ...gpListings, ...vbListings, ...atListings, ...as24Listings, ...atrListings, ...awListings];
  console.log(`\nÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Vandaag gescrapt: ${nieuw.length} listings`);

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Bestaande listings inladen en samenvoegen ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const outPath = path.join(process.cwd(), 'data', 'listings.json');
  const byId = {};

  try {
    const bestaand = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    for (const l of (bestaand.listings || [])) byId[l.id] = l;
    console.log(`ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Bestaand: ${Object.keys(byId).length} listings geladen`);
  } catch (e) {
    console.log(`ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Geen bestaand bestand, begin vers`);
  }

  for (const l of nieuw) {
      const prev = byId[l.id];
      if (prev && prev.prijs != null && l.prijs != null && prev.prijs !== l.prijs) {
        const hist = prev.prijsHistorie ? [...prev.prijsHistorie] : [];
        hist.push({ datum: prev.bijgewerkt || new Date().toISOString().slice(0,10), prijs: prev.prijs });
        l.prijsHistorie = hist.slice(-5);
        console.log(` ÃÂ°ÃÂÃÂÃÂ° Prijswijziging ${l.id}: ÃÂ¢ÃÂÃÂ¬${prev.prijs} ÃÂ¢ÃÂÃÂ ÃÂ¢ÃÂÃÂ¬${l.prijs}`);
      } else if (prev && prev.prijsHistorie) {
        l.prijsHistorie = prev.prijsHistorie;
      }
      // "Dagen online"-badge (index.html, sinds #84) leest a.eersteGezien --
      // maar die datum werd nergens gezet, dus de badge rendert nooit (altijd
      // undefined). Zelfde carry-over-patroon als prijsHistorie hierboven:
      // eenmaal gezet blijft de datum staan zolang de advertentie in de
      // dataset blijft; pas bij een écht nieuwe advertentie (of de eerste run
      // na deze fix, wanneer bestaande listings deze datum nog niet hebben)
      // telt vandaag als eerste keer gezien.
      l.eersteGezien = (prev && prev.eersteGezien) ? prev.eersteGezien : new Date().toISOString().slice(0,10);
      byId[l.id] = l;
    }

  // Advertenties die niet meer teruggevonden worden (verkocht/verwijderd op
  // de bron) blijven nog een paar dagen staan i.p.v. meteen te verdwijnen --
  // dat geeft speling voor een incidentele hapering van 1 bron zonder dat
  // die auto's meteen uit de dataset vallen. Was voorheen 30 dagen: met 3
  // scrapes/dag bleef een verkochte auto dan een hele maand aanklikbaar op
  // Carkijker terwijl de advertentie op de bron allang weg was. check-
  // scrape-health.js vangt een échte bron-storing al apart af (faalt de run
  // bij een drop van >50% t.o.v. de vorige run), dus deze cutoff hoeft dat
  // niet ook nog te doen.
  //
  // 2 dagen (eerste versie van deze fix) bleek te krap: MP_API_BASE +
  // de ~15 merk-specifieke MP_*_OFFSETS-zoekopdrachten (verderop in dit
  // bestand) leveren samen maar ~1.500-2.500 unieke Marktplaats-advertenties
  // per run, want Marktplaats' eigen zoek-API staakt na ~1.000 resultaten
  // per query. Met een lang venster (30 dagen = 90 runs) krijgt vrijwel elke
  // nog-actieve advertentie op een gegeven moment de kans om in die
  // gelimiteerde resultatenset voor te komen -- met een kort venster (2
  // dagen = 6 runs) veel minder, waardoor nog gewoon te koop staande auto's
  // die toevallig niet in de laatste paar runs bovenaan stonden ook wegvielen,
  // niet alleen écht verlopen advertenties. 7 dagen (21 runs) is een
  // tussenweg: ruim meer herkansingen om opnieuw gevonden te worden, terwijl
  // een advertentie die een volle week niet meer opduikt met vrij hoge
  // zekerheid daadwerkelijk weg is.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  let listings = Object.values(byId)
    .filter(l => l.bijgewerkt >= cutoffStr)
    .filter(l => !(l.bron === 'AutoScout24' && !l.titel && !l.prijs));
  // Normaliseer km/prijs naar getallen ÃÂ¢ÃÂÃÂÃÂÃÂ oude gemergde listings kunnen nog strings
  // bevatten van een eerdere (inmiddels gefixte) parser-bug
  listings.forEach(function(l) {
    if (typeof l.km === 'string') l.km = parseInt(l.km.replace(/[^0-9]/g, '')) || null;
    if (typeof l.prijs === 'string') l.prijs = parseInt(l.prijs.replace(/[^0-9]/g, '')) || null;
  });
  // Merk-extractie: vul l.merk voor alle listings (nodig voor dedup + merkenfilter)
  const _MERKEN = ["Alfa Romeo","Aston Martin","Land Rover","Mercedes-Benz","Rolls-Royce","Lynk & Co","Abarth","Citroën","Polestar","Porsche","Renault","Hyundai","Peugeot","Volkswagen","Mitsubishi","Chevrolet","Chrysler","Genesis","Lamborghini","Maserati","Ferrari","Infiniti","Leapmotor","Subaru","Toyota","Nissan","Jaguar","Lexus","Suzuki","Skoda","Škoda","Dacia","Cupra","Tesla","Honda","Mazda","Volvo","Dodge","Maxus","Seat","Ford","Opel","Jeep","Fiat","Kia","BMW","Audi","MINI","Smart","Saab","Iveco","Voyah","Daihatsu","BYD","MG","DS","VW","Mercedes","Lynk","Isuzu","Lancia","Bentley","Bugatti","McLaren","Lotus","Lada","Ssangyong","Zeekr","Xpeng","NIO","Ora","Aiways"];
  // Merkaliassen: verschillende titelvormen voor hetzelfde merk die anders als
  // aparte merken in de merkenlijst/filter zouden opduiken (bv. "Mercedes" naast
  // "Mercedes-Benz"). Canonieke vorm rechts, herkende titelvorm(en) links.
  const _MERK_ALIAS = { "Mercedes": "Mercedes-Benz", "Lynk": "Lynk & Co", "Škoda": "Skoda", "VW": "Volkswagen" };
  listings.forEach(function(l) {
    const _titel = (l.titel || '').trim().toLowerCase();
    for (const _m of _MERKEN) {
      const _ml = _m.toLowerCase();
      if (_titel === _ml || _titel.startsWith(_ml + ' ') || _titel.startsWith(_ml + '-')) {
        l.merk = _MERK_ALIAS[_m] || _m;
        return;
      }
    }
    // Geen bekend merk herkend in de titel: niet meer gokken op het eerste woord
    // (dat leverde troep op als merk, bv. "Betrouwbare", "Mooie" bij
    // particuliere advertentietitels die niet met het merk beginnen).
    // Bestaande, niet-canonieke merkwaarden van eerdere runs worden hier ook
    // teruggezet naar 'overig' zodat oude vervuiling zichzelf herstelt; bestaande
    // aliaswaarden (bv. "VW" van vóór deze fix) worden gecanonicaliseerd.
    if (l.merk && _MERK_ALIAS[l.merk]) { l.merk = _MERK_ALIAS[l.merk]; return; }
    if (!l.merk || !_MERKEN.includes(l.merk)) l.merk = 'overig';
  });
  // Model-extractie: vul l.model voor listings met een herkend merk
  // (nodig voor een betrouwbare dedup-sleutel en schone modelpagina's)
  const _MODELLEN = {"Volkswagen":["Golf","Polo","Passat","Tiguan","T-Roc","ID.4","ID.3","ID.5","T-Cross","Caddy","Transporter","Up"],"BMW":["1-serie","2-serie","3-serie","4-serie","5-serie","7-serie","X1","X3","X5","iX3","i4","i3","iX1","Z3","Z4"],"Toyota":["Corolla","Yaris","RAV4","Prius","Aygo","C-HR","bZ4X"],"Ford":["Focus","Fiesta","Puma","Kuga","Mustang Mach-E","Explorer","Mondeo","Ranger","Transit"],"Audi":["A1","A3","A4","A5","A6","Q3","Q5","Q7","e-tron","Q4 e-tron"],"Peugeot":["208","308","3008","2008","508","e-208","e-2008","107","108","5008","Expert","Boxer","207","206","RCZ","Partner"],"Renault":["Clio","Megane","Captur","Zoe","Scenic","Twingo","Arkana","Trafic","Master","Kadjar"],"Hyundai":["i10","i20","i30","Tucson","Kona","IONIQ 5","IONIQ 6","Santa Fe"],"Kia":["Picanto","Stonic","Ceed","Sportage","Niro","EV6","Sorento","EV9"],"Tesla":["Model 3","Model S","Model Y","Model X"],"Volvo":["V40","V60","V90","XC40","XC60","XC90","S60","C40"],"Skoda":["Fabia","Octavia","Superb","Kodiaq","Karoq","Scala","Enyaq"],"Mercedes-Benz":["A-Klasse","B-Klasse","C-Klasse","E-Klasse","GLA","GLB","GLC","GLE","EQA","EQC","S-Klasse","V-Klasse","CLA-Klasse","Sprinter","Vito","Citan","GLS","G-Klasse","CLS"],"Seat":["Ibiza","Leon","Arona","Ateca","Tarraco"],"Opel":["Corsa","Astra","Mokka","Grandland","Insignia","Corsa-e","Crossland X","Karl","Vivaro","Combo","Meriva","Frontera","Agila","Zafira","Adam"],"Fiat":["500","500e","Panda","Tipo","500X","Punto","500C","Scudo","Talento","600","Doblo","Sedici"],"Honda":["Civic","Jazz","HR-V","CR-V"],"Mazda":["2","3","6","CX-3","CX-5","CX-30","MX-30"],"Nissan":["Micra","Qashqai","Juke","Leaf","Ariya","X-Trail"],"Citroën":["C1","C3","C3 Aircross","C4","C5 Aircross","e-C4","DS3","DS4","DS5","Berlingo","Jumpy","Jumper"],"Dacia":["Sandero","Duster","Logan","Spring","Jogger"],"Mini":["Cooper","Clubman","Countryman","Electric"],"Land Rover":["Discovery","Discovery Sport","Range Rover","Defender"],"Porsche":["Cayenne","Macan","Panamera","911","Taycan","Boxster"],"Jeep":["Renegade","Compass","Cherokee","Grand Cherokee","Wrangler","Avenger"],"Alfa Romeo":["Giulia","Stelvio","Tonale","Giulietta","Mito","Spider","147","Junior","159","GT","Brera"],"Suzuki":["Swift","Vitara","S-Cross","Jimny","Ignis","Alto","Celerio","Wagon R+","SX4","Splash","Baleno","Swace","Across","SX4 S-Cross"],"Mitsubishi":["ASX","Outlander","Eclipse Cross","Space Star","Colt","Grandis","Lancer","Pajero"],"Cupra":["Born","Formentor","Ateca","Leon"],"MG":["ZS","HS","MG4","MG5","MG3","EHS","TF","MGF","MGS5","MGS6","Marvel R","TD","MGB"],"Polestar":["Polestar 2","Polestar 3","Polestar 4"],"Jaguar":["E-Pace","F-Pace","I-Pace","XE","XF","F-Type","S-Type","E-Type","X-Type","XJ","XK","XKR","XK8"],"Subaru":["Forester","Outback","XV","Impreza"],"Lexus":["UX","NX","RX","IS","ES","CT"],"BYD":["Atto 3","Han","Tang","Seal","Dolphin"],"Smart":["#1","#3","fortwo","ForFour","#5","Roadster"],"DS":["DS3","DS4","DS7","DS9","DS5","DS8"],"Zeekr":["001","007","X","X2"],"Xpeng":["P7","G3","G9","P5","G6"],"NIO":["ES6","ES8","ET7","EL6","ET5"],"Leapmotor":["C10","T03"],"Ora":["Funky Cat","Good Cat"],"Aiways":["U5","U6"]};
  // Merkaliassen die _MERKEN los herkent maar dezelfde modellenlijst delen
  _MODELLEN["VW"] = _MODELLEN["Volkswagen"];
  _MODELLEN["Mercedes"] = _MODELLEN["Mercedes-Benz"];
  _MODELLEN["MINI"] = _MODELLEN["Mini"];
  _MODELLEN["Škoda"] = _MODELLEN["Skoda"];
  // Langste (specifiekste) modelnaam eerst proberen, anders matcht bv. het
  // bare cijfer "3" (Mazda) al binnen "CX-3" voordat dat model aan bod komt.
  for (const _merkKey of Object.keys(_MODELLEN)) {
    _MODELLEN[_merkKey] = _MODELLEN[_merkKey].slice().sort((a, b) => b.length - a.length);
  }

  function _escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Accenten weghalen (e.g. é/ë/ò -> e/e/o) -- titels schrijven "Mégane"/"Scénic"
  // vaak mét accent, de modellijst bewust zonder (en vice versa); zonder
  // normalisatie matcht dat nooit. NFD ontleedt het accentteken los van de
  // letter, zodat de combining-mark er daarna uitgefilterd kan worden.
  function _normDiacritics(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  // Bouwt een regex-patroon dat spaties, streepjes én "kale" overgangen tussen
  // een letter en een cijfer als onderling verwisselbaar behandelt -- titels
  // schrijven hetzelfde model door elkaar als "MG3", "MG 3" of "MG-3", en
  // "3-serie" (modellijst) moet ook matchen op "3 serie" of "3serie" in de
  // titel. Zonder dit faalde bv. vrijwel elke "DS 3"-titel (spatie) tegen de
  // modelwaarde "DS3" (geen spatie) -- goed voor bijna alle DS-advertenties.
  function _flexModelPattern(mLower) {
    var s = mLower
      .replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-z])/g, '$1 $2')
      .replace(/[\s-]+/g, ' ')
      .trim();
    return _escapeRegex(s).replace(/ /g, '[\\s-]?');
  }
  // Sommige modelnamen zijn bij een merk zo generiek dat ze bijna elk model van
  // dat merk als trimprefix vóóraan in de titel dragen (bv. "MINI Cooper
  // Clubman", "MINI Cooper Countryman" -- "Cooper" staat er bijna altijd,
  // eerder dan het eigenlijke, specifiekere model). Bij gelijke-positie-wint-
  // langste-string is dat geen probleem, maar "Cooper" staat hier juist wél
  // eerder in de titel dan "Clubman"/"Countryman" -- dus zonder uitzondering
  // zou "Cooper" onterecht winnen. Zulke namen worden pas als laatste redmiddel
  // geprobeerd, alleen als niets specifieks matcht.
  const _MODEL_FALLBACK = { "Mini": "Cooper", "MINI": "Cooper" };
  function _vindModelMatch(_titelLower, _m) {
    const _mLower = _normDiacritics(_m.toLowerCase());
    // Puur numerieke modelnamen (Mazda "2"/"3"/"6") mogen niet grenzen aan een
    // punt, anders matcht "2" op de "2.0" in een motorinhoud-aanduiding.
    const _boundary = /^\d+$/.test(_mLower) ? '[^a-z0-9.]' : '[^a-z0-9]';
    const _re = new RegExp('(^|' + _boundary + ')(' + _flexModelPattern(_mLower) + ')(' + _boundary + '|$)');
    const _match = _titelLower.match(_re);
    return _match ? { idx: _match.index + _match[1].length, len: _mLower.length } : null;
  }
  listings.forEach(function(l) {
    if (!l.merk || l.merk === 'overig') return;
    const _models = _MODELLEN[l.merk];
    if (!_models) return;
    const _titelLower = _normDiacritics((l.titel || '').toLowerCase());
    const _fallback = _MODEL_FALLBACK[l.merk];
    // Niet zomaar de eerste treffer in (lengte-gesorteerde) lijstvolgorde nemen,
    // maar over alle modellen heen degene kiezen die het vroegst in de titel
    // voorkomt (dus dichtst bij de merknaam, waar het model normaliter staat) --
    // bij gelijke positie wint de langere/specifiekere match. Dat voorkomt dat
    // een uitvoeringsnaam die toevallig ook een modelnaam is (bv. "Junior" als
    // trim van de Alfa Romeo MiTo) het echte, eerder genoemde model ("MiTo")
    // verdringt puur omdat "Junior" een langere string is.
    let _beste = null, _besteIdx = Infinity, _besteLen = -1;
    for (const _m of _models) {
      if (_m === _fallback) continue;
      const _hit = _vindModelMatch(_titelLower, _m);
      if (!_hit) continue;
      if (_hit.idx < _besteIdx || (_hit.idx === _besteIdx && _hit.len > _besteLen)) {
        _beste = _m; _besteIdx = _hit.idx; _besteLen = _hit.len;
      }
    }
    if (!_beste && _fallback && _vindModelMatch(_titelLower, _fallback)) {
      _beste = _fallback;
    }
    if (_beste) l.model = _beste;
  });
  // Deduplicatie: verwijder zelfde auto van meerdere platforms
  const _dedupMap = {};
  const _dedupList = [];
  for (const l of listings) {
    if (!l.merk || !l.prijs) { _dedupList.push(l); continue; }
    const _key = [
      (l.merk || "").toLowerCase().replace(/\s+/g, ""),
      (l.model || "").toLowerCase().replace(/\s+/g, ""),
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
  if (_dupCount > 0) console.log(` ÃÂ°ÃÂÃÂÃÂ  ${_dupCount} duplicaten verwijderd`);
  listings = _dedupList;


  const verwijderd = Object.keys(byId).length - listings.length;
  if (verwijderd > 0) console.log(`ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂ¸ÃÂÃÂ  ${verwijderd} verlopen listings verwijderd (>7 dagen)`);

  console.log(`ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Totaal na merge: ${listings.length} listings`);

  const data = {
    bijgewerkt: new Date().toISOString(),
    totaal: listings.length,
    bronnen: [...new Set(listings.map(l => l.bron))],
    listings
  };

    
  // Ã¢ÂÂÃ¢ÂÂ LUCAS: OUTLIER FILTER Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const voorFilter = listings.length;
  listings = listings.filter(l => {
    if (l.prijs != null && (l.prijs < 300 || l.prijs > 500000)) return false;
    if (l.km != null && l.km > 1000000) return false;
    return true;
  });
  if (listings.length < voorFilter)
    console.log(`Ã°ÂÂÂ ${voorFilter - listings.length} outliers gefilterd (prijs/km buiten bereik)`);

  // ── LUCAS: DEAL SCORE v2 (regressie op bouwjaar+km binnen merk+model) ──
  // v1 vergeleek de prijs alleen met het platte gemiddelde van de merk+model-groep,
  // ongeacht bouwjaar/km-stand -- een auto die goedkoop is OMDAT hij oud en hoog-
  // kilometer is kreeg daardoor dezelfde (hoge) score als een auto die echt goedkoop
  // is voor zijn leeftijd/km-stand. Concreet fout voorbeeld uit de data: een Mitsubishi
  // Grandis uit 2004 met 182.579 km kreeg dealScore 100 (beste deal van de site).
  // v2 rekent per groep een verwachte prijs uit die corrigeert voor bouwjaar en
  // km-stand (lineaire regressie, km als log() ivm afnemende meerwaarde per km),
  // en vergelijkt de vraagprijs met díie verwachting i.p.v. met het platte gemiddelde.
  {
    const _extMerk = t => {
      const merken = ['Tesla','BMW','Mercedes','Audi','Volkswagen','VW','Ford','Toyota','Renault','Peugeot','Opel','Kia','Hyundai','Volvo','Seat','Skoda','Nissan','Honda','Mazda','Dacia','Porsche','Fiat'];
      const s = (t||'').toLowerCase();
      for (const m of merken) if (s.startsWith(m.toLowerCase())) return m.toLowerCase();
      return s.split(' ')[0];
    };
    const _extModel = t => ((t||'').split(' ').slice(1,3).join(' ')).toLowerCase();
    // Groepeer bij voorkeur op de schone merk/model-velden (merk ~100%, model ~72%
    // van de listings gevuld) i.p.v. uitsluitend een ruwe regex over de titel -- dat
    // gaf voorheen te grove/inconsistente groepen omdat verschillende schrijfwijzes
    // van dezelfde trim in aparte groepen belandden. Titel-parsing blijft fallback
    // voor listings zonder model-veld.
    const _groepKey = l => (l.merk || _extMerk(l.titel) || 'onbekend').toLowerCase() + '|' +
      (l.model ? l.model.toLowerCase() : _extModel(l.titel));

    // Gauss-Jordan-eliminatie (partial pivoting) voor het 3x3-stelsel van de OLS-
    // regressie prijs = b0 + b1*bouwjaar + b2*log(km+1). Retourneert null bij een
    // (bijna) singuliere matrix (bv. alle auto's in de groep exact hetzelfde bouwjaar).
    function _solve3(A, b) {
      const M = A.map((rij, i) => rij.concat([b[i]]));
      for (let col = 0; col < 3; col++) {
        let piv = col;
        for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
        if (Math.abs(M[piv][col]) < 1e-9) return null;
        const tmp = M[col]; M[col] = M[piv]; M[piv] = tmp;
        for (let r = 0; r < 3; r++) {
          if (r === col) continue;
          const f = M[r][col] / M[col][col];
          for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c];
        }
      }
      return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
    }

    const groepen = {};
    for (const l of listings) {
      if (l.prijs == null) continue;
      (groepen[_groepKey(l)] = groepen[_groepKey(l)] || []).push(l);
    }

    const gModel = {};  // regressiecoëfficiënten + residu-std per groep (bouwjaar+km-gecorrigeerd)
    const gFlat = {};   // plat prijs-gemiddelde/std per groep -- fallback voor kleine groepen
                         // en listings zonder bouwjaar/km
    for (const [key, items] of Object.entries(groepen)) {
      const prijzen = items.map(l => l.prijs);
      if (prijzen.length >= 3) {
        const gem = prijzen.reduce((a,b)=>a+b,0) / prijzen.length;
        const std = Math.sqrt(prijzen.map(p=>(p-gem)**2).reduce((a,b)=>a+b,0) / prijzen.length);
        gFlat[key] = { gem, std };
      }
      // Regressie heeft genoeg vrijheidsgraden nodig om betrouwbaar te zijn (3
      // parameters) -- onder de 8 complete datapunten vertrouwen we 'm niet en
      // valt de groep terug op het platte gemiddelde hierboven.
      const compleet = items.filter(l => l.jaar != null && l.km != null);
      if (compleet.length < 8) continue;
      let n=0,sJaar=0,sLogKm=0,sJaar2=0,sLogKm2=0,sJaarLogKm=0,sPrijs=0,sJaarPrijs=0,sLogKmPrijs=0;
      for (const l of compleet) {
        const j = l.jaar, lk = Math.log(l.km + 1), p = l.prijs;
        n++; sJaar+=j; sLogKm+=lk; sJaar2+=j*j; sLogKm2+=lk*lk; sJaarLogKm+=j*lk;
        sPrijs+=p; sJaarPrijs+=j*p; sLogKmPrijs+=lk*p;
      }
      const coef = _solve3(
        [[n, sJaar, sLogKm], [sJaar, sJaar2, sJaarLogKm], [sLogKm, sJaarLogKm, sLogKm2]],
        [sPrijs, sJaarPrijs, sLogKmPrijs]
      );
      if (!coef) continue;
      const [b0, b1, b2] = coef;
      const residuen = compleet.map(l => l.prijs - (b0 + b1*l.jaar + b2*Math.log(l.km + 1)));
      const rStd = Math.sqrt(residuen.reduce((a,r)=>a+r*r,0) / n);
      if (rStd >= 200) gModel[key] = { b0, b1, b2, std: rStd };
    }

    let regressie = 0, groepScore = 0, onbekend = 0;
    for (const l of listings) {
      if (l.prijs == null) { l.dealScore = 50; l.dealBasis = 'onbekend'; onbekend++; continue; }
      const key = _groepKey(l);
      const m = gModel[key];
      if (m && l.jaar != null && l.km != null) {
        const verwacht = m.b0 + m.b1*l.jaar + m.b2*Math.log(l.km + 1);
        const z = (l.prijs - verwacht) / m.std;
        l.dealScore = Math.round(Math.max(0, Math.min(100, ((-z + 3) / 6) * 100)));
        l.dealBasis = 'regressie';
        regressie++;
        // Afschrijvingscurve: dezelfde regressiecoëfficiënten die net de verwachte
        // prijs opleverden, hergebruikt om uit te drukken hoeveel een auto van dit
        // merk+model gemiddeld verliest per jaar (b1: prijseffect van +1 bouwjaar,
        // dus +1 jaar jonger) en per verdubbeling van de km-stand (b2 is het prijs-
        // effect van +1 log(km); een verdubbeling is +ln(2) op de log-schaal).
        // Alleen tonen als het teken klopt (jonger/minder km -> duurder) -- een
        // omgekeerd teken duidt op een te ruizige/afwijkende groep (bv. youngtimers
        // die juist in waarde stijgen) waar deze simpele uitleg niet op past.
        if (m.b1 > 0) l.afschrijvingJaar = Math.round(m.b1);
        const kmVerlies = -m.b2 * Math.LN2;
        if (kmVerlies > 0) l.afschrijvingKm = Math.round(kmVerlies);
        continue;
      }
      const s = gFlat[key];
      if (!s || s.std < 200) { l.dealScore = 50; l.dealBasis = 'onbekend'; onbekend++; continue; }
      const z = (l.prijs - s.gem) / s.std;
      l.dealScore = Math.round(Math.max(0, Math.min(100, ((-z + 3) / 6) * 100)));
      l.dealBasis = 'groep';
      groepScore++;
    }
    console.log(`🎯 DealScore v2: ${regressie} obv bouwjaar/km-regressie, ${groepScore} obv groepsgemiddelde, ${onbekend} onbekend`);
  }

  // Ã¢ÂÂÃ¢ÂÂ LUCAS: PRIJS TREND Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  for (const l of listings) {
    if (!l.prijsHistorie || l.prijsHistorie.length < 2) { l.priceTrend = 'stabiel'; continue; }
    const recent = l.prijsHistorie.slice(-7);
    const pct = (recent[recent.length-1].prijs - recent[0].prijs) / recent[0].prijs;
    l.priceTrend = pct < -0.02 ? 'dalend' : pct > 0.02 ? 'stijgend' : 'stabiel';
  }

  const bronStats = {};
  for (const l of nieuw) { const b = l.bron || 'Onbekend'; bronStats[b] = (bronStats[b] || 0) + 1; }
  const rapport = { timestamp: new Date().toISOString(), totaalNieuw: nieuw.length, bronnen: bronStats };
  const rapportPad = path.join(__dirname, '..', 'data', 'scrape-report.json');
  fs.writeFileSync(rapportPad, JSON.stringify(rapport, null, 2));
  console.log('\nÃÂ°ÃÂÃÂÃÂ Scraper rapport:');
  for (const [bron, n] of Object.entries(bronStats)) console.log(`   ${bron.padEnd(14)}: ${n} listings`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rijen = Object.entries(bronStats).map(([b,n]) => `| ${b} | ${n} |`).join('\n');
    const summary = ['## ÃÂ°ÃÂÃÂÃÂ Scraper Rapport', `**${rapport.timestamp.slice(0,10)}** ÃÂ¢ÃÂÃÂ ${nieuw.length} listings vandaag`, '', '| Bron | Listings |', '|------|----------|', rijen, '', `**Totaal in database:** ${Object.keys(byId).length}`].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }
  // Normaliseer transmissie (AutoScout24: AutomatischÃ¢ÂÂAutomaat, HandmatigÃ¢ÂÂHandgeschakeld)
  for (const l of (data.listings || [])) {
    const trRaw = (l.transmissie || '').trim();
    if (/automatisch/i.test(trRaw)) l.transmissie = 'Automaat';
    else if (/handmatig|manueel/i.test(trRaw)) l.transmissie = 'Handgeschakeld';
  }
  fs.writeFileSync(outPath, JSON.stringify(data));
  // ââ listings-top.json: top 5000 by dealScore voor snelle homepage load
  // De volledige imgs-galerij (~49% van de databytes) wordt hier weggelaten - die is
  // alleen nodig in de detailweergave, niet in de resultatenlijst (die gebruikt imgSrc).
  // De achtergrond-load van listings.json (met imgs) vult dit binnen enkele seconden aan.
  const _topL = [...(data.listings||[])].sort((a,b)=>(b.dealScore||0)-(a.dealScore||0)).slice(0,5000)
    .map(function(l){ var _c = Object.assign({}, l); delete _c.imgs; return _c; });
  const _topData = Object.assign({}, data, {listings: _topL, isSubset: true, subsetSize: 5000});
  const _topPath = path.join(process.cwd(), 'data', 'listings-top.json');
  fs.writeFileSync(_topPath, JSON.stringify(_topData));
  console.log(' listings-top.json: top ' + _topL.length + ' deals geschreven');
  // ── listings-lean.json: ALLE advertenties, ook zonder imgs (performance-
  // audit 31 aug) -- dit is wat de frontend op de achtergrond bijlaadt nadat
  // listings-top.json getoond is (zie window._laadVolledig in index.html).
  // imgs was met ~9,26MB verreweg de grootste velden-kostenpost van het volle
  // listings.json (24MB totaal); alleen de detail-foto-gallerij gebruikt dat
  // veld, en die heeft in index.html inmiddels een vangnet dat bij een
  // ontbrekende imgs-array alsnog het bijbehorende merken/<merk>.json ophaalt
  // (dat wél altijd imgs bevat) -- dus geen zichtbaar verlies, wel ~39%
  // minder bytes voor iedereen die deze achtergrond-load daadwerkelijk
  // binnenhaalt. data/listings.json zelf blijft ongewijzigd (volledige
  // fidelity, o.a. voor de eigen merge-logica hierboven en scripts/check-
  // scrape-health.js).
  const _leanL = (data.listings||[]).map(function(l){ var _c = Object.assign({}, l); delete _c.imgs; return _c; });
  const _leanData = Object.assign({}, data, {listings: _leanL});
  const _leanPath = path.join(process.cwd(), 'data', 'listings-lean.json');
  fs.writeFileSync(_leanPath, JSON.stringify(_leanData));
  console.log(' listings-lean.json: ' + _leanL.length + ' listings zonder imgs geschreven');
  // ââ Per-merk JSON bestanden genereren (voor lazy brand loading) ââ
  const _merkDir = path.join(process.cwd(), 'data', 'merken');
  if (!fs.existsSync(_merkDir)) fs.mkdirSync(_merkDir, { recursive: true });
  const _merkGroups = {};
  (data.listings||[]).forEach(function(l){
    const m = (l.merk||'overig').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(!_merkGroups[m]) _merkGroups[m] = [];
    _merkGroups[m].push(l);
  });
  let _merkCount = 0;
  for(const [_merk, _mListing] of Object.entries(_merkGroups)){
    if(_mListing.length >= 5){
      const _mData = Object.assign({}, data, {listings: _mListing, isSubset: false, merk: _merk});
      fs.writeFileSync(path.join(_merkDir, _merk+'.json'), JSON.stringify(_mData));
      _merkCount++;
    }
  }
  console.log(' merken/: ' + _merkCount + ' merk-bestanden geschreven');
  // Ã¢ÂÂÃ¢ÂÂ Sitemap genereren Ã¢ÂÂÃ¢ÂÂ
  // Let op: hier bewust GEEN /?merk=xxx-URL per merk meer. Die canonicaliseren
  // toch allemaal terug naar de homepage (zie <link rel="canonical"> in
  // index.html), dus Google ziet ze als duplicate content -- puur
  // crawlbudget-verspilling. De echte, indexeerbare merk-landingspagina's zijn
  // /occasions/[merk]/, die generate-occasions.js hierna aan deze sitemap
  // toevoegt.
  const _today = new Date().toISOString().slice(0,10);
  const _BASE = 'https://carkijker.nl/';
  const _sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>' + _BASE + '</loc>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '    <lastmod>' + _today + '</lastmod>',
    '  </url>',
    '</urlset>'
  ].join('\n');
  const _sitemapPad = path.join(process.cwd(), 'sitemap.xml');
  fs.writeFileSync(_sitemapPad, _sitemap);
  console.log('\u{1F5FA}\uFE0F  Sitemap: basis geschreven (merk-queryvarianten verwijderd) Ã¢ÂÂ ' + _sitemapPad);

  // Ã¢ÂÂÃ¢ÂÂ Marktstatistieken bijwerken Ã¢ÂÂÃ¢ÂÂ
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
    console.log(`Ã°ÂÂÂ  Markthistorie: ${Object.keys(_segStats).length} segmenten Ã¢ÂÂ ${_mhPath}`);
  } catch (_mhErr) { console.warn('Ã¢ÂÂ Ã¯Â¸Â  Markthistorie fout:', _mhErr.message); }

  // Scraper-gezondheid per bron bijhouden: rollend venster van actieve
  // advertenties per bron, zodat scripts/check-scrape-health.js kan zien of
  // een bron plotseling wegvalt of fors inzakt (zoals met AutoTrack/AutoTrader
  // gebeurde — dat bleef maandenlang onopgemerkt zonder dit signaal).
  try {
    const _shPath = path.join(process.cwd(), 'data', 'scrape-health.json');
    const _today = new Date().toISOString().slice(0, 10);
    const _tellingen = {};
    for (const l of (data.listings || [])) {
      if (!l.bron) continue;
      _tellingen[l.bron] = (_tellingen[l.bron] || 0) + 1;
    }
    let _shData = [];
    try { _shData = JSON.parse(fs.readFileSync(_shPath, 'utf8')); } catch(e) {}
    _shData = _shData.filter(d => d.datum !== _today);
    _shData.push({ datum: _today, tellingen: _tellingen });
    if (_shData.length > 30) _shData = _shData.slice(-30);
    fs.writeFileSync(_shPath, JSON.stringify(_shData));
    console.log('Scrape-health bijgewerkt: ' + Object.keys(_tellingen).length + ' bronnen -> ' + _shPath);
  } catch (_shErr) { console.warn('Scrape-health fout:', _shErr.message); }

  console.log(`ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Opgeslagen naar ${outPath}`);
}

main().catch(e => { console.error('ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Fout:', e); process.exit(1); });
