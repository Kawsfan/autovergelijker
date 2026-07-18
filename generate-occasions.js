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


  const MODEL_INTRO = {
    "bmw|3-serie": "De BMW 3 Serie combineert sportief rijplezier met luxe comfort. Let bij aankoop op de staat van de remmen, koelingsysteem en controleer de kilometers zorgvuldig.",
    "bmw|5-serie": "De BMW 5 Serie is een veelzijdige zakelijke auto. Controleer bij aankoop de staat van de motor, versnellingsbak en zorg voor een volledige onderhoudshistorie.",
    "audi|a4": "De Audi A4 staat bekend om zijn premium afwerking en rijeigenschappen. Check de staat van het interieur en het DSG-versnellingsbak bij aankoop.",
    "audi|a6": "De Audi A6 biedt veel ruimte en luxe. Let op de staat van het quattro-systeem en het elektricasysteem bij een tweedehands exemplaar.",
    "volkswagen|golf": "De Volkswagen Golf is de meest betrouwbare keuze. Controleer of de distributieriem vervangen is en let op roestvorming aan de onderkant.",
    "volkswagen|polo": "De Volkswagen Polo is ideaal voor dagelijks gebruik. Let op de staat van de versnellingsbak en controleer de APK-status.",
    "mercedes-benz|c-klasse": "De Mercedes C-Klasse combineert luxe met betrouwbaarheid. Controleer bij aankoop de servicehistorie en let op het elektronicapakket.",
    "mercedes-benz|e-klasse": "De Mercedes E-Klasse is een premium reiswagen. Let op de staat van de luchtvering (indien aanwezig) en het navigatiesysteem.",
    "ford|focus": "De Ford Focus is een populaire gezinsauto. Check de staat van de PowerShift versnellingsbak en de elektrische ramen.",
    "toyota|corolla": "De Toyota Corolla staat bekend om zijn betrouwbaarheid en lage onderhoudskosten. Een uitstekende keuze als dagelijkse auto.",
    "renault|megane": "De Renault Megane is ruim en comfortabel. Let bij aankoop op de staat van de automatische versnellingsbak en controleer de elektrische systemen.",
    "opel|astra": "De Opel Astra biedt goede waarde voor het geld. Controleer de staat van de motor en versnellingsbak en vraag naar de onderhoudshistorie."
  };

  // Merk-specifieke kooptips
  var MERK_TIPS = {"bmw":"Let bij een tweedehands BMW op de onderhoudshistorie en controleer of de hogere kilometeronderhoudsbeurten zijn uitgevoerd. Laat altijd een BOVAG- of ANWB-keuring uitvoeren. BMW's houden doorgaans goed hun waarde en zijn betrouwbaar bij goed onderhoud.","audi":"Audi's staan bekend om hun afwerking en rijeigenschappen. Check bij aankoop de DSG-versnellingsbak en controleer op olielekken. Kies bij voorkeur een exemplaar met volledige dealerhistorie.","volkswagen":"Volkswagen occasions zijn uitstekend als dagelijks rijder. Let op de DSG-versnellingsbak (7-traps) bij modellen voor 2015 en controleer de distributieketting bij TSI-motoren. Goed onderhouden VW's gaan gemakkelijk 200.000 km mee.","vw":"Volkswagen occasions zijn uitstekend als dagelijks rijder. Let op de DSG-versnellingsbak (7-traps) bij modellen voor 2015. Goed onderhouden exemplaren gaan gemakkelijk 200.000 km mee.","toyota":"Toyota staat in de top voor betrouwbaarheid. De hybride modellen (Yaris, Corolla, RAV4) zijn zuinig en vragen weinig onderhoud. Controleer bij oudere exemplaren de hybride-accu — Toyota geeft daar 8 jaar garantie op.","volvo":"Volvo's scoren uitstekend op veiligheid en comfort. Let op de onderhoudskosten bij modellen met 4-cilinder turbomotoren. Kies bij voorkeur een exemplaar jonger dan 10 jaar voor lagere reparatiekosten.","mercedes":"Mercedes-Benz occasions bieden premium comfort. Let bij aankoop op de servicehistorie en controleer of de grote beurten zijn gedaan. Elektrische problemen zijn een bekend aandachtspunt bij oudere modellen.","mercedes-benz":"Mercedes-Benz occasions bieden premium comfort. Controleer altijd de servicehistorie bij een dealer en let op elektrische systemen bij modellen ouder dan 5 jaar.","ford":"Ford occasions zijn betaalbaar en onderdelen zijn goed verkrijgbaar. De Focus en Fiesta zijn populaire keuzes. Check de PowerShift automaat bij modellen voor 2018 — die gaf regelmatig problemen.","renault":"Renault heeft de afgelopen jaren grote kwaliteitsverbeteringen doorgevoerd. Let bij elektrische modellen (Zoe) op de accu-status. Benzine- en dieselversies zijn betrouwbaar als het onderhoud klopt.","opel":"Opel occasions zijn scherp geprijsd en bieden goede waar voor je geld. De Astra en Insignia zijn populaire keuzes. Let op roestvorming bij exemplaren ouder dan 8 jaar.","kia":"Kia is uitgegroeid tot een van de meest betrouwbare merken. De fabrieksgarantie van 7 jaar is een uniek voordeel bij jonge occasions. Check of de resterende garantie overdraagbaar is.","hyundai":"Hyundai en Kia delen veel technologie en staan beiden hoog in betrouwbaarheidsonderzoeken. De 5 jaar fabrieksgarantie is een pluspunt. Elektrische modellen (Ioniq, Kona) zijn populair en rijden zuinig.","tesla":"Tesla occasions vragen specifieke aandacht: controleer het accubereik (staat in de auto) en de laadgeschiedenishistorie. Kies bij voorkeur een exemplaar met minimaal 85% accucapaciteit.","porsche":"Porsche occasions houden hun waarde uitstekend. Controleer de volledige onderhoudshistorie bij een officieel dealer. Let bij de Cayenne en Macan op de timing chain en versnellingsbak."};
  var kooptip = merkSlug ? MERK_TIPS[merkSlug] || '' : '';
  var modelIntro = (merkSlug && modelSlug) ? (MODEL_INTRO[merkSlug+'|'+modelSlug] || '') : '';

  const geoText = merkSlug && filtered.length > 0
    ? '<section class="geo-section" aria-label="Marktinformatie '+merkName+'">' +
      '<h2>Tweedehands '+merkName+(modelName?' '+modelName:'')+' kopen — wat moet je weten?</h2>' +
      (modelIntro ? '<div class="model-intro-blok"><p>'+modelIntro+'</p></div>' : '') +
      (kooptip ? '<p class="kooptip">'+kooptip+'</p>' : '') +
      '<h3 style="font-size:.9rem;margin-top:.75rem;margin-bottom:.3rem">Actuele marktdata</h3>' +
      '<p>Op basis van <strong>'+filtered.length+' actuele advertenties</strong> is de gemiddelde vraagprijs van een tweedehands '+merkName+(modelName?' '+modelName:'')+' <strong>&euro; '+(gemPrijs?fmt(gemPrijs):'onbekend')+'</strong>. De mediaanprijs &mdash; waarbij de helft van de occasions goedkoper is &mdash; ligt op &euro; '+(medPrijs?fmt(medPrijs):'onbekend')+'. De mediaan kilometerstand is '+(medKm?fmt(medKm)+' km':'onbekend')+'. AutoVergelijker vergelijkt dagelijks aanbod van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG.</p>' +
      '<p style="margin-top:.5rem"><a href="/" style="color:#1a56db;font-size:.875rem">Bekijk alle '+merkName+' occasions met filters &rarr;</a></p>' +
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
        ? 'Op basis van ' + filtered.length + ' actuele advertenties is de gemiddelde vraagprijs van een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' op AutoVergelijker EUR ' + fmt(gemPrijs) + '. De mediaanprijs bedraagt EUR ' + (medPrijs ? fmt(medPrijs) : 'onbekend') + '.'
        : 'Er zijn momenteel onvoldoende prijsdata beschikbaar.' }
    });
    if (medKm) faqItems.push({
      '@type': 'Question',
      'name': 'Hoeveel kilometer heeft een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' gemiddeld?',
      'acceptedAnswer': { '@type': 'Answer', 'text': 'De mediaan kilometerstand van tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' occasions op AutoVergelijker is ' + fmt(medKm) + ' km, gebaseerd op ' + filtered.filter(function(a){return a.km;}).length + ' advertenties.' }
    });
    faqItems.push({
      '@type': 'Question',
      'name': 'Waar kan ik een tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' kopen?',
      'acceptedAnswer': { '@type': 'Answer', 'text': 'AutoVergelijker toont ' + filtered.length + ' tweedehands ' + merkName + (modelName ? ' ' + modelName : '') + ' occasions van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG op één plek. Het aanbod wordt dagelijks bijgewerkt.' }
    });
    faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': faqItems };
  }


  return '<!DOCTYPE html>\n<html lang="nl">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '  <title>'+pageTitle+'</title>\n' +
    '  <meta name="description" content="'+metaDesc+'">\n' +
    '  <link rel="canonical" href="'+SITE_ORIGIN+canonicalPath+'">\n' +
    '  <script type="application/ld+json">'+JSON.stringify(schema)+'<\/script>\n' +
    '  <script type="application/ld+json">'+JSON.stringify(bcSchema)+'<\/script>\n' +
    (faqSchema ? '  <script type="application/ld+json">'+JSON.stringify(faqSchema)+'<\/script>\n' : '') +
    '  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.5}nav{background:#fff;border-bottom:1px solid #e5e5ea;padding:.75rem 1rem;font-size:.875rem}nav a{color:#1a56db;text-decoration:none}nav a+a::before{content:" > ";color:#aaa;margin:0 .3rem}.container{max-width:960px;margin:0 auto;padding:1rem 1rem 3rem}h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .3rem}.subtitle{color:#666;font-size:.9rem;margin-bottom:1.25rem}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin-bottom:1.25rem}.stat{background:#fff;border-radius:10px;padding:.7rem 1rem;border:1px solid #e5e5ea}.stat-lbl{display:block;font-size:.72rem;color:#888;margin-bottom:.15rem}.stat strong{font-size:.95rem}.model-nav{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem}.model-link{background:#fff;border:1px solid #e5e5ea;border-radius:20px;padding:.3rem .85rem;font-size:.83rem;color:#1a56db;text-decoration:none}.model-link span{color:#aaa;font-size:.78rem}.occ-grid{display:grid;gap:.6rem}.occ-card{background:#fff;border-radius:10px;border:1px solid #e5e5ea;overflow:hidden;display:flex}.occ-card img,.occ-img-placeholder{width:140px;height:100px;object-fit:cover;flex-shrink:0;background:#f0f0f5}.occ-info{padding:.75rem 1rem;flex:1;min-width:0}.occ-titel{font-size:.9rem;font-weight:600;margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.occ-meta{font-size:.78rem;color:#666;margin-bottom:.25rem}.occ-prijs{font-size:1.05rem;font-weight:700;color:#1a56db}.occ-bron{display:inline-block;font-size:.72rem;color:#888;margin-top:.25rem}.occ-link{display:inline-block;margin-top:.35rem;font-size:.8rem;color:#1a56db;text-decoration:none}.back-link{display:inline-block;margin-top:2rem;color:#1a56db;font-size:.875rem;text-decoration:none}.empty{text-align:center;padding:3rem;color:#888}.geo-section{margin-top:2rem;padding:1.25rem;background:#fff;border-radius:10px;border:1px solid #e5e5ea}.geo-section h2{font-size:1rem;margin-bottom:.5rem}.geo-section p{font-size:.875rem;color:#444;line-height:1.6}.geo-section h3{color:#333}.geo-section .model-intro-blok{background:#eff6ff;border-left:4px solid #3b82f6;padding:.75rem 1rem;margin-bottom:.75rem;border-radius:0 8px 8px 0;font-size:.9rem;color:#1e40af}.kooptip{background:#f0f4ff;border-left:3px solid #1a56db;padding:.6rem .8rem;border-radius:0 6px 6px 0;margin-bottom:.5rem}@media(max-width:580px){.occ-card img,.occ-img-placeholder{width:90px;height:80px}}<\/style>\n' +
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
    ((!merkSlug) ? '  <section style="background:#fff;border:1px solid #e5e5ea;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1.25rem">' +'<h2 style="font-size:1rem;font-weight:700;margin-bottom:.5rem">Tweedehands auto kopen in Nederland</h2>' +'<p style="font-size:.875rem;color:#444;line-height:1.6">AutoVergelijker toont dagelijks bijgewerkte occasions van <strong>Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</strong> op &eacute;&eacute;n overzichtelijke plek. Vergelijk '+listings.length+' tweedehands auto&rsquo;s op prijs, km-stand en merk &mdash; zonder meerdere sites te hoeven bezoeken. Klik op een merk om het volledige aanbod te zien, of ga terug naar de <a href="/" style="color:#1a56db">live zoekmachine</a> voor uitgebreide filters.</p>' +'</section>\n' : '') +'  <div class="occ-grid">'+(cards||'<p class="empty">Geen occasions gevonden voor deze combinatie. Probeer een andere merk- of modelcombinatie, of bekijk het <a href="/occasions/" style="color:#1a56db">volledige aanbod</a>.</p>')+'</div>\n' +
    geoText +
    '  <a href="/" class="back-link">&larr; Terug naar live zoeken</a>\n' +
    '  </div>\n</body>\n</html>';
}

