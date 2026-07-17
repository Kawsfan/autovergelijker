#!/usr/bin/env node
// generate-occasions.js
// Genereert statische HTML-pagina's voor /occasions/* vanuit data/listings.json
// Draait na de dagelijkse scrape via GitHub Actions

const fs   = require('fs');
const path = require('path');

// Config
const LISTINGS_PATH  = path.join(__dirname, 'data', 'listings.json');
const OUT_DIR        = path.join(__dirname, 'occasions');
const SITE_ORIGIN    = 'https://kawsfan.github.io/autovergelijker';
const MIN_MERK_COUNT = 3;
const MIN_MODEL_COUNT = 2;
const MAX_MODELS     = 10;

const MERKEN_DISPLAY = {
  bmw: 'BMW', vw: 'Volkswagen', volkswagen: 'Volkswagen',
  audi: 'Audi', mercedes: 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
  toyota: 'Toyota', ford: 'Ford', opel: 'Opel', renault: 'Renault',
  peugeot: 'Peugeot', honda: 'Honda', nissan: 'Nissan', mazda: 'Mazda',
  kia: 'Kia', hyundai: 'Hyundai', seat: 'SEAT', skoda: 'Skoda',
  volvo: 'Volvo', tesla: 'Tesla', mini: 'MINI', fiat: 'Fiat',
  porsche: 'Porsche', dacia: 'Dacia', citroen: 'Citroen', polestar: 'Polestar',
  suzuki: 'Suzuki', mitsubishi: 'Mitsubishi', alfa: 'Alfa Romeo',
  'alfa-romeo': 'Alfa Romeo', jeep: 'Jeep',
};

