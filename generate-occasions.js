#!/usr/bin/env node
// generate-occasions.js
// Genereert statische HTML-pagina's voor /occasions/* vanuit data/listings.json
// Draait na de dagelijkse scrape via GitHub Actions

const fs   = require('fs');
const path = require('path');

// Config
const LISTINGS_PATH  = path.join(__dirname, 'data', 'listings.json');
const OUT_DIR        = path.join(__dirname, 'occasions');
const SITE_ORIGIN    = 'https://carkijker.nl';
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
  "kia": "Kia levert uitstekende prijs-kwaliteitsverhouding en heeft de betrouwbaarheidsklacht-ratio sterk verlaagd de laatste jaren. De Ceed en Sportage zijn praktische keuzes. Controleer of de 7-jaars fabrieksgarantie nog actief is — dit is een groot voordeel bij tweedehands aankoop."
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
      '<p>Op basis van <strong>'+filtered.length+' actuele advertenties</strong> is de gemiddelde vraagprijs van een tweedehands '+merkName+(modelName?' '+modelName:'')+' <strong>&euro; '+(gemPrijs?fmt(gemPrijs):'onbekend')+'</strong>. De mediaanprijs &mdash; waarbij de helft van de occasions goedkoper is &mdash; ligt op &euro; '+(medPrijs?fmt(medPrijs):'onbekend')+'. De mediaan kilometerstand is '+(medKm?fmt(medKm)+' km':'onbekend')+'. Carkijker vergelijkt dagelijks aanbod van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG.</p>' +
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
    '  <nav><a href="/">Carkijker</a><a href="/occasions/">Occasions</a>' +
    (merkSlug ? '<a href="/occasions/'+merkSlug+'/">'+merkName+'</a>' : '') +
    (modelSlug ? '<a href="/occasions/'+merkSlug+'/'+modelSlug+'/">'+modelName+'</a>' : '') +
    '</nav>\n  <div class="container">\n' +
    '  <h1>'+(modelName?merkName+' '+modelName+' occasions':merkSlug?merkName+' occasions kopen':'Tweedehands occasions')+'</h1>\n' +
    '  <p class="subtitle">'+filtered.length+' tweedehands '+merkName+(modelName?' '+modelName:'')+' occasions &mdash; dagelijks bijgewerkt van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</p>\n' +
    '  '+statsHtml+'\n' +
    (merkLinks?'  <div class="model-nav">'+merkLinks+'</div>\n':'') +
    (modelLinks?'  <div class="model-nav">'+modelLinks+'</div>\n':'') +
    ((!merkSlug) ? '  <section style="background:#fff;border:1px solid #e5e5ea;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1.25rem">' +'<h2 style="font-size:1rem;font-weight:700;margin-bottom:.5rem">Tweedehands auto kopen in Nederland</h2>' +'<p style="font-size:.875rem;color:#444;line-height:1.6">Carkijker toont dagelijks bijgewerkte occasions van <strong>Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG</strong> op &eacute;&eacute;n overzichtelijke plek. Vergelijk '+listings.length+' tweedehands auto&rsquo;s op prijs, km-stand en merk &mdash; zonder meerdere sites te hoeven bezoeken. Klik op een merk om het volledige aanbod te zien, of ga terug naar de <a href="/" style="color:#1a56db">live zoekmachine</a> voor uitgebreide filters.</p>' +'</section>\n' : '') +'  <div class="occ-grid">'+(cards||'<p class="empty">Geen occasions gevonden voor deze combinatie. Probeer een andere merk- of modelcombinatie, of bekijk het <a href="/occasions/" style="color:#1a56db">volledige aanbod</a>.</p>')+'</div>\n' +
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
  "nijmegen":   { naam: "Nijmegen",   regio: "Gelderland",    tekst: "Nijmegen heeft een gemengd aanbod: compacte stadsauto's voor studenten en ruimere gezinsauto's in het 10.000–18.000 euro segment. De grensligging met Duitsland maakt het aanbod gevarieerder — importauto's met Duits onderhoudshistorie zijn hier vaker te zien. Controleer altijd de NAP-status." }
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
    '<title>Tweedehands auto '+stad.naam+' | Carkijker</title>'+
    '<meta name="description" content="Bekijk '+filtered.length+' tweedehands auto occasions in '+stad.naam+', '+stad.regio+'. Vergelijk prijzen en vind jouw ideale occasion.">'+
    '<link rel="canonical" href="https://carkijker.nl/occasions/'+stadSlug+'/">'+
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
    '<nav><a href="/">Carkijker</a> &rsaquo; <a href="/occasions/">Occasions</a> &rsaquo; '+stad.naam+'</nav>'+
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
    const base = 'https://carkijker.nl/';
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
