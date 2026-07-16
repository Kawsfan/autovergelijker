// netlify/edge-functions/occasions.js
// Serveert /occasions/{merk}/ en /occasions/{merk}/{model}/ als volledige HTML-pagina's
// Deno edge runtime — alleen Web APIs

const MERKEN_DISPLAY = {
  bmw: 'BMW', vw: 'Volkswagen', volkswagen: 'Volkswagen',
  audi: 'Audi', mercedes: 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
  toyota: 'Toyota', ford: 'Ford', opel: 'Opel', renault: 'Renault',
  peugeot: 'Peugeot', honda: 'Honda', nissan: 'Nissan', mazda: 'Mazda',
  kia: 'Kia', hyundai: 'Hyundai', seat: 'SEAT', skoda: 'Škoda',
  volvo: 'Volvo', tesla: 'Tesla', mini: 'MINI', fiat: 'Fiat',
  porsche: 'Porsche', dacia: 'Dacia', citroen: 'Citroën',
};

function fmt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function slugToDisplay(slug) {
  return MERKEN_DISPLAY[slug.toLowerCase()] || cap(slug);
}

export default async function handler(request) {
  const url = new URL(request.url);
  const parts = url.pathname
    .replace(/^\/occasions\/?/, '')
    .split('/')
    .filter(Boolean);

  const merkSlug = parts[0] ? decodeURIComponent(parts[0]).toLowerCase() : null;
  const modelSlug = parts[1] ? decodeURIComponent(parts[1]).toLowerCase() : null;

  // Haal listings op — zelfde origin
  let listings = [];
  try {
    const dataUrl = new URL('/data/listings.json', url.origin).href;
    const resp = await fetch(dataUrl, { headers: { 'Cache-Control': 'no-cache' } });
    if (resp.ok) {
      const json = await resp.json();
      listings = json.listings || [];
    }
  } catch (_) { /* geen data beschikbaar */ }

  // Filter
  let filtered = listings;
  if (merkSlug) {
    filtered = filtered.filter(a => {
      const m = (a.merk || '').toLowerCase();
      const t = (a.titel || '').toLowerCase();
      return m === merkSlug ||
        m.includes(merkSlug) ||
        t.startsWith(merkSlug) ||
        (merkSlug === 'vw' && (m === 'volkswagen' || t.startsWith('volkswagen')));
    });
  }
  if (modelSlug) {
    filtered = filtered.filter(a =>
      (a.titel || '').toLowerCase().includes(modelSlug)
    );
  }

  // Stats
  const merkName  = merkSlug  ? slugToDisplay(merkSlug)  : 'Alle merken';
  const modelName = modelSlug ? cap(modelSlug) : null;

  const prijzen = filtered.filter(a => a.prijs).map(a => a.prijs).sort((a, b) => a - b);
  const kms     = filtered.filter(a => a.km).map(a => a.km).sort((a, b) => a - b);
  const gemPrijs = prijzen.length ? Math.round(prijzen.reduce((s, v) => s + v, 0) / prijzen.length) : null;
  const medPrijs = prijzen.length ? prijzen[Math.floor(prijzen.length / 2)] : null;
  const medKm    = kms.length    ? kms[Math.floor(kms.length / 2)]          : null;
  const goedkoop = filtered.filter(a => a.prijs).reduce((m, a) => (!m || a.prijs < m.prijs) ? a : m, null);

  // Modellen voor navigatie (alleen op merkniveau, niet op modelniveau)
  let modelLinks = '';
  if (merkSlug && !modelSlug) {
    const counts = {};
    filtered.forEach(a => {
      const words = (a.titel || '').toLowerCase().split(' ');
      if (words.length > 1) {
        const m = words[1];
        if (m && m.length > 1 && !/^\d+$/.test(m)) {
          counts[m] = (counts[m] || 0) + 1;
        }
      }
    });
    modelLinks = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([m, c]) => `<a href="/occasions/${merkSlug}/${m}/" class="model-link">${cap(m)} <span>(${c})</span></a>`)
      .join('');
  }

  // Merknavigatie voor overzichtspagina
  let merkLinks = '';
  if (!merkSlug) {
    const merkCounts = {};
    listings.forEach(a => {
      const m = (a.merk || '').toLowerCase();
      if (m) merkCounts[m] = (merkCounts[m] || 0) + 1;
    });
    merkLinks = Object.entries(merkCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([m, c]) => `<a href="/occasions/${m}/" class="model-link">${slugToDisplay(m)} <span>(${c})</span></a>`)
      .join('');
  }

  // SEO teksten
  const pageTitle = modelName
    ? `${merkName} ${modelName} occasions — ${filtered.length} aanbiedingen | AutoVergelijker`
    : merkSlug
      ? `${merkName} occasions kopen — ${filtered.length} tweedehands | AutoVergelijker`
      : `Tweedehands occasions kopen — ${listings.length} aanbiedingen | AutoVergelijker`;

  const metaDesc = [
    `${filtered.length} tweedehands ${merkName}${modelName ? ' ' + modelName : ''} occasions.`,
    gemPrijs ? `Gemiddelde vraagprijs: € ${fmt(gemPrijs)}.` : '',
    medKm    ? `Mediaan km-stand: ${fmt(medKm)} km.` : '',
    'Dagelijks bijgewerkt van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG.',
  ].filter(Boolean).join(' ');

  // JSON-LD schema
  const schemaItems = filtered.slice(0, 12).map((a, i) => {
    const item = {
      '@type': 'Car',
      'name': a.titel || merkName,
      'brand': { '@type': 'Brand', 'name': a.merk || merkName },
      'offers': {
        '@type': 'Offer',
        'price': a.prijs,
        'priceCurrency': 'EUR',
        'availability': 'https://schema.org/InStock',
      },
    };
    if (a.url)        item.offers.url = a.url;
    if (a.jaar)       item.vehicleModelDate = String(a.jaar);
    if (a.km)         item.mileageFromOdometer = { '@type': 'QuantitativeValue', value: a.km, unitCode: 'KMT' };
    if (a.brandstof)  item.fuelType = a.brandstof;
    if (a.transmissie) item.vehicleTransmission = a.transmissie;
    return { '@type': 'ListItem', position: i + 1, item };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': pageTitle,
    'numberOfItems': filtered.length,
    'itemListElement': schemaItems,
  };

  // Breadcrumb schema
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'AutoVergelijker', item: `${url.origin}/` },
    { '@type': 'ListItem', position: 2, name: 'Occasions', item: `${url.origin}/occasions/` },
  ];
  if (merkSlug) breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: merkName, item: `${url.origin}/occasions/${merkSlug}/` });
  if (modelSlug) breadcrumbItems.push({ '@type': 'ListItem', position: 4, name: modelName, item: `${url.origin}/occasions/${merkSlug}/${modelSlug}/` });

  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems };

  // HTML kaarten
  const cards = filtered.slice(0, 24).map(a => `
    <article class="occ-card" itemscope itemtype="https://schema.org/Car">
      ${a.afbeelding ? `<img src="${a.afbeelding}" alt="${a.titel || ''}" loading="lazy" width="140" height="100">` : '<div class="occ-img-placeholder"></div>'}
      <div class="occ-info">
        <h2 class="occ-titel" itemprop="name">${a.titel || merkName}</h2>
        <div class="occ-meta">${[a.jaar, a.km ? fmt(a.km) + ' km' : '', a.brandstof, a.transmissie].filter(Boolean).join(' · ')}</div>
        <div class="occ-prijs" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
          <span itemprop="price" content="${a.prijs || ''}">${a.prijs ? '€ ' + fmt(a.prijs) : 'Prijs op aanvraag'}</span>
          <meta itemprop="priceCurrency" content="EUR">
        </div>
        ${a.bron ? `<span class="occ-bron">${a.bron}</span>` : ''}
        ${a.url ? `<a href="${a.url}" target="_blank" rel="noopener noreferrer" class="occ-link">Bekijk advertentie →</a>` : ''}
      </div>
    </article>`).join('');

  const statsHtml = `<div class="stats-grid">
    ${filtered.length ? `<div class="stat"><span class="stat-lbl">Aanbod</span><strong>${filtered.length} occasions</strong></div>` : ''}
    ${gemPrijs ? `<div class="stat"><span class="stat-lbl">Gem. vraagprijs</span><strong>€ ${fmt(gemPrijs)}</strong></div>` : ''}
    ${medPrijs ? `<div class="stat"><span class="stat-lbl">Mediaanprijs</span><strong>€ ${fmt(medPrijs)}</strong></div>` : ''}
    ${medKm    ? `<div class="stat"><span class="stat-lbl">Mediaan km</span><strong>${fmt(medKm)} km</strong></div>` : ''}
    ${goedkoop ? `<div class="stat"><span class="stat-lbl">Goedkoopste</span><strong>€ ${fmt(goedkoop.prijs)}${goedkoop.jaar ? ' (' + goedkoop.jaar + ')' : ''}</strong></div>` : ''}
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="${url.origin}${url.pathname}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url.origin}${url.pathname}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.5}
    nav{background:#fff;border-bottom:1px solid #e5e5ea;padding:.75rem 1rem;font-size:.875rem}
    nav a{color:#1a56db;text-decoration:none}
    nav a+a::before{content:" › ";color:#aaa;margin:0 .3rem}
    .container{max-width:960px;margin:0 auto;padding:1rem 1rem 3rem}
    h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .3rem}
    .subtitle{color:#666;font-size:.9rem;margin-bottom:1.25rem}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin-bottom:1.25rem}
    .stat{background:#fff;border-radius:10px;padding:.7rem 1rem;border:1px solid #e5e5ea}
    .stat-lbl{display:block;font-size:.72rem;color:#888;margin-bottom:.15rem}
    .stat strong{font-size:.95rem}
    .model-nav{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem}
    .model-link{background:#fff;border:1px solid #e5e5ea;border-radius:20px;padding:.3rem .85rem;font-size:.83rem;color:#1a56db;text-decoration:none;transition:background .15s}
    .model-link:hover{background:#f0f4ff}
    .model-link span{color:#aaa;font-size:.78rem}
    .occ-grid{display:grid;gap:.6rem}
    .occ-card{background:#fff;border-radius:10px;border:1px solid #e5e5ea;overflow:hidden;display:flex}
    .occ-card img,.occ-img-placeholder{width:140px;height:100px;object-fit:cover;flex-shrink:0;background:#f0f0f5}
    .occ-info{padding:.75rem 1rem;flex:1;min-width:0}
    .occ-titel{font-size:.9rem;font-weight:600;margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .occ-meta{font-size:.78rem;color:#666;margin-bottom:.25rem}
    .occ-prijs{font-size:1.05rem;font-weight:700;color:#1a56db}
    .occ-bron{display:inline-block;font-size:.72rem;color:#888;margin-top:.25rem}
    .occ-link{display:inline-block;margin-top:.35rem;font-size:.8rem;color:#1a56db;text-decoration:none}
    .occ-link:hover{text-decoration:underline}
    .back-link{display:inline-block;margin-top:2rem;color:#1a56db;font-size:.875rem;text-decoration:none}
    .empty{text-align:center;padding:3rem;color:#888}
    @media(max-width:580px){.occ-card img,.occ-img-placeholder{width:90px;height:80px}}
  </style>
</head>
<body>
  <nav>
    <a href="/">AutoVergelijker</a>
    <a href="/occasions/">Occasions</a>${merkSlug ? `\n    <a href="/occasions/${merkSlug}/">${merkName}</a>` : ''}${modelSlug ? `\n    <a href="/occasions/${merkSlug}/${modelSlug}/">${modelName}</a>` : ''}
  </nav>
  <div class="container">
    <h1>${modelName ? `${merkName} ${modelName} occasions` : merkSlug ? `${merkName} occasions kopen` : 'Tweedehands occasions'}</h1>
    <p class="subtitle">${filtered.length} tweedehands ${merkName}${modelName ? ' ' + modelName : ''} occasions — dagelijks bijgewerkt van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</p>

    ${statsHtml}

    ${merkLinks ? `<div class="model-nav">${merkLinks}</div>` : ''}
    ${modelLinks ? `<div class="model-nav">${modelLinks}</div>` : ''}

    <div class="occ-grid">${cards || '<p class="empty">Geen resultaten gevonden voor deze combinatie.</p>'}</div>

    <a href="/" class="back-link">← Terug naar live zoeken</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public,max-age=1800,stale-while-revalidate=3600',
      'X-Robots-Tag': 'index,follow',
    },
  });
}

export const config = { path: '/occasions/*' };