function fmt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function slugToDisplay(slug) { return MERKEN_DISPLAY[slug.toLowerCase()] || cap(slug); }

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
    ? merkName + ' ' + modelName + ' occasions - ' + filtered.length + ' aanbiedingen | AutoVergelijker'
    : merkSlug
      ? merkName + ' occasions kopen - ' + filtered.length + ' tweedehands | AutoVergelijker'
      : 'Tweedehands occasions kopen - ' + listings.length + ' aanbiedingen | AutoVergelijker';
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
    { '@type': 'ListItem', position: 1, name: 'AutoVergelijker', item: SITE_ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: 'Occasions',       item: SITE_ORIGIN + '/occasions/' },
  ];
  if (merkSlug) bcItems.push({ '@type': 'ListItem', position: 3, name: merkName, item: SITE_ORIGIN + '/occasions/' + merkSlug + '/' });
  if (modelSlug) bcItems.push({ '@type': 'ListItem', position: 4, name: modelName, item: SITE_ORIGIN + '/occasions/' + merkSlug + '/' + modelSlug + '/' });
  const bcSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: bcItems };

  const statsHtml = '<div class="stats-grid">' +
    (filtered.length ? '<div class="stat"><span class="stat-lbl">Aanbod</span><strong>' + filtered.length + ' occasions</strong></div>' : '') +
    (gemPrijs ? '<div class="stat"><span class="stat-lbl">Gem. vraagprijs</span><strong>&euro; ' + fmt(gemPrijs) + '</strong></div>' : '') +
    (medPrijs ? '<div class="stat"><span class="stat-lbl">Mediaanprijs</span><strong>&euro; ' + fmt(medPrijs) + '</strong></div>' : '') +
    (medKm    ? '<div class="stat"><span class="stat-lbl">Mediaan km</span><strong>' + fmt(medKm) + ' km</strong></div>' : '') +
    (goedkoop ? '<div class="stat"><span class="stat-lbl">Goedkoopste</span><strong>&euro; ' + fmt(goedkoop.prijs) + (goedkoop.jaar ? ' (' + goedkoop.jaar + ')' : '') + '</strong></div>' : '') +
    '</div>';

  let merkLinks = '';
  if (!merkSlug) {
    const mc = {};
    listings.forEach(function(a) { const m = (a.merk||'').toLowerCase().trim(); if (m) mc[m] = (mc[m]||0)+1; });
    merkLinks = Object.entries(mc).filter(function(e){return e[1]>=MIN_MERK_COUNT;}).sort(function(a,b){return b[1]-a[1];}).slice(0,16)
      .map(function(e){return '<a href="/occasions/'+e[0]+'/" class="model-link">'+slugToDisplay(e[0])+' <span>('+e[1]+')</span></a>';}).join('');
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

  const cards = filtered.slice(0,24).map(function(a){
    return '<article class="occ-card" itemscope itemtype="https://schema.org/Car">' +
      (a.afbeelding ? '<img src="'+a.afbeelding+'" alt="'+(a.titel||'').replace(/"/g,'&quot;')+'" loading="lazy" width="140" height="100">' : '<div class="occ-img-placeholder"></div>') +
      '<div class="occ-info"><h2 class="occ-titel" itemprop="name">'+(a.titel||merkName)+'</h2>' +
      '<div class="occ-meta">'+ [a.jaar, a.km?fmt(a.km)+' km':'', a.brandstof, a.transmissie].filter(Boolean).join(' &middot; ') +'</div>' +
      '<div class="occ-prijs" itemprop="offers" itemscope itemtype="https://schema.org/Offer"><span itemprop="price" content="'+(a.prijs||'')+'">'+(a.prijs?'&euro; '+fmt(a.prijs):'Prijs op aanvraag')+'</span><meta itemprop="priceCurrency" content="EUR"></div>' +
      (a.bron?'<span class="occ-bron">'+a.bron+'</span>':'') +
      (a.url?'<a href="'+a.url+'" target="_blank" rel="noopener noreferrer" class="occ-link">Bekijk advertentie &rarr;</a>':'') +
      '</div></article>';
  }).join('');

  const geoText = merkSlug && filtered.length > 0
    ? '<section class="geo-section" aria-label="Marktinformatie '+merkName+'"><h2>Marktoverzicht '+merkName+(modelName?' '+modelName:'')+' occasions</h2><p>Op basis van '+filtered.length+' actuele advertenties ligt de gemiddelde vraagprijs van een tweedehands '+merkName+(modelName?' '+modelName:'')+' op <strong>&euro; '+(gemPrijs?fmt(gemPrijs):'onbekend')+'</strong>. Mediaanprijs: &euro; '+(medPrijs?fmt(medPrijs):'onbekend')+'. Mediaan km-stand: '+(medKm?fmt(medKm)+' km':'onbekend')+'. AutoVergelijker vergelijkt dagelijks aanbod van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG.</p></section>'
    : '';

  return '<!DOCTYPE html>\n<html lang="nl">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '  <title>'+pageTitle+'</title>\n' +
    '  <meta name="description" content="'+metaDesc+'">\n' +
    '  <link rel="canonical" href="'+SITE_ORIGIN+canonicalPath+'">\n' +
    '  <script type="application/ld+json">'+JSON.stringify(schema)+'<\/script>\n' +
    '  <script type="application/ld+json">'+JSON.stringify(bcSchema)+'<\/script>\n' +
    '  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.5}nav{background:#fff;border-bottom:1px solid #e5e5ea;padding:.75rem 1rem;font-size:.875rem}nav a{color:#1a56db;text-decoration:none}nav a+a::before{content:" > ";color:#aaa;margin:0 .3rem}.container{max-width:960px;margin:0 auto;padding:1rem 1rem 3rem}h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .3rem}.subtitle{color:#666;font-size:.9rem;margin-bottom:1.25rem}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin-bottom:1.25rem}.stat{background:#fff;border-radius:10px;padding:.7rem 1rem;border:1px solid #e5e5ea}.stat-lbl{display:block;font-size:.72rem;color:#888;margin-bottom:.15rem}.stat strong{font-size:.95rem}.model-nav{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem}.model-link{background:#fff;border:1px solid #e5e5ea;border-radius:20px;padding:.3rem .85rem;font-size:.83rem;color:#1a56db;text-decoration:none}.model-link span{color:#aaa;font-size:.78rem}.occ-grid{display:grid;gap:.6rem}.occ-card{background:#fff;border-radius:10px;border:1px solid #e5e5ea;overflow:hidden;display:flex}.occ-card img,.occ-img-placeholder{width:140px;height:100px;object-fit:cover;flex-shrink:0;background:#f0f0f5}.occ-info{padding:.75rem 1rem;flex:1;min-width:0}.occ-titel{font-size:.9rem;font-weight:600;margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.occ-meta{font-size:.78rem;color:#666;margin-bottom:.25rem}.occ-prijs{font-size:1.05rem;font-weight:700;color:#1a56db}.occ-bron{display:inline-block;font-size:.72rem;color:#888;margin-top:.25rem}.occ-link{display:inline-block;margin-top:.35rem;font-size:.8rem;color:#1a56db;text-decoration:none}.back-link{display:inline-block;margin-top:2rem;color:#1a56db;font-size:.875rem;text-decoration:none}.empty{text-align:center;padding:3rem;color:#888}.geo-section{margin-top:2rem;padding:1.25rem;background:#fff;border-radius:10px;border:1px solid #e5e5ea}.geo-section h2{font-size:1rem;margin-bottom:.5rem}.geo-section p{font-size:.875rem;color:#444;line-height:1.6}@media(max-width:580px){.occ-card img,.occ-img-placeholder{width:90px;height:80px}}<\/style>\n' +
    '</head>\n<body>\n' +
    '  <nav><a href="/">AutoVergelijker</a><a href="/occasions/">Occasions</a>' +
    (merkSlug ? '<a href="/occasions/'+merkSlug+'/">'+merkName+'</a>' : '') +
    (modelSlug ? '<a href="/occasions/'+merkSlug+'/'+modelSlug+'/">'+modelName+'</a>' : '') +
    '</nav>\n  <div class="container">\n' +
    '  <h1>'+(modelName?merkName+' '+modelName+' occasions':merkSlug?merkName+' occasions kopen':'Tweedehands occasions')+'</h1>\n' +
    '  <p class="subtitle">'+filtered.length+' tweedehands '+merkName+(modelName?' '+modelName:'')+' occasions &mdash; dagelijks bijgewerkt van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</p>\n' +
    '  '+statsHtml+'\n' +
    (merkLinks?'  <div class="model-nav">'+merkLinks+'</div>\n':'') +
    (modelLinks?'  <div class="model-nav">'+modelLinks+'</div>\n':'') +
    '  <div class="occ-grid">'+(cards||'<p class="empty">Geen resultaten gevonden.</p>')+'</div>\n' +
    geoText +
    '  <a href="/" class="back-link">&larr; Terug naar live zoeken</a>\n' +
    '  </div>\n</body>\n</html>';
}

function main() {
  if (!fs.existsSync(LISTINGS_PATH)) { console.error('listings.json niet gevonden'); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf-8'));
  const listings = raw.listings || [];
  console.log('Geladen: ' + listings.length + ' listings');
  listings.forEach(function(a){ if(!a.merk) a.merk = extraheerMerk(a.titel||''); });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let pageCount = 0;
  const generatedUrls = [];

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildPage({ merkSlug: null, modelSlug: null, filtered: listings, listings: listings }), 'utf-8');
  pageCount++; generatedUrls.push('/occasions/'); console.log('  [OK] /occasions/');

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
    pageCount++; generatedUrls.push('/occasions/'+merkSlug+'/'); console.log('  [OK] /occasions/'+merkSlug+'/ ('+filtered.length+')');

    const mc = {};
    filtered.forEach(function(a){ const w=(a.titel||'').toLowerCase().split(' '); if(w.length>1){const m=w[1];if(m&&m.length>1&&!/^\d+$/.test(m))mc[m]=(mc[m]||0)+1;} });
    Object.entries(mc).filter(function(e){return e[1]>=MIN_MODEL_COUNT;}).sort(function(a,b){return b[1]-a[1];}).slice(0,MAX_MODELS).forEach(function(me){
      const modelSlug=me[0];
      const mf=filtered.filter(function(a){return (a.titel||'').toLowerCase().includes(modelSlug);});
      if(mf.length<MIN_MODEL_COUNT) return;
      const mDir=path.join(merkDir,modelSlug);
      fs.mkdirSync(mDir,{recursive:true});
      fs.writeFileSync(path.join(mDir,'index.html'),buildPage({merkSlug:merkSlug,modelSlug:modelSlug,filtered:mf,listings:listings}),'utf-8');
      pageCount++; generatedUrls.push('/occasions/'+merkSlug+'/'+modelSlug+'/'); console.log('    [OK] /occasions/'+merkSlug+'/'+modelSlug+'/ ('+mf.length+')');
    });
  });


  // Update sitemap.xml
  const today = new Date().toISOString().split('T')[0];
  const sitemapUrls = [
    { loc: SITE_ORIGIN + '/', priority: '1.0', changefreq: 'daily' },
    ...generatedUrls.map(function(u) {
      return { loc: SITE_ORIGIN + u, priority: u.split('/').filter(Boolean).length > 2 ? '0.7' : '0.8', changefreq: 'daily' };
    })
  ];
  const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapUrls.map(function(u){ return '  <url>\n    <loc>'+u.loc+'</loc>\n    <changefreq>'+u.changefreq+'</changefreq>\n    <priority>'+u.priority+'</priority>\n    <lastmod>'+today+'</lastmod>\n  </url>'; }).join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log('Sitemap bijgewerkt: ' + sitemapUrls.length + ' URLs');

  console.log('\nKlaar: '+pageCount+' pagina\'s gegenereerd in '+OUT_DIR);
}

main();