const STEDEN = {
  "amsterdam":  { naam: "Amsterdam",  regio: "Noord-Holland", tekst: "Amsterdam heeft een groot en gevarieerd aanbod tweedehands auto's. Door de drukte in de stad kiezen veel Amsterdammers voor een compacte of elektrische auto." },
  "rotterdam":  { naam: "Rotterdam",  regio: "Zuid-Holland",  tekst: "Rotterdam biedt veel keuze in occasions van particulieren en dealers. Ideaal voor wie een betrouwbare auto zoekt voor woon-werkverkeer." },
  "den-haag":   { naam: "Den Haag",   regio: "Zuid-Holland",  tekst: "In Den Haag vind je veel tweedehands auto's in het middensegment. Populaire keuzes zijn compacte gezinsauto's en hybrides." },
  "utrecht":    { naam: "Utrecht",    regio: "Utrecht",        tekst: "Utrecht heeft een actieve occasionmarkt. Veel studenten en forensen zoeken hier een betrouwbare en zuinige auto." },
  "eindhoven":  { naam: "Eindhoven",  regio: "Noord-Brabant", tekst: "In de regio Eindhoven zijn veel technisch goed onderhouden auto's te vinden, vaak van eigenaren werkzaam in de maakindustrie." },
  "groningen":  { naam: "Groningen",  regio: "Groningen",     tekst: "Groningen heeft een gevarieerd tweedehands aanbod. Veel jonge eigenaren bieden hier praktische stadsauto's aan." },
  "tilburg":    { naam: "Tilburg",    regio: "Noord-Brabant", tekst: "Tilburg biedt een goed aanbod occasions in alle prijsklassen, van instapmodellen tot luxere segmenten." },
  "almere":     { naam: "Almere",     regio: "Flevoland",     tekst: "Almere heeft als groeigemeente een actieve occasionmarkt met veel goed onderhouden gezinsauto's." },
  "breda":      { naam: "Breda",      regio: "Noord-Brabant", tekst: "In Breda vind je veel kwalitatieve occasions, mede dankzij de aanwezigheid van grote dealerbedrijven in de regio." },
  "nijmegen":   { naam: "Nijmegen",   regio: "Gelderland",    tekst: "Nijmegen heeft een diverse occasionmarkt. Studenten en gezinnen zoeken hier betaalbare en betrouwbare auto's." }
};

