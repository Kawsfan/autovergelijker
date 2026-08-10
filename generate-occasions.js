#!/usr/bin/env node
// generate-occasions.js
// Genereert statische HTML-pagina's voor /occasions/* vanuit data/listings.json
// Draait na de dagelijkse scrape via GitHub Actions

const fs   = require('fs');
const path = require('path');

// Config
const LISTINGS_PATH   = path.join(__dirname, 'data', 'listings.json');
const MARKT_HIST_PATH = path.join(__dirname, 'data', 'markt-history.json');
const OUT_DIR         = path.join(__dirname, 'occasions');
const SITE_ORIGIN     = 'https://carkijker.nl';

// Marktgeschiedenis (dagelijkse mediaan per merk+model, zie scrape.js) --
// dezelfde bron als de prijstrend in de Marktanalyse-modal op de homepage,
// hier gebruikt om ook de statische SEO-pagina's een actuele trendzin te
// geven i.p.v. alleen een momentopname. Zelfde sleutel-afleiding als
// scrape.js's _key, zodat beide altijd matchen.
let MARKT_HISTORIE = [];
try { MARKT_HISTORIE = JSON.parse(fs.readFileSync(MARKT_HIST_PATH, 'utf8')); } catch (e) { MARKT_HISTORIE = []; }
function marktSegmentKey(merk, model) {
  return (merk + (model ? '_' + model : '')).toLowerCase().replace(/\s+/g, '_');
}
// Gebruikt de échte merk/model-veldwaarden van de advertenties zelf (niet de
// url-slug) voor de sleutel -- gegarandeerd identiek aan hoe scrape.js de
// segmenten opbouwt, i.p.v. de slug proberen terug te vertalen.
function berekenTrendVoorPagina(filtered) {
  if (!filtered.length || !MARKT_HISTORIE.length) return null;
  const merk = filtered[0].merk, model = filtered[0].model;
  if (!merk || !model) return null;
  const key = marktSegmentKey(merk, model);
  const reeks = MARKT_HISTORIE
    .map(d => ({ datum: d.datum, seg: d.segmenten && d.segmenten[key] }))
    .filter(x => x.seg && x.seg.n >= 3)
    .sort((a, b) => a.datum < b.datum ? -1 : (a.datum > b.datum ? 1 : 0));
  if (reeks.length < 2) return null;
  const eerste = reeks[0].seg.med, laatste = reeks[reeks.length - 1].seg.med;
  const delta = laatste - eerste;
  const pct = eerste ? Math.round(delta / eerste * 1000) / 10 : 0;
  return { nDagen: reeks.length, delta, pct, vanaf: reeks[0].datum, huidig: laatste };
}
const GA_SNIPPET =
  '<script async src="https://www.googletagmanager.com/gtag/js?id=G-TD2KWCXTV3"><\/script>' +
  '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' +
  "gtag('js',new Date());gtag('config','G-TD2KWCXTV3');<\/script>";
// Zelfde delegated click-listener als index.html (zie outUrl() aldaar): elke
// advertentiekaart hier is al één grote <a data-out ...>, dus één listener op
// document volstaat i.p.v. per kaart een handler. Geen server-kant nodig --
// puur client-side, net als op de homepage.
const OUT_TRACK_SNIPPET =
  '<script>document.addEventListener(\'click\',function(e){' +
  'var el=e.target.closest&&e.target.closest(\'[data-out]\');' +
  'if(!el||typeof gtag!==\'function\')return;' +
  "gtag('event','click_uitgaande_listing',{" +
  "bron:el.getAttribute('data-bron')||''," +
  "merk:el.getAttribute('data-merk')||''," +
  "prijs:Number(el.getAttribute('data-prijs'))||undefined});" +
  '});<\/script>';
// Voegt UTM's toe aan een uitgaande listing-URL, zodat de bron-site ziet dat
// het verkeer van Carkijker komt (nodig zodra er affiliate-deals zijn).
function outUrl(url, bron) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'carkijker');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', (bron || 'occasions').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    return u.toString();
  } catch (e) { return url; }
}
// Fallback voor een advertentie-foto die wél een imgSrc had maar niet laadt
// (404, hotlink-blokkade) -- zonder dit toont de browser hier het kale
// kapot-plaatje-icoon, dezelfde bugklasse als eerder al gefixt voor de
// dynamische kaarten op de homepage (index.html/_fotoLeegHtml). De
// no-imgSrc-placeholder (FOTO_LEEG_HTML) gebruikt bewust dezelfde markup,
// zodat beide gevallen er identiek uitzien.
const FOTO_LEEG_HTML = '<div class="auto-foto-leeg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13"/><path d="M3 13h18v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V16H6.5v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V13Z"/><circle cx="7" cy="16" r="1.2"/><circle cx="17" cy="16" r="1.2"/></svg><span>Geen foto beschikbaar</span></div>';
const FOTO_FOUT_SCRIPT = '<script>function _fotoFout(img){img.insertAdjacentHTML("afterend",' + JSON.stringify(FOTO_LEEG_HTML) + ');img.remove();}<\/script>';
const MIN_MERK_COUNT = 3;
const MIN_MODEL_COUNT = 2;
const MAX_MODELS     = 10;

