// netlify/functions/scrape.js
// Dagelijkse scraper — draait elke dag om 06:00
// Scrapt: Marktplaats, AutoScout24, Gaspedaal, ViaBOVAG, Autotrader, Autoline
// Slaat op als data/listings.json in de GitHub repo

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Kawsfan/autovergelijker';
const DATA_FILE = 'data/listings.json';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

// ── MARKTPLAATS ──────────────────────────────────────────────────────────────
async function scrapeMarktplaats() {
  const listings = [];
  const searches = [
    'https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/toyota/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/volkswagen/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100&currentPage=1',
    'https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100&currentPage=2',
    'https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100&currentPage=3',
    'https://www.marktplaats.nl/l/auto-s/ford/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/opel/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/renault/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/peugeot/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/honda/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/mercedes-benz/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/audi/?numberOfResultsPerPage=100',
    'https://www.marktplaats.nl/l/auto-s/audi/?numberOfResultsPerPage=100&currentPage=1',
    'https://www.marktplaats.nl/l/auto-s/audi/?numberOfResultsPerPage=100&currentPage=2',
    'https://www.marktplaats.nl/l/auto-s/volkswagen/?numberOfResultsPerPage=100&currentPage=1',
    'https://www.marktplaats.nl/l/auto-s/volkswagen/?numberOfResultsPerPage=100&currentPage=2',
  ];

  for (const url of searches) {
    try {
      const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerMarktplaats(html, listings.length);
      listings.push(...found);
    } catch (e) { console.error('MP error:', e.message); }
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
    const jaar = jm ? parseInt(jm[1]) : null;
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
    results.push({
      id: 'mp-' + (offset + results.length),
      bron: 'Marktplaats',
      titel, prijs, jaar,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: bf, carrosserie: cr, transmissie: tr, locatie,
      url: fullUrl,
      imgSrc: img ? img[1] : '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
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
    'https://www.autoscout24.nl/lst/bmw?sort=age&desc=0&ustate=N%2CU&size=20&page=1',
    'https://www.autoscout24.nl/lst/bmw?sort=age&desc=0&ustate=N%2CU&size=20&page=2',
    'https://www.autoscout24.nl/lst/bmw?sort=age&desc=0&ustate=N%2CU&size=20&page=3',
    'https://www.autoscout24.nl/lst/audi?sort=age&desc=0&ustate=N%2CU&size=20&page=1',
    'https://www.autoscout24.nl/lst/audi?sort=age&desc=0&ustate=N%2CU&size=20&page=2',
    'https://www.autoscout24.nl/lst/mercedes-benz?sort=age&desc=0&ustate=N%2CU&size=20&page=1',
    'https://www.autoscout24.nl/lst/mercedes-benz?sort=age&desc=0&ustate=N%2CU&size=20&page=2',
    'https://www.autoscout24.nl/lst/volkswagen?sort=age&desc=0&ustate=N%2CU&size=20&page=1',
    'https://www.autoscout24.nl/lst/volkswagen?sort=age&desc=0&ustate=N%2CU&size=20&page=2',
  ];
  for (const url of pages) {
    try {
      const resp = await fetch(url, { headers: { ...HEADERS, 'Referer': 'https://www.autoscout24.nl/' }, redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      const found = parseerAutoScout24(html, listings.length);
      listings.push(...found);
    } catch (e) { console.error('AS24 error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

function parseerAutoScout24(html, offset = 0) {
  const results = [], gezien = new Set();
  // AS24 puts data in JSON inside script tags
  const jsonMatch = html.match(/__INITIAL_STATE__\s*=\s*({.+?})\s*;<\/script>/s)
    || html.match(/window\.__PRELOADED_STATE__\s*=\s*({.+?})\s*;<\/script>/s);

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const items = data?.listings?.items || data?.response?.ads || [];
      for (const item of items) {
        if (results.length >= 60) break;
        const url = 'https://www.autoscout24.nl' + (item.url || '');
        if (gezien.has(url)) continue; gezien.add(url);
        results.push({
          id: 'as24-' + (offset + results.length),
          bron: 'AutoScout24',
          titel: [item.vehicle?.make, item.vehicle?.model, item.vehicle?.version].filter(Boolean).join(' ').substring(0, 70),
          prijs: item.prices?.public?.value || item.price || 0,
          jaar: item.vehicle?.offerRegistrationDate?.year || null,
          km: item.vehicle?.mileage?.value || null,
          brandstof: vertaalBrandstof(item.vehicle?.fuelCategory?.id || ''),
          carrosserie: item.vehicle?.bodyType?.name || '',
          transmissie: item.vehicle?.transmissionType?.name || '',
          locatie: item.seller?.city || 'Nederland',
          url: url || 'https://www.autoscout24.nl',
          imgSrc: item.images?.[0]?.url || '',
          bijgewerkt: new Date().toISOString().split('T')[0]
        });
      }
      return results;
    } catch (e) {}
  }

  // Fallback: parse HTML
  const re = /href="(\/auto\/[^"]+\/id-\d+[^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 60) {
    const href = m[1], fullUrl = 'https://www.autoscout24.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 3000);
    const pm = ctx.match(/(\d{1,3}(?:\.\d{3})*)\s*€|€\s*(\d{1,3}(?:\.\d{3})*)/);
    if (!pm) continue;
    const prijs = parseInt((pm[1] || pm[2]).replace(/\./g, ''));
    if (!prijs || prijs < 500) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    results.push({
      id: 'as24-' + (offset + results.length),
      bron: 'AutoScout24',
      titel: href.split('/').slice(-2, -1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 70) || 'Auto',
      prijs, jaar: jm ? parseInt(jm[1]) : null,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: '', carrosserie: '', transmissie: '',
      locatie: 'Nederland', url: fullUrl, imgSrc: '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
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
    'https://www.gaspedaal.nl/occasion/bmw/occasions?page=2',
    'https://www.gaspedaal.nl/occasion/bmw/occasions?page=3',
    'https://www.gaspedaal.nl/occasion/audi/occasions',
    'https://www.gaspedaal.nl/occasion/audi/occasions?page=2',
    'https://www.gaspedaal.nl/occasion/mercedes-benz/occasions',
    'https://www.gaspedaal.nl/occasion/mercedes-benz/occasions?page=2',
    'https://www.gaspedaal.nl/occasion/volkswagen/occasions?page=2',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerGaspedaal(html, listings.length));
    } catch (e) { console.error('Gaspedaal error:', e.message); }
    await sleep(1500);
  }
  return listings;
}

function parseerGaspedaal(html, offset = 0) {
  const results = [], gezien = new Set();
  const re = /href="(\/occasion\/[^/]+\/[^/]+\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 60) {
    const href = m[1], fullUrl = 'https://www.gaspedaal.nl' + href;
    if (gezien.has(fullUrl) || !href.match(/\d+/)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 2000);
    const pm = ctx.match(/€\s*([\d.,]+)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/[.,]/g, '').substring(0, 7));
    if (!prijs || prijs < 500 || prijs > 200000) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const img = ctx.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    const slugParts = href.split('/').filter(Boolean);
    const titel = slugParts.slice(-2).join(' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 70);
    if (titel.length < 4) continue;
    results.push({
      id: 'gp-' + (offset + results.length),
      bron: 'Gaspedaal',
      titel, prijs, jaar: jm ? parseInt(jm[1]) : null,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: '', carrosserie: '', transmissie: '',
      locatie: 'Nederland', url: fullUrl,
      imgSrc: img ? img[1] : '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ── VIABOVAG ─────────────────────────────────────────────────────────────────
async function scrapeViaBOVAG() {
  const listings = [];
  const urls = [
    'https://www.viabovag.nl/occasions?sortOrder=DateDescending&pageSize=50&pageIndex=1',
    'https://www.viabovag.nl/occasions?sortOrder=DateDescending&pageSize=50&pageIndex=2',
    'https://www.viabovag.nl/occasions?sortOrder=DateDescending&pageSize=50&pageIndex=3',
    'https://www.viabovag.nl/occasions/bmw?sortOrder=DateDescending&pageSize=50&pageIndex=1',
    'https://www.viabovag.nl/occasions/bmw?sortOrder=DateDescending&pageSize=50&pageIndex=2',
    'https://www.viabovag.nl/occasions/audi?sortOrder=DateDescending&pageSize=50&pageIndex=1',
    'https://www.viabovag.nl/occasions/audi?sortOrder=DateDescending&pageSize=50&pageIndex=2',
    'https://www.viabovag.nl/occasions/mercedes-benz?sortOrder=DateDescending&pageSize=50&pageIndex=1',
    'https://www.viabovag.nl/occasions/volkswagen?sortOrder=DateDescending&pageSize=50&pageIndex=1',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerViaBOVAG(html, listings.length));
    } catch (e) { console.error('ViaBOVAG error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

function parseerViaBOVAG(html, offset = 0) {
  const results = [], gezien = new Set();

  // Try JSON in page
  const jsonMatch = html.match(/"cars"\s*:\s*(\[.+?\])\s*[,}]/s)
    || html.match(/window\.__NUXT__\s*=\s*(.+?)\s*<\/script>/s);

  // HTML fallback
  const re = /href="(\/occasion\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 60) {
    const href = m[1], fullUrl = 'https://www.viabovag.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 2000);
    const pm = ctx.match(/€\s*[\s]*([\d.,]+)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/[.,]/g, '').substring(0, 7));
    if (!prijs || prijs < 500 || prijs > 200000) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const img = ctx.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    let bf = '';
    if (/[Ee]lektrisch|electric/i.test(ctx)) bf = 'Elektrisch';
    else if (/[Hh]ybride/i.test(ctx)) bf = 'Hybride';
    else if (/[Dd]iesel/i.test(ctx)) bf = 'Diesel';
    else if (/[Bb]enzine|[Pp]etrol/i.test(ctx)) bf = 'Benzine';
    const slug = href.split('/').pop() || '';
    const titel = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 70);
    if (titel.length < 4) continue;
    results.push({
      id: 'vb-' + (offset + results.length),
      bron: 'ViaBOVAG',
      titel, prijs, jaar: jm ? parseInt(jm[1]) : null,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: bf, carrosserie: '', transmissie: '',
      locatie: 'Nederland', url: fullUrl,
      imgSrc: img ? img[1] : '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
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
      const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerAutotrader(html, listings.length));
    } catch (e) { console.error('Autotrader error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

function parseerAutotrader(html, offset = 0) {
  const results = [], gezien = new Set();
  const re = /href="(\/auto\/[^"]+\/\d+[^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 60) {
    const href = m[1], fullUrl = 'https://www.autotrader.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 2000);
    const pm = ctx.match(/€\s*([\d.,]+)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/[.,]/g, '').substring(0, 7));
    if (!prijs || prijs < 500 || prijs > 200000) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const img = ctx.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    let bf = '';
    if (/[Ee]lektrisch/i.test(ctx)) bf = 'Elektrisch';
    else if (/[Hh]ybride/i.test(ctx)) bf = 'Hybride';
    else if (/[Dd]iesel/i.test(ctx)) bf = 'Diesel';
    else if (/[Bb]enzine/i.test(ctx)) bf = 'Benzine';
    const slug = href.split('/').slice(-2, -1)[0] || '';
    const titel = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 70);
    if (titel.length < 4) continue;
    results.push({
      id: 'at-' + (offset + results.length),
      bron: 'Autotrader',
      titel, prijs, jaar: jm ? parseInt(jm[1]) : null,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: bf, carrosserie: '', transmissie: '',
      locatie: 'Nederland', url: fullUrl,
      imgSrc: img ? img[1] : '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
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
      const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      listings.push(...parseerAutoline(html, listings.length));
    } catch (e) { console.error('Autoline error:', e.message); }
    await sleep(2000);
  }
  return listings;
}

function parseerAutoline(html, offset = 0) {
  const results = [], gezien = new Set();
  const re = /href="(\/auto-personenautos\/[^"]+\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 40) {
    const href = m[1], fullUrl = 'https://autoline.nl' + href;
    if (gezien.has(fullUrl)) continue; gezien.add(fullUrl);
    const ctx = html.substring(Math.max(0, m.index - 100), m.index + 2000);
    const pm = ctx.match(/€\s*([\d.,]+)/);
    if (!pm) continue;
    const prijs = parseInt(pm[1].replace(/[.,]/g, '').substring(0, 7));
    if (!prijs || prijs < 500 || prijs > 200000) continue;
    const jm = ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);
    const km = ctx.match(/([\d.]+)\s*km/i);
    const img = ctx.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    const slug = href.split('/').filter(Boolean).pop() || '';
    const titel = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 70);
    if (titel.length < 4) continue;
    results.push({
      id: 'al-' + (offset + results.length),
      bron: 'Autoline',
      titel, prijs, jaar: jm ? parseInt(jm[1]) : null,
      km: km ? parseInt(km[1].replace(/\./g, '')) : null,
      brandstof: '', carrosserie: '', transmissie: '',
      locatie: 'Nederland', url: fullUrl,
      imgSrc: img ? img[1] : '',
      bijgewerkt: new Date().toISOString().split('T')[0]
    });
  }
  return results;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function vertaalBrandstof(id) {
  const map = { E: 'Elektrisch', H: 'Hybride', D: 'Diesel', B: 'Benzine', LPG: 'LPG' };
  return map[id] || '';
}

a_�nc function commitNaarGitHub(listings) {
  const inhoud = JSON.stringify({
    bijgewerkt: new Date().toISOString(),
    totaal: listings.length,
    bronnen: [...new Set(listings.map(l => l.bron))],
    listings
  }, null, 2);

  const b64 = Buffer.from(inhoud).toString('base64');

  // Haal huidige SHA op
  let sha;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'autovergelijker-scraper' }
    });
    if (r.ok) sha = (await r.json()).sha;
  } catch (e) {}

  const body = { message: `Dagelijkse update: ${listings.length} auto's van ${[...new Set(listings.map(l => l.bron))].join(', ')}`, content: b64 };
  if (sha) body.sha = sha;

  const resp = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'autovergelijker-scraper'
    },
    body: JSON.stringify(body)
  });

  const result = await resp.json();
  return { status: resp.status, commit: result.commit?.sha };
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
exports.handler = async function(event) {
  console.log('🚗 Dagelijkse scraper gestart:', new Date().toISOString());

  if (!GITHUB_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN niet ingesteld' }) };
  }

  const alle = [];

  console.log('Scraping Marktplaats...');
  alle.push(...await scrapeMarktplaats());
  console.log(`Marktplaats: ${alle.length}`);

  console.log('Scraping AutoScout24...');
  const as24 = await scrapeAutoScout24();
  alle.push(...as24);
  console.log(`AutoScout24: ${as24.length}`);

  console.log('Scraping Gaspedaal...');
  const gp = await scrapeGaspedaal();
  alle.push(...gp);
  console.log(`Gaspedaal: ${gp.length}`);

  console.log('Scraping ViaBOVAG...');
  const vb = await scrapeViaBOVAG();
  alle.push(...vb);
  console.log(`ViaBOVAG: ${vb.length}`);

  console.log('Scraping Autotrader...');
  const at = await scrapeAutotrader();
  alle.push(...at);
  console.log(`Autotrader: ${at.length}`);

  console.log('Scraping Autoline...');
  const autoline = await scrapeAutoline();
  alle.push(...autoline);
  console.log(`Autoline: ${autoline.length}`);

  console.log(`Totaal: ${alle.length} auto's. Opslaan naar GitHub...`);
  const commitResult = await commitNaarGitHub(alle);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      succes: true,
      totaal: alle.length,
      bronnen: [...new Set(alle.map(l => l.bron))],
      commit: commitResult
    })
  };
};