function buildStadPage(stadSlug, stad, filtered, listings) {
  const gemPrijs = filtered.length ? Math.round(filtered.reduce((s,l)=>s+(l.prijs||0),0)/filtered.length) : 0;
  const medPrijs = filtered.length ? [...filtered].sort((a,b)=>(a.prijs||0)-(b.prijs||0))[Math.floor(filtered.length/2)].prijs : 0;
  const cards = filtered.slice(0,24).map(l =>
    '<article class="occ-card"><a href="'+l.url+'" target="_blank" rel="noopener noreferrer">'+
    (l.imgSrc ? '<img src="'+l.imgSrc+'" alt="'+l.titel+'" loading="lazy" width="300" height="200">' : '')+
    '<div class="occ-info"><h3>'+l.titel+'</h3>'+
    '<p class="occ-prijs">&#8364; '+Number(l.prijs||0).toLocaleString("nl-NL")+'</p>'+
    '<p class="occ-meta">'+(l.km?l.km.toLocaleString("nl-NL")+' km &bull; ':'')+(l.bouwjaar||'')+'</p>'+
    '</div></a></article>'
  ).join('');
  return '<!doctype html><html lang="nl"><head>'+
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Tweedehands auto '+stad.naam+' | AutoVergelijker</title>'+
    '<meta name="description" content="Bekijk '+filtered.length+' tweedehands auto occasions in '+stad.naam+', '+stad.regio+'. Vergelijk prijzen en vind jouw ideale occasion.">'+
    '<link rel="canonical" href="https://kawsfan.github.io/autovergelijker/occasions/'+stadSlug+'/">'+
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.5}'+
    'nav{background:#fff;border-bottom:1px solid #e5e5ea;padding:.75rem 1rem;font-size:.875rem}nav a{color:#1a56db;text-decoration:none}'+
    '.container{max-width:960px;margin:0 auto;padding:1rem}h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .3rem}'+
    '.subtitle{color:#666;font-size:.9rem;margin-bottom:1rem}.geo-blok{background:#f0fdf4;border-left:4px solid #16a34a;padding:.75rem 1rem;margin-bottom:1rem;border-radius:0 8px 8px 0}'+
    '.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin:1rem 0}'+
    '.stat-card{background:#fff;border-radius:8px;padding:.75rem 1rem;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}'+
    '.stat-val{font-size:1.25rem;font-weight:700;color:#1a56db}.stat-label{font-size:.75rem;color:#666;margin-top:.2rem}'+
    '.occ-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin-top:1rem}'+
    '.occ-card{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);transition:box-shadow .2s}'+
    '.occ-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.15)}.occ-card a{text-decoration:none;color:inherit;display:block}'+
    '.occ-card img{width:100%;height:160px;object-fit:cover}.occ-info{padding:.75rem}'+
    '.occ-info h3{font-size:.9rem;font-weight:600;margin-bottom:.3rem}.occ-prijs{color:#1a56db;font-weight:700;font-size:1rem}'+
    '.occ-meta{color:#666;font-size:.8rem;margin-top:.2rem}</style></head><body>'+
    '<nav><a href="/">AutoVergelijker</a> &rsaquo; <a href="/occasions/">Occasions</a> &rsaquo; '+stad.naam+'</nav>'+
    '<div class="container">'+
    '<h1>Tweedehands auto occasions '+stad.naam+'</h1>'+
    '<p class="subtitle">'+filtered.length+' occasions gevonden in en rond '+stad.naam+', '+stad.regio+'</p>'+
    '<div class="geo-blok"><p>'+stad.tekst+'</p></div>'+
    '<div class="stats-grid">'+
    '<div class="stat-card"><div class="stat-val">'+filtered.length+'</div><div class="stat-label">Occasions</div></div>'+
    '<div class="stat-card"><div class="stat-val">&#8364; '+(Math.round(gemPrijs/100)*100).toLocaleString("nl-NL")+'</div><div class="stat-label">Gem. prijs</div></div>'+
    '<div class="stat-card"><div class="stat-val">&#8364; '+(Math.round(medPrijs/100)*100).toLocaleString("nl-NL")+'</div><div class="stat-label">Mediaan</div></div>'+
    '</div>'+
    '<div class="occ-grid">'+cards+'</div>'+
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

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildPage({ merkSlug: null, modelSlug: null, filtered: listings, listings: listings }), 'utf-8');
  pageCount++; console.log('  [OK] /occasions/');

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

    const mc = {};
    filtered.forEach(function(a){ const w=(a.titel||'').toLowerCase().split(' '); if(w.length>1){const m=w[1];if(m&&m.length>1&&!/^\d+$/.test(m))mc[m]=(mc[m]||0)+1;} });
    Object.entries(mc).filter(function(e){return e[1]>=MIN_MODEL_COUNT;}).sort(function(a,b){return b[1]-a[1];}).slice(0,MAX_MODELS).forEach(function(me){
      const modelSlug=me[0];
      const mf=filtered.filter(function(a){return (a.titel||'').toLowerCase().includes(modelSlug);});
      if(mf.length<MIN_MODEL_COUNT) return;
      const mDir=path.join(merkDir,modelSlug);
      fs.mkdirSync(mDir,{recursive:true});
      fs.writeFileSync(path.join(mDir,'index.html'),buildPage({merkSlug:merkSlug,modelSlug:modelSlug,filtered:mf,listings:listings}),'utf-8');
      pageCount++; console.log('    [OK] /occasions/'+merkSlug+'/'+modelSlug+'/ ('+mf.length+')');
    });
  });

  // Regiopagina's per stad
  const OUT_STAD = path.join(OUT_DIR, '..');
  const generatedStadUrls = [];
  for (const [stadSlug, stad] of Object.entries(STEDEN)) {
    const filtered = listings.filter(l => {
      const loc = (l.locatie || l.stad || '').toLowerCase();
      return loc.includes(stad.naam.toLowerCase()) || loc.includes(stadSlug);
    });
    if (filtered.length < 3) continue;
    const stadDir = path.join(OUT_STAD, stadSlug);
    fs.mkdirSync(stadDir, {recursive: true});
    fs.writeFileSync(path.join(stadDir, 'index.html'), buildStadPage(stadSlug, stad, filtered, listings), 'utf-8');
    generatedStadUrls.push('occasions/'+stadSlug+'/');
    pageCount++;
    console.log('  [OK] /occasions/'+stadSlug+'/ ('+filtered.length+')');
  }

  // Sitemap bijwerken
  const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    const today = new Date().toISOString().slice(0,10);
    const base = 'https://kawsfan.github.io/autovergelijker/';
    const allUrls = [...generatedStadUrls];
    for (const u of allUrls) {
      const full = base + u;
      if (!sitemap.includes(full)) {
        const entry = '  <url><loc>'+full+'</loc><lastmod>'+today+'</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>';
        sitemap = sitemap.replace('</urlset>', entry + '\n</urlset>');
      }
    }
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log('Sitemap bijgewerkt: '+allUrls.length+' URLs');
  }

  console.log('\nKlaar: '+pageCount+' pagina\'s gegenereerd in '+OUT_DIR);
}

main();