// Huisstijl-tokens, gelijk aan de CSS custom properties in index.html
// (--oranje, --donker, --tekst, --bg, ...). Deze pagina's zijn losse
// statische bestanden zonder gedeelde stylesheet, dus hardcoded overgenomen.
// OCC_STYLE is voor de merk/model-pagina's (buildPage); buildStadPage heeft
// een eigen stylesheet omdat de kaartlayout daar structureel anders is
// (verticale kaart met volle-breedte foto i.p.v. horizontale rij).
const OCC_STYLE =
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{font-family:"Segoe UI",Arial,sans-serif;background:#f5f5f0;color:#333;line-height:1.5}' +
  'nav{background:rgba(255,255,255,.96);border-bottom:1px solid rgba(0,0,0,.08);padding:0 1.1rem;height:56px;' +
  'display:flex;align-items:center;gap:.9rem;position:sticky;top:0;z-index:200;box-shadow:0 1px 0 rgba(0,0,0,.04);' +
  'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:.875rem;overflow-x:auto;white-space:nowrap}' +
  '.logo{font-size:1.15rem;font-weight:800;color:#d14413;letter-spacing:-.5px;text-decoration:none;flex-shrink:0}' +
  '.logo span{color:#1a1a2e}' +
  'nav a{color:#d14413;text-decoration:none}nav a+a::before{content:" \\203a ";color:#aaa;margin:0 .3rem}' +
  '.container{max-width:960px;margin:0 auto;padding:1rem 1rem 3rem}' +
  'h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .3rem;color:#1a1a2e}' +
  '.subtitle{color:#666;font-size:.9rem;margin-bottom:1.25rem}' +
  '.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin-bottom:1.25rem}' +
  '.stat{background:#fff;border-radius:12px;padding:.7rem 1rem;border:1px solid rgba(0,0,0,.07);box-shadow:0 1px 4px rgba(0,0,0,.05);display:block;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s}' +
  '.stat:hover{border-color:#d14413;box-shadow:0 1px 4px rgba(0,0,0,.08)}' +
  '.stat-lbl{display:block;font-size:.72rem;color:#888;margin-bottom:.15rem}.stat strong{font-size:.95rem;color:#1a1a2e}' +
  '.model-nav{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem}' +
  '.model-link{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:20px;padding:.3rem .85rem;font-size:.83rem;color:#d14413;text-decoration:none;transition:border-color .15s}' +
  '.model-link:hover{border-color:#d14413}.model-link span{color:#aaa;font-size:.78rem}' +
  '.back-link{display:inline-block;margin-top:2rem;color:#d14413;font-size:.875rem;text-decoration:none;font-weight:600}' +
  '.empty{text-align:center;padding:3rem;color:#888}' +
  '.geo-section{margin-top:2rem;padding:1.25rem;background:#fff;border-radius:14px;border:1px solid rgba(0,0,0,.07);box-shadow:0 1px 4px rgba(0,0,0,.06)}' +
  '.geo-section h2{font-size:1rem;margin-bottom:.5rem;color:#1a1a2e}.geo-section p{font-size:.875rem;color:#444;line-height:1.6}' +
  '.geo-section h3{color:#333}.geo-section a{color:#d14413}' +
  '.geo-section .model-intro-blok{background:#fff3e0;border-left:4px solid #d14413;padding:.75rem 1rem;margin-bottom:.75rem;border-radius:0 8px 8px 0;font-size:.9rem;color:#7a3510}' +
  '.kooptip{background:#fff3e0;border-left:3px solid #d14413;padding:.6rem .8rem;border-radius:0 6px 6px 0;margin-bottom:.5rem}' +
  // Dezelfde .auto-card-component als de homepage (index.html), zodat de
  // occasion-kaarten er identiek uitzien i.p.v. een losse, eigen kaartstijl.
  '.auto-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}' +
  '.auto-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.07);display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:transform .18s ease,box-shadow .18s ease}' +
  '.auto-card:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(0,0,0,.11)}' +
  '.auto-foto{position:relative;aspect-ratio:16/9;background:#f0f0eb;overflow:hidden}' +
  '.auto-foto img{width:100%;height:100%;object-fit:cover}' +
  '.auto-foto-leeg{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#888;background:#f0f0eb}.auto-foto-leeg span{font-size:11.5px}' +
  '.bron-label{position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#fff;background:#888}' +
  '.bron-marktplaats{background:#0063D3}.bron-gaspedaal{background:#E87722}.bron-viabovag{background:#003082}.bron-autotrack{background:#1B5FA8}.bron-autoscout24{background:#FF6600}.bron-autotrader{background:#0057B8}' +
  '.auto-info{padding:14px 16px 12px;flex:1;display:flex;flex-direction:column;gap:6px}' +
  '.auto-info h3{font-size:14px;font-weight:700;margin:0;color:#1a1a2e;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.38}' +
  '.auto-prijs-groot{font-size:21px;font-weight:800;color:#111;letter-spacing:-.4px;margin:2px 0 0}' +
  '.auto-specs-row{display:flex;gap:10px;flex-wrap:wrap;margin:2px 0}' +
  '.auto-spec-chip{font-size:11.5px;color:#6b7280;display:flex;align-items:center;gap:3px}.auto-spec-chip svg{flex-shrink:0}';

const MERKEN_DISPLAY = {
  bmw: 'BMW', vw: 'Volkswagen', volkswagen: 'Volkswagen',
  audi: 'Audi', mercedes: 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
  toyota: 'Toyota', ford: 'Ford', opel: 'Opel', renault: 'Renault',
  peugeot: 'Peugeot', honda: 'Honda', nissan: 'Nissan', mazda: 'Mazda',
  kia: 'Kia', hyundai: 'Hyundai', seat: 'SEAT', skoda: 'Skoda',
  volvo: 'Volvo', tesla: 'Tesla', mini: 'MINI', fiat: 'Fiat',
  porsche: 'Porsche', dacia: 'Dacia', citroen: 'Citroen', polestar: 'Polestar',
  suzuki: 'Suzuki', mitsubishi: 'Mitsubishi', alfa: 'Alfa Romeo',
  'alfa-romeo': 'Alfa Romeo', 'alfa romeo': 'Alfa Romeo', jeep: 'Jeep',
  // cap() title-cast alleen de allereerste letter van de hele string, dus
  // zonder expliciete entry hier werden deze meerwoordige merken op de
  // homepage/occasions-pagina's als "Land rover", "Lynk & co" etc. getoond.
  'land rover': 'Land Rover', 'aston martin': 'Aston Martin', 'lynk & co': 'Lynk & Co',
};

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Voorkomt dat een titel met een letterlijke "</script>"-substring het JSON-LD
// script-blok voortijdig afsluit en de rest als losse HTML injecteert.
function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
function fmt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function bronClass(bron) {
  return (bron || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
// Zelfde kaart-component (markup + classes) als .auto-card op de homepage,
// zodat een occasion-kaart er hier identiek uitziet -- i.p.v. de eigen,
// losstaande kaartstijl die deze pagina's eerder hadden.
function renderAutoCard(a, fallbackTitel) {
  const titel = a.titel || fallbackTitel || '';
  const specs = [
    a.jaar ? '<span class="auto-spec-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + a.jaar + '</span>' : '',
    a.km != null ? '<span class="auto-spec-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + fmt(a.km) + ' km</span>' : '',
    a.brandstof ? '<span class="auto-spec-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V8l9-6 9 6v14"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><rect x="9" y="12" width="6" height="10"/></svg>' + escHtml(a.brandstof) + '</span>' : '',
    a.transmissie ? '<span class="auto-spec-chip">' + escHtml(a.transmissie) + '</span>' : '',
  ].join('');
  return '<a href="' + escHtml(outUrl(a.url, a.bron)) + '" target="_blank" rel="noopener noreferrer" class="auto-card" itemscope itemtype="https://schema.org/Car"' +
    ' data-out data-bron="' + escHtml(a.bron || '') + '" data-merk="' + escHtml(a.merk || '') + '" data-prijs="' + (a.prijs || '') + '">' +
    '<div class="auto-foto">' +
    (a.imgSrc ? '<img src="' + escHtml(a.imgSrc) + '" alt="' + escHtml(titel) + '" loading="lazy" width="280" height="158" onerror="_fotoFout(this)">' : FOTO_LEEG_HTML) +
    (a.bron ? '<span class="bron-label bron-' + bronClass(a.bron) + '">' + escHtml(a.bron) + '</span>' : '') +
    '</div>' +
    '<div class="auto-info">' +
    '<h3 itemprop="name">' + escHtml(titel) + '</h3>' +
    '<div class="auto-prijs-groot" itemprop="offers" itemscope itemtype="https://schema.org/Offer"><span itemprop="price" content="' + (a.prijs || '') + '">' + (a.prijs ? '&euro; ' + fmt(a.prijs) : 'Prijs op aanvraag') + '</span><meta itemprop="priceCurrency" content="EUR"></div>' +
    '<div class="auto-specs-row">' + specs + '</div>' +
    '</div></a>';
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function slugToDisplay(slug) { return MERKEN_DISPLAY[slug.toLowerCase()] || cap(slug); }

// ── Statische "Occasions per merk"-links op de homepage ──
// index.html vult #merken-links-grid ook zelf, client-side (_renderMerkenLinks),
// maar pas nadat listings.json via JS is opgehaald. Crawlers die geen
// JavaScript uitvoeren -- waaronder GPTBot, ClaudeBot, PerplexityBot en CCBot,
// allemaal expliciet toegestaan in robots.txt -- zien dan alleen een lege div
// en dus geen enkele link naar de 450+ occasions-pagina's. Deze functie zet er
// daarom ook een statische set links in (zelfde opmaak/aantal als de
// client-side versie), die bij een live bezoek gewoon door de JS-render wordt
// overschreven zodra de actuele listings binnen zijn.
function updateHomepageMerkenLinks(merkCounts) {
  const indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf-8');
  // Geen slice meer -- voorheen bleven hier hardcoded maar 16 van de 63
  // merk-pagina's over, waardoor de rest (en alles wat daaronder aan
  // modelpagina's hangt) alleen via sitemap.xml bereikbaar was, niet via een
  // klikbare link. Dit is zowel het statische blok voor niet-JS-crawlers
  // (GPTBot/ClaudeBot/PerplexityBot/CCBot) als de basis die de client-side
  // render (zie index.html _renderMerkenLinks) bij een live bezoek overschrijft.
  const top = Object.entries(merkCounts)
    .filter(function(e) { return e[1] >= MIN_MERK_COUNT; })
    .sort(function(a, b) { return b[1] - a[1]; });
  if (!top.length) return;
  const links = top.map(function(e) {
    return '<a href="/occasions/' + e[0] + '/" style="display:inline-flex;align-items:center;gap:.3rem;background:#fff;border:1px solid #e5e5ea;border-radius:20px;padding:.3rem .9rem;font-size:.83rem;color:#1a56db;text-decoration:none">' +
      slugToDisplay(e[0]) + ' <span style="color:#aaa;font-size:.75rem">(' + e[1] + ')</span></a>';
  }).join('');
  const re = /<div id="merken-links-grid"[^>]*>[\s\S]*?<\/div>/;
  if (!re.test(html)) { console.warn('  index.html: #merken-links-grid niet gevonden, overgeslagen'); return; }
  html = html.replace(re, '<div id="merken-links-grid" style="display:flex;flex-wrap:wrap;gap:.4rem">' + links + '</div>');
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('  index.html: statische merken-links bijgewerkt (' + top.length + ' merken)');
}

// ── Statische "Occasions per stad"-links op de homepage ──
// Zelfde reden als updateHomepageMerkenLinks hierboven (niet-JS-crawlers
// moeten ook de steden-pagina's kunnen vinden), maar STEDEN is een vaste,
// hardcoded lijst i.p.v. data-afgeleid -- dus geen aparte client-side
// her-render nodig zoals bij de merken (die wél per scrape kunnen wisselen).
function updateHomepageStedenLinks(steden) {
  const indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf-8');
  const entries = Object.entries(steden);
  if (!entries.length) return;
  const links = entries.map(function(e) {
    return '<a href="/occasions/' + e[0] + '/" style="display:inline-flex;align-items:center;gap:.3rem;background:#fff;border:1px solid #e5e5ea;border-radius:20px;padding:.3rem .9rem;font-size:.83rem;color:#1a56db;text-decoration:none">' +
      e[1].naam + '</a>';
  }).join('');
  const re = /<div id="steden-links-grid"[^>]*>[\s\S]*?<\/div>/;
  if (!re.test(html)) { console.warn('  index.html: #steden-links-grid niet gevonden, overgeslagen'); return; }
  html = html.replace(re, '<div id="steden-links-grid" style="display:flex;flex-wrap:wrap;gap:.4rem">' + links + '</div>');
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('  index.html: statische steden-links bijgewerkt (' + entries.length + ' steden)');
}

function extraheerMerk(titel) {
  if (!titel) return '';
  const lower = titel.toLowerCase();
  for (const m of Object.keys(MERKEN_DISPLAY)) {
    if (lower.startsWith(m + ' ') || lower === m) return MERKEN_DISPLAY[m];
  }
  return cap(titel.split(' ')[0]);
}

function getStats(filtered) {
  const prijzen = filtered.filter(a => a.prijs).map(a => a.prijs).sort((a, b) => a - b);
  const kms     = filtered.filter(a => a.km).map(a => a.km).sort((a, b) => a - b);
  return {
    gemPrijs: prijzen.length ? Math.round(prijzen.reduce((s, v) => s + v, 0) / prijzen.length) : null,
    medPrijs: prijzen.length ? prijzen[Math.floor(prijzen.length / 2)] : null,
    medKm:    kms.length    ? kms[Math.floor(kms.length / 2)] : null,
    goedkoop: filtered.filter(a => a.prijs).reduce((m, a) => (!m || a.prijs < m.prijs) ? a : m, null),
  };
}

function buildPage({ merkSlug, modelSlug, filtered, listings }) {
  const merkName  = merkSlug  ? slugToDisplay(merkSlug)  : 'Alle merken';
  const modelName = modelSlug ? cap(modelSlug) : null;
  const { gemPrijs, medPrijs, medKm, goedkoop } = getStats(filtered);
  const canonicalPath = merkSlug
    ? (modelSlug ? '/occasions/' + merkSlug + '/' + modelSlug + '/' : '/occasions/' + merkSlug + '/')
    : '/occasions/';
  const pageTitle = modelName
    ? merkName + ' ' + modelName + ' occasions - ' + filtered.length + ' aanbiedingen | Carkijker'
    : merkSlug
      ? merkName + ' occasions kopen - ' + filtered.length + ' tweedehands | Carkijker'
      : 'Tweedehands occasions kopen - ' + listings.length + ' aanbiedingen | Carkijker';
  const metaDesc = [
    filtered.length + ' tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' occasions.',
    gemPrijs ? 'Gemiddelde vraagprijs: EUR ' + fmt(gemPrijs) + '.' : '',
    medKm    ? 'Mediaan km-stand: ' + fmt(medKm) + ' km.' : '',
    'Dagelijks bijgewerkt van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG.',
  ].filter(Boolean).join(' ');

  const schemaItems = filtered.slice(0, 12).map(function(a, i) {
    const item = {
      '@type': 'Car', 'name': a.titel || merkName,
      'brand': { '@type': 'Brand', 'name': a.merk || merkName },
      'offers': { '@type': 'Offer', 'price': a.prijs, 'priceCurrency': 'EUR', 'availability': 'https://schema.org/InStock' },
    };
    if (a.url)         item.offers.url = a.url;
    if (a.jaar)        item.vehicleModelDate = String(a.jaar);
    if (a.km)          item.mileageFromOdometer = { '@type': 'QuantitativeValue', value: a.km, unitCode: 'KMT' };
    if (a.brandstof)   item.fuelType = a.brandstof;
    if (a.transmissie) item.vehicleTransmission = a.transmissie;
    return { '@type': 'ListItem', position: i + 1, item: item };
  });
  const schema = { '@context': 'https://schema.org', '@type': 'ItemList', 'name': pageTitle, 'numberOfItems': filtered.length, 'itemListElement': schemaItems };
  const bcItems = [
    { '@type': 'ListItem', position: 1, name: 'Carkijker', item: SITE_ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: 'Occasions',       item: SITE_ORIGIN + '/occasions/' },
  ];
  if (merkSlug) bcItems.push({ '@type': 'ListItem', position: 3, name: merkName, item: SITE_ORIGIN + '/occasions/' + merkSlug + '/' });
  if (modelSlug) bcItems.push({ '@type': 'ListItem', position: 4, name: modelName, item: SITE_ORIGIN + '/occasions/' + merkSlug + '/' + modelSlug + '/' });
  const bcSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: bcItems };

  // Stat-blokken linken naar het aanbod verderop op dezelfde pagina -- "Goedkoopste"
  // gaat direct naar die specifieke advertentie. De prijs/km-gemiddeldes linken
  // naar de Marktanalyse-modal op de homepage (voorgeselecteerd op dit merk via
  // ?markt=, zie urlNaarMarkt() in index.html), want die geeft meer context dan
  // simpelweg naar de al zichtbare kaarten scrollen.
  // Model apart toevoegen o.b.v. het échte modelveld (niet de url-slug) --
  // urlNaarMarkt() in index.html matcht ?model= case-insensitief tegen de
  // werkelijke optiewaarden van de #mModel-select (gevuld uit a.model), dus
  // moet exact overeenkomen met wat er in de data staat, niet met de
  // (soms afwijkend geslugificeerde) url-vorm.
  const modelVeld = modelSlug && filtered.length ? filtered[0].model : null;
  const marktHref = '/?markt=' + (merkSlug ? encodeURIComponent(merkSlug) : '') +
    (modelVeld ? '&model=' + encodeURIComponent(modelVeld) : '');
  const trend = modelSlug ? berekenTrendVoorPagina(filtered) : null;
  // Afschrijvingscurve: dealScore v2 in scrape.js zet afschrijvingJaar/afschrijvingKm
  // al op elke advertentie die met de bouwjaar+km-regressie is gescoord (zelfde
  // regressie per merk+model, dus elke advertentie in deze groep heeft identieke
  // waarden -- de eerste met beide velden volstaat).
  const afschrijving = modelSlug ? (filtered.find(a => a.afschrijvingJaar && a.afschrijvingKm) || null) : null;
  const statsHtml = '<div class="stats-grid">' +
    (filtered.length ? '<a href="#aanbod" class="stat"><span class="stat-lbl">Aanbod</span><strong>' + filtered.length + ' occasions</strong></a>' : '') +
    (gemPrijs ? '<a href="' + marktHref + '" class="stat"><span class="stat-lbl">Gem. vraagprijs</span><strong>&euro; ' + fmt(gemPrijs) + '</strong></a>' : '') +
    (medPrijs ? '<a href="' + marktHref + '" class="stat"><span class="stat-lbl">Mediaanprijs</span><strong>&euro; ' + fmt(medPrijs) + '</strong></a>' : '') +
    (medKm    ? '<a href="' + marktHref + '" class="stat"><span class="stat-lbl">Mediaan km</span><strong>' + fmt(medKm) + ' km</strong></a>' : '') +
    (goedkoop ? '<a href="' + (goedkoop.url ? escHtml(outUrl(goedkoop.url, goedkoop.bron)) : '#aanbod') + '"' + (goedkoop.url ? ' target="_blank" rel="noopener noreferrer" data-out data-bron="' + escHtml(goedkoop.bron || '') + '" data-merk="' + escHtml(goedkoop.merk || '') + '" data-prijs="' + (goedkoop.prijs || '') + '"' : '') + ' class="stat"><span class="stat-lbl">Goedkoopste</span><strong>&euro; ' + fmt(goedkoop.prijs) + (goedkoop.jaar ? ' (' + goedkoop.jaar + ')' : '') + '</strong></a>' : '') +
    '</div>';

  let merkLinks = '';
  let stedenLinks = '';
  if (!merkSlug) {
    const mc = {};
    listings.forEach(function(a) { const m = (a.merk||'').toLowerCase().trim(); if (m) mc[m] = (mc[m]||0)+1; });
    // Geen slice(0,16) meer -- dit is de /occasions/-hub, de belangrijkste
    // interne-linkbron naar de merk-pagina's. Zie updateHomepageMerkenLinks()
    // hierboven voor dezelfde overweging op de homepage.
    merkLinks = Object.entries(mc).filter(function(e){return e[1]>=MIN_MERK_COUNT;}).sort(function(a,b){return b[1]-a[1];})
      .map(function(e){return '<a href="/occasions/'+e[0]+'/" class="model-link">'+slugToDisplay(e[0])+' <span>('+e[1]+')</span></a>';}).join('');
    // Steden-pagina's (STEDEN, verderop in dit bestand) hadden tot nu toe
    // helemaal geen interne link vanaf welke hub dan ook -- alleen bereikbaar
    // via sitemap.xml. STEDEN is op module-niveau gedefinieerd en al
    // geïnitialiseerd tegen de tijd dat buildPage() daadwerkelijk aangeroepen
    // wordt (zie main-generatielus verderop), dus veilig om hier te gebruiken
    // ondanks dat de const-declaratie verderop in het bestand staat.
    stedenLinks = Object.entries(STEDEN)
      .map(function(e){return '<a href="/occasions/'+e[0]+'/" class="model-link">'+e[1].naam+'</a>';}).join('');
  }
  let modelLinks = '';
  if (merkSlug && !modelSlug) {
    const mc = {};
    filtered.forEach(function(a){
      const words = (a.titel||'').toLowerCase().split(' ');
      if (words.length>1){const m=words[1];if(m&&m.length>1&&!/^\d+$/.test(m))mc[m]=(mc[m]||0)+1;}
    });
    modelLinks = Object.entries(mc).filter(function(e){return e[1]>=MIN_MODEL_COUNT;}).sort(function(a,b){return b[1]-a[1];}).slice(0,MAX_MODELS)
      .map(function(e){return '<a href="/occasions/'+merkSlug+'/'+e[0]+'/" class="model-link">'+cap(e[0])+' <span>('+e[1]+')</span></a>';}).join('');
  }

  const cards = filtered.slice(0,24).map(function(a){ return renderAutoCard(a, merkName); }).join('');


  const MODEL_INTRO = {
    "bmw|3-serie": "De BMW 3 Serie zet de toon in het middensegment: scherpe rijeigenschappen, strakke afwerking en een omvangrijke tweedehandsmarkt. Check voor aankoop de onderhoudshistorie, koelstaat en remdikte — en controleer of de grote km-beurt (60.000 of 90.000 km) is uitgevoerd.",
    "bmw|5-serie": "De BMW 5 Serie is een autobaan-auto: ruim, stil en in goede staat verrassend betaalbaar tweedehands. Controleer de versnellingsbak (8-traps ZF-automaat is robuust bij goed onderhoud) en vraag altijd om de volledige servicehistorie bij een BMW-dealer.",
    "audi|a4": "De Audi A4 heeft een van de stijfste en stilste cabines in zijn klasse. Let op: de 7-traps S tronic bij benzinemodellen voor 2016 kent een bekend slijtagepatroon. Kies bij voorkeur een exemplaar met volledige dealerhistorie en check de distributieketting bij TSI-motoren.",
    "audi|a6": "De Audi A6 rijdt als een executieve limousine maar staat op de tweedehandsmarkt vaak scherp geprijsd. Het quattro-systeem is robuust, maar controle van de voor-differentieel loont bij hogere kilometers. Let ook op luchtvering (indien aanwezig) — reparatie is kostbaar.",
    "volkswagen|golf": "De Golf is de meest verkochte occasion van Nederland — en dat is niet zonder reden. Grote onderdelenbeschikbaarheid, voorspelbaar onderhoud, sterke restwaarde. Controleer bij benzinemodellen de distributieketting en let bij de 7-traps DSG op trillingen bij laag toerental — een bekend aandachtspunt voor 2014.",
    "volkswagen|polo": "De Volkswagen Polo is een van de meest zuinige stadsautos op de tweedehandsmarkt. Modellen vanaf 2017 (MK6) zijn een duidelijke stap vooruit in kwaliteit en veiligheid. Check de APK-status en vraag naar de beurthistorie — Polo's met documentatie zijn eenvoudig door te verkopen.",
    "mercedes-benz|c-klasse": "De Mercedes C-Klasse (W205, 2014–2021) is ruim tweedehands beschikbaar en rijdt premium. Let op: MBUX en oudere COMAND-systemen vragen soms een software-update. Vraag bij aankoop altijd om het volledige servicehistorie — beurten bij een officieel dealer bewaken de restwaarde.",
    "mercedes-benz|e-klasse": "De Mercedes E-Klasse is de meest comfortabele auto in zijn segment — stil, ruim en goed gedempt op de snelweg. Luchtvering is optioneel: als aanwezig, check dan de compressor op slijtage (ongelijkmatige rijhoogte is een teken). Apple CarPlay is praktischer dan het verouderde navigatiesysteem in vroegere modellen.",
    "ford|focus": "De Ford Focus is ruim, betaalbaar en onderhoudsvriendelijk — maar vermijd exemplaren met de 6-traps PowerShift automaat gebouwd voor 2018. Die heeft een bekend koppelingslijtageprobleem dat duur kan uitpakken. De 8-traps automaat in recentere modellen is een stuk robuuster. Benzine schakel is altijd veilig.",
    "toyota|corolla": "De Toyota Corolla Hybrid (E210, 2019–heden) is een van de meest probleemloze occasions in zijn klasse. Toyota's hybridesysteem houdt zichzelf goed in stand — accuproblemen zijn zeldzaam. Controleer de remschijven: hybrides remmen regeneratief, waardoor schijven bij weinig gebruik kunnen roesten.",
    "renault|megane": "De Renault Megane rijdt lekker en is ruimer dan hij eruitziet. De EDC-automaat bij benzinemodellen tot 2017 kan schokkerig schakelen bij koud rijden — controleer dit bij de proefrit. Elektrische systemen zijn een aandachtspunt: vraag om een recente APK met storingsuitleg.",
    "opel|astra": "De Opel Astra K (2015–2021) staat sterk in verhouding tot prijs en ruimte. Aandachtspunt: roest op de wielkasten bij exemplaren uit 2016–2017 is een bekende zwakte. Vraag altijd om de distributiestatus en laat bij twijfel een ANWB- of BOVAG-keuring uitvoeren."
  }

const MERK_INTRO = {
  "volkswagen": "Volkswagen is de bestverkochte occasion in Nederland — en dat is niet voor niets. Solide bouw, een breed modellengamma en goedkope onderdelen maken een tweedehands VW aantrekkelijk. Let bij DSG-bakken op regelmatige olieverversing en controleer bij TDI-diesels de onderhoudshistorie op de 60.000-km-beurt.",
  "bmw": "Een tweedehands BMW combineert rijplezier met premium afwerking. Check altijd de onderhoudshistorie bij een erkend BMW-dealer en let bij N20/N26-motorblokken op de timing chain. Inspecteer de bodem op roest bij occasions ouder dan 8 jaar. Veel onderdelen zijn goed verkrijgbaar in Nederland.",
  "audi": "Audi biedt premium technologie op een betrouwbaar platform. Bij TDI-varianten met distributieriem (A4/A6 pre-2015): controleer altijd of de riem op tijd is vervangen. Quattro-vierwielaandrijving is robuust maar vraagt aandacht voor extra onderhoud aan de koppeling en differentiaalolie.",
  "mercedes-benz": "Mercedes staat voor comfort, veiligheid en langdurige kwaliteit. Let bij oudere C- en E-klasse modellen op roest bij de spatbordsluiting. Controleer de AdBlue-voorraad bij diesels en vraag naar de servicehistorie in XENTRY. Motoren rijden vaak honderdduizenden kilometers met goed onderhoud.",
  "toyota": "Toyota heeft de laagste eigendomskosten van alle merken in Nederland. Hybride modellen (Yaris, Corolla, RAV4) zijn zelfs na 200.000 km vrijwel altijd technisch in orde. Er zijn nauwelijks bekende structurele mankementen — check alleen de banden en remmen en de rest rijdt.",
  "ford": "Ford biedt solide rijdynamiek voor een scherpe prijs. De EcoBoost 1.0T-motor is zuinig maar gevoelig voor oververhitting — controleer de koeling. Focus en Fiesta hebben een uitgebreid onderdelen- en servicenetwerk. Ideaal voor wie betrouwbaar en goedkoop wil rijden.",
  "opel": "Opel heeft de afgelopen jaren zijn betrouwbaarheid sterk verbeterd. De Astra en Corsa zijn in goede staat volop verkrijgbaar voor gunstige prijzen. Let bij oudere Opels op roest rondom de wielkasten. Onderhoud is goedkoop en het dealernetwerk is groot.",
  "seat": "SEAT deelt zijn platform en mechanische onderdelen met Volkswagen en Skoda — maar ziet er sportiever uit voor een lagere prijs. Onderdelen zijn goedkoop en ruim voorhanden. De Leon is een van de leukst rijdende occasions in zijn klasse. Controleer de DSG-bakken op regelmatige service.",
  "skoda": "De slimme keuze: Volkswagen-technologie voor minder geld. Skoda Octavia is een van de ruimste gezinsauto's in zijn klasse en bekend om zijn hoge inruilwaarde. Eigenaren kiezen bewust voor betrouwbaarheid, waardoor de onderhoudshistorie bij tweedehands Skoda's doorgaans uitstekend is.",
  "peugeot": "Peugeot scoort hoog op rijcomfort en interieurdesign. De 308 en 3008 zijn populaire occasions met een modern infotainmentsysteem. Let bij automatische HDi-diesels op de EAT8-koppeling (vraag naar servicehistorie) en controleer de dieselparticulierfilter bij hogere kilometerstanden.",
  "renault": "Renault biedt veel ruimte voor weinig geld. De Clio en Megane zijn betaalbare stadsauto's; de Kadjar en Captur zijn populaire cross-overs. Controleer bij TCe-turbomotoren de timing chain en vraag bij elektrische modellen (Zoe) naar de batterijstatus en lease- of eigendomsconstructie.",
  "honda": "Honda staat bekend om extreme motorduurzaamheid. Civic en Jazz rijden vaak probleemloos 250.000 km. Controleer bij oudere benzinemotoren de distributieriem (model-afhankelijk) en let op de staat van de remmen bij weinig-gebruikte stadsauto's.",
  "mazda": "Mazda is de meest betrouwbare Japanse merken na Toyota. De Mazda3 en CX-5 scoren uitstekend in tevredenheidsonderzoeken. SkyActiv-motoren zijn zuinig en robuust. Check de body op lichte corrosie bij occasions uit kustprovincies.",
  "hyundai": "Hyundai biedt nieuwe-auto-garantie en betrouwbaarheid voor een lage prijs tweedehands. De i30 en Tucson zijn populaire occasions met een uitgebreid servicenetwerk. Controleer bij hybride of elektrische versies de batterij en vraag naar de resterende fabrieksgarantie.",
  "kia": "Kia levert uitstekende prijs-kwaliteitsverhouding en heeft de betrouwbaarheidsklacht-ratio sterk verlaagd de laatste jaren. De Ceed en Sportage zijn praktische keuzes. Controleer of de 7-jaars fabrieksgarantie nog actief is — dit is een groot voordeel bij tweedehands aankoop.",
  "volvo": "Volvo staat al jaren bovenaan in veiligheidstests en dat is terug te zien in de restwaarde. De 2.0 Drive-E turbomotor (vanaf 2014) vraagt regelmatig onderhoud aan turbo en koelsysteem — vraag naar recente beurten voordat je koopt. Luchtvering bij de V90/XC60 is comfortabel maar kostbaar bij lekkage; controleer de rijhoogte bij een koude motor. Exemplaren met volledige Volvo-servicehistorie houden hun waarde het best.",
  "tesla": "Een tweedehands Tesla beoordeel je grotendeels via het eigen dashboard: laadhistorie en actueel accubereik staan direct zichtbaar. Kies bij voorkeur een Model 3 of Model Y met minimaal 85% accucapaciteit en check of de 8-jaar accugarantie nog loopt — die is overdraagbaar. Let bij oudere Model S/X op de MCU-versie (MCU1 is trager en minder toekomstbestendig) en vraag naar de Autopilot-hardwareversie als die functie relevant is.",
  "mini": "De MINI deelt zijn platform met de BMW 1-serie en rijdt daarnaar — scherp en direct, maar met stugge vering op grote velgen. De 1.5 turbomotor (Cooper, vanaf 2014) is zuinig maar gevoelig voor olieverbruik bij hoge kilometerstanden; vraag naar recente olieverversingen. Automaten (Steptronic) zijn robuuster dan handgeschakelde varianten bij intensief stadsgebruik.",
  "fiat": "Fiat's sterkste troef tweedehands is de prijs: de 500 en Panda zijn goedkoop in aanschaf en onderhoud. De TwinAir-motor levert leuk rijplezier maar vraagt om tijdige olieverversing — vermijd exemplaren zonder aantoonbare beurthistorie. Roest aan portieren en wielkasten is een bekend aandachtspunt bij auto's ouder dan 8 jaar; controleer dit grondig bij de aankoopinspectie.",
  "porsche": "Porsche-occasions houden hun waarde beter dan vrijwel elk ander merk, mits goed onderhouden. Laat bij een Cayenne Diesel (2010–2018) altijd het IMS-lager controleren, en vraag bij een Macan met PDK-bak naar de laatste olieservice. Bij de 911 met M96/97-motor is de RMS-afdichting een bekend aandachtspunt — een gespecialiseerde Porsche-keuring is bij dit merk geen overbodige luxe.",
  "dacia": "Dacia is het bewijs dat een occasion niet duur hoeft te zijn om betrouwbaar te rijden — het merk deelt techniek met Renault tegen een lagere prijs. De Sandero en Duster zijn eenvoudig van opzet, met weinig elektronica die kan haperen. Onderdelen zijn goedkoop, maar het dealernetwerk is kleiner dan bij Renault — check vooraf de afstand tot de dichtstbijzijnde garage.",
  "citroen": "Citroën kiest bewust voor comfort boven sportiviteit — de C4 en C5 Aircross hebben een zachte vering die op lange ritten prettig rijdt. Let bij oudere modellen met hydropneumatische vering op lekkage van de bollen (kostbaar); nieuwere modellen met PHC-vering zijn eenvoudiger te onderhouden. Vraag altijd naar de laatste distributieriemvervanging bij de PureTech-motoren.",
  "polestar": "Polestar is het premium elektrische zustermerk van Volvo en deelt daarmee platform en batterijtechniek. Controleer bij de Polestar 2 het actuele accubereik via de app en vraag naar de status van de 8-jaar/160.000 km batterijgarantie — die is overdraagbaar. Softwaregebonden functies (Google-diensten, Plus Pack) kunnen per bouwjaar verschillen; check dit voor aankoop.",
  "suzuki": "Suzuki staat bekend om lage onderhoudskosten en een hoge betrouwbaarheidsscore in Japanse merkvergelijkingen. De Swift en Vitara rijden zuinig en zijn technisch eenvoudig, wat reparaties buiten de garantieperiode betaalbaar houdt. Bij de mild-hybride varianten (vanaf 2020) is het 12V-hybridesysteem probleemarm; controleer bij oudere benzinemodellen wel de distributieketting bij hoge kilometerstanden.",
  "mitsubishi": "Mitsubishi's sterkste papieren tweedehands zijn duurzaamheid en een eenvoudige techniek. De Outlander PHEV is een populaire occasion — check bij dit model altijd de status van het hoogspanningsaccupakket en of beide motoren foutloos samenwerken via een uitleesrapport. ASX en Space Star zijn mechanisch simpel en onderhoudsvriendelijk.",
  "alfa": "Alfa Romeo combineert Italiaans design met een rijervaring die scherper is dan bij Duitse concurrenten. De Giulia en Stelvio met de 2.0 turbomotor zijn krachtig maar vragen om stipte onderhoudsintervallen — vraag altijd om volledige dealerhistorie. Elektronica (vooral het infotainmentsysteem) is een bekend aandachtspunt bij vroege bouwjaren; test alle functies grondig bij de proefrit.",
  "alfa-romeo": "Alfa Romeo combineert Italiaans design met een rijervaring die scherper is dan bij Duitse concurrenten. De Giulia en Stelvio met de 2.0 turbomotor zijn krachtig maar vragen om stipte onderhoudsintervallen — vraag altijd om volledige dealerhistorie. Elektronica (vooral het infotainmentsysteem) is een bekend aandachtspunt bij vroege bouwjaren; test alle functies grondig bij de proefrit.",
  "jeep": "Jeep-occasions in Nederland zijn vaak de Renegade en Compass — compact, maar met échte SUV-uitstraling. De 1.3 turbomotor (vanaf 2019) is nieuwer en betrouwbaarder dan de oudere 1.4 MultiAir; vraag naar het bouwjaar van de motor, niet alleen de auto. Bij 4x4-versies met Selec-Terrain: laat het systeem tijdens de proefrit testen, reparatie is kostbaar bij storingen.",
  "nissan": "Nissan biedt praktische, betaalbare occasions met een sterk trackrecord op betrouwbaarheid. De Qashqai is de bestverkochte in zijn segment; controleer bij de CVT-automaat (voor 2017) op sudderend of jankend geluid bij optrekken — een bekend aandachtspunt. De Leaf is een goedkope instap in elektrisch rijden, maar check bij oudere accu's (voor 2018, zonder actieve koeling) het actuele accubereik via de Nissan-app of een dealer."
};;

  // Merk-specifieke kooptips
  var MERK_TIPS = {"bmw":"Tweedehands BMW's zijn bij goed onderhoud robuust — maar dat onderhoud is cruciaal. Vraag altijd om het BMW Online Service History en controleer of de grote km-beurten (60.000 / 90.000 / 120.000 km) zijn uitgevoerd bij een erkend bedrijf. BMW-reparaties zijn merkgebonden duur: een BOVAG- of ANWB-keuring is geen overkill.","audi":"Audi levert consistente afwerking en sterke motoren. Let op de 7-traps S tronic bij benzinemodellen voor 2016 — schokkerig optrekken is een bekende klacht. Controleer op olielekken bij de 2.0 TFSI en check de distributieketting. Exemplaren met volledige Audi dealerhistorie houden hun waarde beter.","volkswagen":"Volkswagen occasions zijn betrouwbaar bij aantoonbaar onderhoud. De 7-traps DSG bij benzinemodellen voor 2015 kan schokkerig schakelen — een software-update of koppelingsvervanging is soms nodig. TSI-motoren (1.4 en 1.8) hebben een distributieketting die bij 150.000+ km aandacht vraagt. Met volledige beurthistorie gaan VW's moeiteloos naar 250.000 km.","vw":"Volkswagen occasions zijn betrouwbaar bij aantoonbaar onderhoud. Let op de 7-traps DSG bij benzinemodellen voor 2015 (koppelingslijtage) en vraag de beurthistorie op. Goed onderhouden exemplaren rijden probleemloos naar 250.000 km.","toyota":"Toyota scoort al jaren bovenaan in betrouwbaarheidsonderzoeken — en dat is terug te zien in de onderhoudskosten. Hybride modellen (Yaris, Corolla, RAV4) rijden zuinig en vragen weinig ingrijpend onderhoud. De 8-jaar fabrieksgarantie op de hybride-accu is overdraagbaar bij occasions jonger dan 8 jaar. Dat is een concreet financieel voordeel.","volvo":"Volvo scoort structureel hoog op veiligheid en rijdt comfortabel op lange afstanden. Aandachtspunt: de 2.0 Drive-E turbomotor (alle modellen na 2014) vraagt regelmatig onderhoud aan de turbo en het koelwatersysteem. Kies bij voorkeur een exemplaar met Volvo servicehistorie en niet ouder dan 10 jaar — reparaties via een officieel dealer zijn merkgebonden hoog.","mercedes":"Mercedes-Benz staat voor comfort op hoog niveau — maar tweedehands vraagt een kritische blik. Elektrische systemen (luchtvering, navigatie, elektrische zitregeling) zijn duur bij defect. Vraag altijd om het volledige servicehistorie en laat een storingsuitlezing doen voor aankoop. Modellen van 2015 of jonger zijn een stuk probleemarmer.","mercedes-benz":"Mercedes-Benz staat voor comfort op hoog niveau. Controleer altijd het volledige servicehistorie en laat een storingsuitlezing doen voor aankoop — elektrische systemen zijn bij defect merkgebonden duur. Modellen van 2015 of jonger zijn een stuk betrouwbaarder.","ford":"Ford occasions zijn scherp geprijsd en onderdelen zijn overal beschikbaar. Vermijd de 6-traps PowerShift automaat in Focus en Fiesta voor 2018 — koppelingslijtage bij lage kilometers is een veelgehoorde klacht. Schakelversies of recentere automaten zijn een veiligere keuze.","renault":"Renault-kwaliteit is de afgelopen 5 jaar duidelijk verbeterd. De Zoe is populair als occasion, maar check de accu-status: vroege modellen (2013–2016) hadden een batterijhuurcontract — zorg dat dit is afgekocht, of vraag naar de maandelijkse huurkosten. Benzine- en dieselversies van Clio, Megane en Kadjar zijn betrouwbaar bij aantoonbaar onderhoud.","opel":"Opel staat scherp geprijsd en biedt meer auto voor het geld dan veel concurrenten. Controleer de wielkasten en dorpels op roest bij exemplaren voor 2018. Onderdelen zijn goed verkrijgbaar en niet merkgebonden duur. Een onafhankelijke keuring is sterk aanbevolen bij exemplaren ouder dan 6 jaar.","kia":"Kia scoort uitstekend in betrouwbaarheidsonderzoeken. De 7-jaar fabrieksgarantie is overdraagbaar op de tweede eigenaar — controleer bij aankoop de resterende garantieperiode in het Kia-systeem. Dat vergemakkelijkt ook de doorverkoop. Populaire modellen: Sportage, Ceed en EV6.","hyundai":"Hyundai deelt veel technologie met Kia en scoort structureel hoog op betrouwbaarheid. De 5-jaar fabrieksgarantie is overdraagbaar — check bij aankoop hoeveel er nog resteert. Elektrische modellen zoals de Ioniq 5 en Kona Electric kennen een groeiende tweedehandsmarkt; controleer het actuele accubereik via de Hyundai BlueLink-app.","tesla":"Tesla occasions zijn goed te beoordelen via de eigen dashboard-data: het scherm toont het actuele accubereik en de laadhistorie. Kies een exemplaar met minimaal 85% accucapaciteit en controleer of de 8-jaar accu-garantie nog loopt. Model 3 en Model Y zijn de meest onderhoudsvriendelijke opties.","porsche":"Porsche-occasions houden hun waarde beter dan vrijwel elk ander merk. Laat altijd een Porsche-keuring uitvoeren bij een erkend bedrijf. Aandachtspunten: Cayenne Diesel (2010–2018) heeft een bekend IMS-lagerprobleem; Macan met PDK-versnellingsbak vraagt periodiek olie-onderhoud. Bij de 911: check de RMS-afdichting bij M96/97-motoren."};
  var kooptip = merkSlug ? MERK_TIPS[merkSlug] || '' : '';
  var modelIntro = (merkSlug && modelSlug) ? (MODEL_INTRO[merkSlug+'|'+modelSlug] || '') : '';
  var merkIntro = (merkSlug && !modelSlug) ? (MERK_INTRO[merkSlug] || '') : '';

  const geoText = merkSlug && filtered.length > 0
    ? '<section class="geo-section" aria-label="Marktinformatie '+merkName+'">' +
      '<h2>Tweedehands '+merkName+(modelName?' '+modelName:'')+' kopen — wat moet je weten?</h2>' +
      ((modelIntro||merkIntro) ? '<div class="model-intro-blok"><p>'+(modelIntro||merkIntro)+'</p></div>' : '') +
      (kooptip ? '<p class="kooptip">'+kooptip+'</p>' : '') +
      '<h3 style="font-size:.9rem;margin-top:.75rem;margin-bottom:.3rem">Actuele marktdata</h3>' +
      '<p>Op basis van <strong>'+filtered.length+' actuele advertenties</strong> is de gemiddelde vraagprijs van een tweedehands '+merkName+(modelName?' '+modelName:'')+' <strong>&euro; '+(gemPrijs?fmt(gemPrijs):'onbekend')+'</strong>. De mediaanprijs &mdash; waarbij de helft van de occasions goedkoper is &mdash; ligt op &euro; '+(medPrijs?fmt(medPrijs):'onbekend')+'. De mediaan kilometerstand is '+(medKm?fmt(medKm)+' km':'onbekend')+'. Carkijker vergelijkt dagelijks aanbod van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG.' +
      (trend ? ' De mediaanprijs is de afgelopen ' + trend.nDagen + ' dagen ' + (trend.delta < 0 ? 'met ' + Math.abs(trend.pct) + '% gedaald' : trend.delta > 0 ? 'met ' + trend.pct + '% gestegen' : 'stabiel gebleven') + ' (van &euro; ' + fmt(Math.round(trend.huidig - trend.delta)) + ' naar &euro; ' + fmt(trend.huidig) + ').' : '') +
      (afschrijving ? ' Op basis van vergelijkbare advertenties (gecorrigeerd voor bouwjaar en kilometerstand) verliest een ' + merkName + (modelName?' '+modelName:'') + ' gemiddeld ongeveer &euro; ' + fmt(afschrijving.afschrijvingJaar) + ' per jaar en &euro; ' + fmt(afschrijving.afschrijvingKm) + ' bij een verdubbeling van de kilometerstand.' : '') +
      '</p>' +
      '<p style="margin-top:.5rem"><a href="/" style="color:#d14413;font-size:.875rem">Bekijk alle '+merkName+' occasions met filters &rarr;</a>' +
      ' &nbsp;&middot;&nbsp; <a href="'+marktHref+'" style="color:#d14413;font-size:.875rem">Volledige marktanalyse'+(trend?' (prijstrend, regiovergelijking en meer)':'')+' &rarr;</a></p>' +
      '</section>'
    : '';

  // FAQ schema (alleen op merk/model pagina's met voldoende data)
  let faqSchema = null;
  if (merkSlug && filtered.length >= 5) {
    const faqItems = [];
    faqItems.push({
      '@type': 'Question',
      'name': 'Wat kost een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' gemiddeld?',
      'acceptedAnswer': { '@type': 'Answer', 'text': gemPrijs
        ? 'Op basis van ' + filtered.length + ' actuele advertenties is de gemiddelde vraagprijs van een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' op Carkijker EUR ' + fmt(gemPrijs) + '. De mediaanprijs bedraagt EUR ' + (medPrijs ? fmt(medPrijs) : 'onbekend') + '.'
        : 'Er zijn momenteel onvoldoende prijsdata beschikbaar.' }
    });
    if (medKm) faqItems.push({
      '@type': 'Question',
      'name': 'Hoeveel kilometer heeft een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' gemiddeld?',
      'acceptedAnswer': { '@type': 'Answer', 'text': 'De mediaan kilometerstand van tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' occasions op Carkijker is ' + fmt(medKm) + ' km, gebaseerd op ' + filtered.filter(function(a){return a.km;}).length + ' advertenties.' }
    });
    faqItems.push({
      '@type': 'Question',
      'name': 'Waar kan ik een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' kopen?',
      'acceptedAnswer': { '@type': 'Answer', 'text': 'Carkijker toont ' + filtered.length + ' tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' occasions van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG op één plek. Het aanbod wordt dagelijks bijgewerkt.' }
    });
    if (trend) faqItems.push({
      '@type': 'Question',
      'name': 'Wordt een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' duurder of goedkoper?',
      'acceptedAnswer': { '@type': 'Answer', 'text': 'De mediaanprijs van een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' op Carkijker is de afgelopen ' + trend.nDagen + ' dagen ' + (trend.delta < 0 ? Math.abs(trend.pct) + '% gedaald' : trend.delta > 0 ? trend.pct + '% gestegen' : 'nagenoeg stabiel gebleven') + ', naar EUR ' + fmt(trend.huidig) + ' nu.' }
    });
    faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': faqItems };
  }


  return '<!DOCTYPE html>\n<html lang="nl">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '  ' + GA_SNIPPET + '\n' +
    '  ' + OUT_TRACK_SNIPPET + '\n' +
    '  ' + FOTO_FOUT_SCRIPT + '\n' +
    '  <title>'+pageTitle+'</title>\n' +
    '  <meta name="description" content="'+metaDesc+'">\n' +
    '  <link rel="canonical" href="'+SITE_ORIGIN+canonicalPath+'">\n' +
    '  <script type="application/ld+json">'+safeJsonLd(schema)+'<\/script>\n' +
    '  <script type="application/ld+json">'+safeJsonLd(bcSchema)+'<\/script>\n' +
    (faqSchema ? '  <script type="application/ld+json">'+safeJsonLd(faqSchema)+'<\/script>\n' : '') +
    '  <style>' + OCC_STYLE + '<\/style>\n' +
    '</head>\n<body>\n' +
    '  <nav><a href="/" class="logo">Car<span>kijker</span></a><a href="/occasions/">Occasions</a>' +
    (merkSlug ? '<a href="/occasions/'+merkSlug+'/">'+merkName+'</a>' : '') +
    (modelSlug ? '<a href="/occasions/'+merkSlug+'/'+modelSlug+'/">'+modelName+'</a>' : '') +
    '</nav>\n  <div class="container">\n' +
    '  <h1>'+(modelName?merkName+' '+modelName+' occasions':merkSlug?merkName+' occasions kopen':'Tweedehands occasions')+'</h1>\n' +
    '  <p class="subtitle">'+filtered.length+' tweedehands '+merkName+(modelName?' '+modelName:'')+' occasions &mdash; dagelijks bijgewerkt van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</p>\n' +
    '  '+statsHtml+'\n' +
    (merkLinks?'  <h2 style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin-bottom:.5rem">Occasions per merk</h2>\n  <div class="model-nav">'+merkLinks+'</div>\n':'') +
    (stedenLinks?'  <h2 style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin-bottom:.5rem">Occasions per stad</h2>\n  <div class="model-nav">'+stedenLinks+'</div>\n':'') +
    (modelLinks?'  <div class="model-nav">'+modelLinks+'</div>\n':'') +
    ((!merkSlug) ? '  <section style="background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);padding:1.25rem 1.5rem;margin-bottom:1.25rem">' +'<h2 style="font-size:1rem;font-weight:700;margin-bottom:.5rem;color:#1a1a2e">Tweedehands auto kopen in Nederland</h2>' +'<p style="font-size:.875rem;color:#444;line-height:1.6">Carkijker toont dagelijks bijgewerkte occasions van <strong>Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</strong> op &eacute;&eacute;n overzichtelijke plek. Vergelijk '+listings.length+' tweedehands auto&rsquo;s op prijs, km-stand en merk &mdash; zonder meerdere sites te hoeven bezoeken. Klik op een merk om het volledige aanbod te zien, of ga terug naar de <a href="/" style="color:#d14413">live zoekmachine</a> voor uitgebreide filters.</p>' +'</section>\n' : '') +'  <div class="auto-grid" id="aanbod">'+(cards||'<p class="empty">Geen occasions gevonden voor deze combinatie. Probeer een andere merk- of modelcombinatie, of bekijk het <a href="/occasions/" style="color:#d14413">volledige aanbod</a>.</p>')+'</div>\n' +
    geoText +
    '  <a href="/" class="back-link">&larr; Terug naar live zoeken</a>\n' +
    '  </div>\n</body>\n</html>';
}

const STEDEN = {
  "amsterdam":  { naam: "Amsterdam",  regio: "Noord-Holland", tekst: "In Amsterdam is het aanbod tweedehands auto's groot, maar de vraag naar compacte en elektrische modellen ligt boven het landelijk gemiddelde. Belangrijk: binnen de ring gelden milieuzones — controleer of de auto voldoet aan de Euro 6-norm voor toegang en parkeertarieven. Leaseretouren van bedrijven in de metropoolregio zijn hier regelmatig te vinden met lage kilometers." },
  "rotterdam":  { naam: "Rotterdam",  regio: "Zuid-Holland",  tekst: "Rotterdam heeft een van de grootste occasionmarkten van Zuid-Holland, met een gezonde mix van particuliere aanbieders en regionale dealers. De tweedehandsmarkt in de regio biedt veel compacte automaten en zuinige hatchbacks in het 8.000–15.000 euro segment — praktisch voor forensen richting de haven of het centrum." },
  "den-haag":   { naam: "Den Haag",   regio: "Zuid-Holland",  tekst: "Den Haag heeft een relatief groot aanbod in het middensegment (12.000–25.000 euro), mede door de hoge concentratie aan zakelijke leaseretouren. Hybrides en compacte SUV's zijn sterk vertegenwoordigd. Controleer bij leaseretouren altijd de NAP-kilometerstatus via de RDW-check." },
  "utrecht":    { naam: "Utrecht",    regio: "Utrecht",        tekst: "Utrecht heeft een actieve markt door de hoge bevolkingsdichtheid en veel forensen richting Amsterdam en Eindhoven. Het aanbod zit sterk in het 5.000–15.000 euro segment. Let op: de parkeerdruk in Utrecht-centrum maakt een compacte auto praktischer dan een grote SUV." },
  "eindhoven":  { naam: "Eindhoven",  regio: "Noord-Brabant", tekst: "De regio Eindhoven heeft een opvallend aandeel technisch goed onderhouden occasions — mede door de concentratie aan hightech-bedrijven waarvan werknemers regelmatig upgraden. Leaseretouren van grote bedrijven in de regio zijn hier vaker te vinden dan elders. Vraag altijd of het zakelijk of particulier eigenaarschap betreft." },
  "groningen":  { naam: "Groningen",  regio: "Groningen",     tekst: "Groningen heeft een relatief jonge automarkt, gedreven door de grote studentenpopulatie. Dat betekent veel stadsauto's in de instapklasse (3.000–8.000 euro), maar ook zuinige hybrides van forensen. Controleer bij goedkopere exemplaren altijd de APK-looptijd en vraag om een NAP-rapport." },
  "tilburg":    { naam: "Tilburg",    regio: "Noord-Brabant", tekst: "Tilburg heeft een breed aanbod in alle prijsklassen, met veel particuliere aanbieders in het 8.000–20.000 euro segment. De regio heeft diverse grote dealerbedrijven, waardoor leaseretouren met volledige beurthistorie hier regelmatig opduiken." },
  "almere":     { naam: "Almere",     regio: "Flevoland",     tekst: "Almere is een jonge stad met een occasionmarkt die dat weerspiegelt: veel gezinsauto's en SUV's van de afgelopen 5 jaar, vaak van eerste eigenaren. Pendelen naar Amsterdam maakt automaten en hybrides populair. Controleer bij particuliere verkopers of de auto privé of zakelijk is gebruikt." },
  "breda":      { naam: "Breda",      regio: "Noord-Brabant", tekst: "In de regio Breda zijn meerdere grote dealergroepen gevestigd, wat zorgt voor een bovengemiddeld aanbod aan gecertificeerde occasions met garantie. Breda's ligging tussen Rotterdam, Eindhoven en Antwerpen betekent dat Belgische leaseretouren hier regelmatig op de markt komen." },
  "nijmegen":   { naam: "Nijmegen",   regio: "Gelderland",    tekst: "Nijmegen heeft een gemengd aanbod: compacte stadsauto's voor studenten en ruimere gezinsauto's in het 10.000–18.000 euro segment. De grensligging met Duitsland maakt het aanbod gevarieerder — importauto's met Duits onderhoudshistorie zijn hier vaker te zien. Controleer altijd de NAP-status." },
  "arnhem":   { naam: "Arnhem",   regio: "Gelderland",   tekst: "Arnhem heeft een actieve automarkt met relatief veel benzine- en dieselauto's in het lagere en middensegment. De regio Arnhem-Nijmegen trekt zowel particuliere als zakelijke kopers. Let bij occasions in deze regio op de APK-datum en vraag altijd naar het onderhoudsboekje." },
  "haarlem":  { naam: "Haarlem",  regio: "Noord-Holland", tekst: "In Haarlem en omgeving is de vraag naar compacte occasions en elektrische auto's hoog, mede door de nabijheid van Amsterdam. Het aanbod is iets kleiner dan in de grote steden, maar de kwaliteit is doorgaans hoog. Milieuzones in en rondom Haarlem gelden ook — check Euro-norm vóór aankoop." }
};

function buildStadPage(stadSlug, stad, filtered, listings, landelijkeStats) {
  const gemPrijs = filtered.length ? Math.round(filtered.reduce((s,l)=>s+(l.prijs||0),0)/filtered.length) : 0;
  const medPrijs = filtered.length ? [...filtered].sort((a,b)=>(a.prijs||0)-(b.prijs||0))[Math.floor(filtered.length/2)].prijs : 0;
  // Regionale prijsvergelijking (statisch, voor crawlers/LLM's) -- de bestaande
  // interactieve regio-tool in de Marktanalyse-modal doet dit al per merk+model
  // op straal-basis, maar dat vergt een klik en is dus onzichtbaar voor niet-JS-
  // uitvoerende bots. Dit is de cross-sectionele tegenhanger: alle occasions in
  // de stad vs. het landelijk gemiddelde.
  //
  // BELANGRIJK: locatie is het vestigingsadres van de verkoper/dealer, niet een
  // gelijkmatige steekproef van lokale kopers -- één grote (vaak EV/premium-merk)
  // dealer kan een hele stad-statistiek vertekenen. Concreet gevonden in de data:
  // 49 advertenties van één Lexus-dealer onder "Groningen" trokken die stad 40%
  // boven het landelijk gemiddelde, terwijl Groningen juist bekendstaat als een
  // betaalbare studentenstad. Daarom eerst een concentratie-check: als één merk
  // lokaal >10% van de advertenties uitmaakt EN dat >3x het landelijke aandeel
  // van datzelfde merk is, is de lokale prijs vermoedelijk niet representatief
  // en tonen we liever geen (misleidende) claim dan een verkeerde.
  let regioTekst = '';
  if (filtered.length >= 8 && landelijkeStats && landelijkeStats.gem > 0 && gemPrijs > 0) {
    const merkTellingen = {};
    filtered.forEach(function(l){ var m=l.merk||'onbekend'; merkTellingen[m]=(merkTellingen[m]||0)+1; });
    let gedomineerd = false;
    for (const m in merkTellingen) {
      if (merkTellingen[m] < 5) continue;
      const lokaalAandeel = merkTellingen[m] / filtered.length;
      const landAandeel = landelijkeStats.merkAandeel[m] || 0.001;
      if (lokaalAandeel > 0.10 && (lokaalAandeel / landAandeel) > 3) { gedomineerd = true; break; }
    }
    if (!gedomineerd) {
      const verschilPct = Math.round((gemPrijs - landelijkeStats.gem) / landelijkeStats.gem * 100);
      const duiding = verschilPct < -3 ? Math.abs(verschilPct) + '% goedkoper dan' : verschilPct > 3 ? verschilPct + '% duurder dan' : 'vergelijkbaar met';
      regioTekst = 'Gemiddeld betaal je in ' + stad.naam + ' &euro; ' + gemPrijs.toLocaleString('nl-NL') + ' voor een tweedehands auto -- dat is ' + duiding + ' het landelijk gemiddelde van &euro; ' + landelijkeStats.gem.toLocaleString('nl-NL') + '.';
    }
  }
  const cards = filtered.slice(0,24).map(function(l){ return renderAutoCard(l, stad.naam); }).join('');
  return '<!doctype html><html lang="nl"><head>'+
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    GA_SNIPPET +
    OUT_TRACK_SNIPPET +
    FOTO_FOUT_SCRIPT +
    '<title>Tweedehands auto '+stad.naam+' | Carkijker</title>'+
    '<meta name="description" content="Bekijk '+filtered.length+' tweedehands auto occasions in '+stad.naam+', '+stad.regio+'. Vergelijk prijzen en vind jouw ideale occasion.">'+
    '<link rel="canonical" href="https://carkijker.nl/occasions/'+stadSlug+'/">'+
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;background:#f5f5f0;color:#333;line-height:1.5}'+
    'nav{background:rgba(255,255,255,.96);border-bottom:1px solid rgba(0,0,0,.08);padding:0 1.1rem;height:56px;display:flex;align-items:center;gap:.9rem;'+
    'position:sticky;top:0;z-index:200;box-shadow:0 1px 0 rgba(0,0,0,.04);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:.875rem;overflow-x:auto;white-space:nowrap}'+
    '.logo{font-size:1.15rem;font-weight:800;color:#d14413;letter-spacing:-.5px;text-decoration:none;flex-shrink:0}.logo span{color:#1a1a2e}'+
    'nav a{color:#d14413;text-decoration:none}nav a+a::before{content:" \\203a ";color:#aaa;margin:0 .3rem}'+
    '.container{max-width:960px;margin:0 auto;padding:1rem}h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .3rem;color:#1a1a2e}'+
    '.subtitle{color:#666;font-size:.9rem;margin-bottom:1rem}.geo-blok{background:#fff3e0;border-left:4px solid #d14413;padding:.75rem 1rem;margin-bottom:1rem;border-radius:0 8px 8px 0}'+
    '.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin:1rem 0}'+
    '.stat-card{background:#fff;border-radius:12px;padding:.75rem 1rem;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.07);display:block;text-decoration:none;color:inherit;transition:border-color .15s}'+
    '.stat-card:hover{border-color:#d14413}'+
    '.stat-val{font-size:1.25rem;font-weight:700;color:#d14413}.stat-label{font-size:.75rem;color:#666;margin-top:.2rem}'+
    '.auto-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:1rem}'+
    '.auto-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.07);display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:transform .18s ease,box-shadow .18s ease}'+
    '.auto-card:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(0,0,0,.11)}'+
    '.auto-foto{position:relative;aspect-ratio:16/9;background:#f0f0eb;overflow:hidden}'+
    '.auto-foto img{width:100%;height:100%;object-fit:cover}'+
    '.auto-foto-leeg{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#888;background:#f0f0eb}.auto-foto-leeg span{font-size:11.5px}'+
    '.bron-label{position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#fff;background:#888}'+
    '.bron-marktplaats{background:#0063D3}.bron-gaspedaal{background:#E87722}.bron-viabovag{background:#003082}.bron-autotrack{background:#1B5FA8}.bron-autoscout24{background:#FF6600}.bron-autotrader{background:#0057B8}'+
    '.auto-info{padding:14px 16px 12px;flex:1;display:flex;flex-direction:column;gap:6px}'+
    '.auto-info h3{font-size:14px;font-weight:700;margin:0;color:#1a1a2e;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.38}'+
    '.auto-prijs-groot{font-size:21px;font-weight:800;color:#111;letter-spacing:-.4px;margin:2px 0 0}'+
    '.auto-specs-row{display:flex;gap:10px;flex-wrap:wrap;margin:2px 0}'+
    '.auto-spec-chip{font-size:11.5px;color:#6b7280;display:flex;align-items:center;gap:3px}.auto-spec-chip svg{flex-shrink:0}</style></head><body>'+
    '<nav><a href="/" class="logo">Car<span>kijker</span></a><a href="/occasions/">Occasions</a><a href="/occasions/'+stadSlug+'/">'+stad.naam+'</a></nav>'+
    '<div class="container">'+
    '<h1>Tweedehands auto occasions '+stad.naam+'</h1>'+
    '<p class="subtitle">'+filtered.length+' occasions gevonden in en rond '+stad.naam+', '+stad.regio+'</p>'+
    '<div class="geo-blok"><p>'+stad.tekst+(regioTekst?' '+regioTekst:'')+'</p></div>'+
    '<div class="stats-grid">'+
    '<a href="#aanbod" class="stat-card"><div class="stat-val">'+filtered.length+'</div><div class="stat-label">Occasions</div></a>'+
    '<a href="/?markt=" class="stat-card"><div class="stat-val">&#8364; '+(Math.round(gemPrijs/100)*100).toLocaleString("nl-NL")+'</div><div class="stat-label">Gem. prijs</div></a>'+
    '<a href="/?markt=" class="stat-card"><div class="stat-val">&#8364; '+(Math.round(medPrijs/100)*100).toLocaleString("nl-NL")+'</div><div class="stat-label">Mediaan</div></a>'+
    '</div>'+
    '<div class="auto-grid" id="aanbod">'+cards+'</div>'+
    (filtered.length === 0 ? '<p style="color:#666;margin-top:1rem">Geen occasions gevonden in '+stad.naam+'. Bekijk ons <a href="/">volledig aanbod</a>.</p>' : '')+
    '</div></body></html>';
}

function main() {
  if (!fs.existsSync(LISTINGS_PATH)) { console.error('listings.json niet gevonden'); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf-8'));
  const listings = raw.listings || [];
  console.log('Geladen: ' + listings.length + ' listings');
  listings.forEach(function(a){ if(!a.merk) a.merk = extraheerMerk(a.titel||''); });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let pageCount = 0;

  // Landelijke referentie voor de regionale prijsvergelijking op de stad-pagina's
  // (zie buildStadPage) -- één keer berekend i.p.v. per stad opnieuw.
  const landelijkeAutos = listings.filter(function(l){ return l.prijs != null && l.prijs >= 300 && l.prijs <= 500000; });
  const landGem = landelijkeAutos.length ? Math.round(landelijkeAutos.reduce(function(s,l){return s+l.prijs;},0)/landelijkeAutos.length) : 0;
  const landMerkTellingen = {};
  landelijkeAutos.forEach(function(l){ var m=l.merk||'onbekend'; landMerkTellingen[m]=(landMerkTellingen[m]||0)+1; });
  const landMerkAandeel = {};
  for (var _m in landMerkTellingen) landMerkAandeel[_m] = landMerkTellingen[_m] / landelijkeAutos.length;
  const landelijkeStats = { gem: landGem, merkAandeel: landMerkAandeel };

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildPage({ merkSlug: null, modelSlug: null, filtered: listings, listings: listings }), 'utf-8');
  pageCount++; console.log('  [OK] /occasions/');

  // Houdt bij welke top-level en merk/model-mappen dit run echt gegenereerd zijn,
  // zodat verweesde mappen van eerdere runs (merk/model dat onder de drempel is
  // gezakt) hieronder opgeruimd kunnen worden i.p.v. voor altijd te blijven staan.
  const validTopDirs = new Set();
  const validModelDirs = {};

  const merkCounts = {};
  listings.forEach(function(a){ const m=(a.merk||'').toLowerCase().trim(); if(m) merkCounts[m]=(merkCounts[m]||0)+1; });

  Object.entries(merkCounts).filter(function(e){return e[1]>=MIN_MERK_COUNT;}).sort(function(a,b){return b[1]-a[1];}).forEach(function(entry) {
    const merkSlug = entry[0];
    const filtered = listings.filter(function(a){
      const m=(a.merk||'').toLowerCase().trim();
      return m===merkSlug||m.includes(merkSlug)||(merkSlug==='vw'&&(m==='volkswagen'||(a.titel||'').toLowerCase().startsWith('volkswagen')));
    });
    if (filtered.length < MIN_MERK_COUNT) return;
    const merkDir = path.join(OUT_DIR, merkSlug);
    fs.mkdirSync(merkDir, { recursive: true });
    fs.writeFileSync(path.join(merkDir, 'index.html'), buildPage({ merkSlug: merkSlug, modelSlug: null, filtered: filtered, listings: listings }), 'utf-8');
    pageCount++; console.log('  [OK] /occasions/'+merkSlug+'/ ('+filtered.length+')');
    validTopDirs.add(merkSlug);
    validModelDirs[merkSlug] = new Set();

    const mc = {};
    // Sla de volledige merknaam over, ook als die uit meerdere woorden bestaat
    // (bv. "alfa romeo", "land rover", "aston martin", "lynk & co") -- anders wordt
    // het tweede woord van de merknaam zélf (bv. "romeo", "rover", "martin") ten
    // onrechte als modelnaam gezien. Elk woord van de merkslug wordt tegen de
    // titel gematcht, waarbij een los "&"-teken in de titel wordt overgeslagen
    // (sommige advertenties spellen "Lynk & Co" zonder het teken). Begint de titel
    // niet met de merknaam (de verzamelcategorie "overig" bv. is geen woord uit de
    // advertentietitel zelf), dan valt dit terug op de oude aanname van precies
    // één woord vóór het model, zodat dat gedrag daar ongewijzigd blijft.
    // # en ? zijn ongeldig in gedeployde bestandsnamen (Netlify) en werken sowieso
    // niet als padsegment in een URL (# is een fragment-scheidingsteken) — verwijderen
    // vóórdat dit als mapnaam/modelSlug gebruikt wordt (bv. modelnamen als "Smart #1").
    const merkWoorden = merkSlug.split(' ').filter(function(x){ return x && x !== '&'; });
    filtered.forEach(function(a){
      const w = (a.titel||'').toLowerCase().split(' ');
      let idx = 0;
      if (w[0] === merkWoorden[0]) {
        merkWoorden.forEach(function(mw){ while (w[idx] === '&') idx++; if (w[idx] === mw) idx++; });
        while (w[idx] === '&') idx++;
      } else {
        idx = 1;
      }
      if (w.length > idx) {
        // Trailing komma (bv. bij chassisaanduidingen als "109," of "88,") eraf
        // strippen vóór de puur-numerieke check, anders glipt zo'n aanduiding
        // er als "model" doorheen terwijl het gewoon een getal is.
        const m = (w[idx]||'').replace(/[#?]/g,'').replace(/,+$/,'');
        if (m && m.length>1 && !/^\d+$/.test(m)) mc[m]=(mc[m]||0)+1;
      }
    });
    Object.entries(mc).filter(function(e){return e[1]>=MIN_MODEL_COUNT;}).sort(function(a,b){return b[1]-a[1];}).slice(0,MAX_MODELS).forEach(function(me){
      const modelSlug=me[0];
      const mf=filtered.filter(function(a){return (a.titel||'').toLowerCase().includes(modelSlug);});
      if(mf.length<MIN_MODEL_COUNT) return;
      const mDir=path.join(merkDir,modelSlug);
      fs.mkdirSync(mDir,{recursive:true});
      fs.writeFileSync(path.join(mDir,'index.html'),buildPage({merkSlug:merkSlug,modelSlug:modelSlug,filtered:mf,listings:listings}),'utf-8');
      pageCount++; console.log('    [OK] /occasions/'+merkSlug+'/'+modelSlug+'/ ('+mf.length+')');
      validModelDirs[merkSlug].add(modelSlug);
    });
  });

  updateHomepageMerkenLinks(merkCounts);
  updateHomepageStedenLinks(STEDEN);

  // Merk/model-URLs verzamelen voor de sitemap (encodeURIComponent i.v.m.
  // merknamen met een spatie, zoals "alfa romeo" of "aston martin").
  const generatedMerkUrls = [];
  for (const merkSlug of Object.keys(validModelDirs)) {
    generatedMerkUrls.push('occasions/' + encodeURIComponent(merkSlug) + '/');
    for (const modelSlug of validModelDirs[merkSlug]) {
      generatedMerkUrls.push('occasions/' + encodeURIComponent(merkSlug) + '/' + encodeURIComponent(modelSlug) + '/');
    }
  }

  // Regiopagina's per stad
  const OUT_STAD = OUT_DIR;
  const generatedStadUrls = [];
  for (const [stadSlug, stad] of Object.entries(STEDEN)) {
    const filtered = listings.filter(l => {
      const loc = (l.locatie || l.stad || '').toLowerCase();
      return loc.includes(stad.naam.toLowerCase()) || loc.includes(stadSlug);
    });
    if (filtered.length < 3) continue;
    const stadDir = path.join(OUT_STAD, stadSlug);
    fs.mkdirSync(stadDir, {recursive: true});
    fs.writeFileSync(path.join(stadDir, 'index.html'), buildStadPage(stadSlug, stad, filtered, listings, landelijkeStats), 'utf-8');
    generatedStadUrls.push('occasions/'+stadSlug+'/');
    pageCount++;
    console.log('  [OK] /occasions/'+stadSlug+'/ ('+filtered.length+')');
    validTopDirs.add(stadSlug);
  }

  // Verweesde mappen opruimen: merk/model/stad-combinaties die niet meer aan de
  // huidige drempels voldoen (of niet meer bestaan) blijven anders voor altijd
  // als dode statische pagina's staan.
  let removedCount = 0;
  fs.readdirSync(OUT_DIR, { withFileTypes: true }).forEach(function(entry) {
    if (!entry.isDirectory()) return;
    const topDir = path.join(OUT_DIR, entry.name);
    if (!validTopDirs.has(entry.name)) {
      fs.rmSync(topDir, { recursive: true, force: true });
      removedCount++;
      console.log('  [VERWIJDERD] /occasions/'+entry.name+'/ (voldoet niet meer aan drempel)');
      return;
    }
    const models = validModelDirs[entry.name];
    if (!models) return; // stad-map, heeft geen submappen
    fs.readdirSync(topDir, { withFileTypes: true }).forEach(function(sub) {
      if (!sub.isDirectory()) return;
      if (!models.has(sub.name)) {
        fs.rmSync(path.join(topDir, sub.name), { recursive: true, force: true });
        removedCount++;
        console.log('    [VERWIJDERD] /occasions/'+entry.name+'/'+sub.name+'/ (voldoet niet meer aan drempel)');
      }
    });
  });
  if (removedCount) console.log(removedCount + ' verweesde pagina(\'s) opgeruimd');

  // Sitemap bijwerken
  // Eerder ontbraken hier /occasions/ zelf, /tco/, en alle merk/model-pagina's
  // (alleen de stad-pagina's werden toegevoegd) -- 400+ pagina's stonden
  // daardoor niet in de sitemap.
  const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    const today = new Date().toISOString().slice(0,10);
    const base = 'https://carkijker.nl/';
    const vasteUrls = ['occasions/', 'tco/', 'over-ons/'];
    const allUrls = [...vasteUrls, ...generatedMerkUrls, ...generatedStadUrls];
    let added = 0;
    for (const u of allUrls) {
      const full = base + u;
      // Exacte <loc>-match i.p.v. sitemap.includes(full): "occasions/" zit
      // als prefix in élke merk/model/stad-URL, dus een losse substring-check
      // dacht ten onrechte dat die al aanwezig was.
      if (!sitemap.includes('<loc>'+full+'</loc>')) {
        const prio = u === 'occasions/' ? '0.8' : (u.split('/').length > 3 ? '0.5' : '0.6');
        const entry = '  <url><loc>'+full+'</loc><lastmod>'+today+'</lastmod><changefreq>weekly</changefreq><priority>'+prio+'</priority></url>';
        sitemap = sitemap.replace('</urlset>', entry + '\n</urlset>');
        added++;
      }
    }
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log('Sitemap bijgewerkt: '+added+' nieuwe URLs (van '+allUrls.length+' gecontroleerd)');
  }

  console.log('\nKlaar: '+pageCount+' pagina\'s gegenereerd in '+OUT_DIR);
}

main();
