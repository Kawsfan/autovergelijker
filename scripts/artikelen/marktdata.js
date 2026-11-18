// scripts/artikelen/marktdata.js
// Berekent de actuele Carkijker-cijfers die een artikelconcept onderbouwen
// (template §5: "elk cijfer krijgt een bron of steekproefgrootte"). Dit is de
// Information Gain van elk artikel: cijfers die nergens anders zo staan, want
// ze komen uit het eigen, dagelijks bijgewerkte aanbod van alle platforms.
//
// Puur functioneel (rows in, stats uit) zodat het zonder netwerk te testen is,
// zie test/artikelen-marktdata.test.js. laadListings() is de enige I/O.
'use strict';

const fs = require('fs');
const path = require('path');
const { slugifyMerk } = require('../../lib/carkijker-core');

const ROOT = path.join(__dirname, '..', '..');

// data/listings-lean-N.json is kolomvormig ({fields, rows}), zie scrape.js.
function laadListings(dataDir) {
  dataDir = dataDir || path.join(ROOT, 'data');
  const rows = [];
  let bijgewerkt = null;
  for (let i = 0; ; i++) {
    const f = path.join(dataDir, 'listings-lean-' + i + '.json');
    if (!fs.existsSync(f)) break;
    const j = JSON.parse(fs.readFileSync(f, 'utf-8'));
    bijgewerkt = bijgewerkt || j.bijgewerkt;
    for (const r of j.rows) {
      const o = {};
      j.fields.forEach((k, idx) => { o[k] = r[idx]; });
      rows.push(o);
    }
  }
  return { rows, bijgewerkt };
}

// Bronwaarden zijn per platform anders gespeld ("SUV of Terreinwagen" vs
// "SUV / Terreinwagen", "Elektriciteit" vs "Elektrisch") -- één taxonomie
// voor zowel filters als uitsplitsingen.
function normBrandstof(b) {
  const s = String(b || '').toLowerCase();
  if (!s) return 'Onbekend';
  if (s.includes('hybride') || s.includes('elektro/')) return 'Hybride';
  if (s.startsWith('elektr')) return 'Elektrisch';
  if (s.includes('diesel')) return 'Diesel';
  if (s.includes('benzine')) return 'Benzine';
  if (s.includes('lpg')) return 'LPG';
  return 'Overig';
}

function normCarrosserie(c) {
  const s = String(c || '').toLowerCase();
  if (!s || s === 'null') return 'Onbekend';
  if (s.includes('suv')) return 'SUV';
  if (s.startsWith('station')) return 'Stationwagon';
  if (s.includes('hatchback')) return 'Hatchback';
  if (s.includes('sedan')) return 'Sedan';
  if (s.includes('mpv')) return 'MPV';
  if (s.includes('cabrio')) return 'Cabriolet';
  if (s.includes('coup')) return 'Coupé';
  return 'Overig';
}

function normTransmissie(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('automaat')) return 'Automaat';
  if (s.includes('hand')) return 'Handgeschakeld';
  return 'Onbekend';
}

// Bruikbaar voor statistiek: echte vraagprijs, geen "verdacht goedkoop"-
// uitschieter (zie lib/dealscore.js) en geen placeholder-prijs.
function bruikbaar(a) {
  return typeof a.prijs === 'number' && a.prijs >= 500 && a.prijs < 2000000 && !a.verdachtGoedkoop;
}

function voldoetAanFilters(a, f) {
  if (!f) return true;
  if (f.minPrijs != null && a.prijs < f.minPrijs) return false;
  if (f.maxPrijs != null && a.prijs > f.maxPrijs) return false;
  if (f.minJaar != null && !(a.jaar >= f.minJaar)) return false;
  if (f.maxJaar != null && !(a.jaar <= f.maxJaar)) return false;
  if (f.maxKm != null && !(a.km <= f.maxKm)) return false;
  if (f.brandstof && f.brandstof.length && !f.brandstof.includes(normBrandstof(a.brandstof))) return false;
  if (f.carrosserie && f.carrosserie.length && !f.carrosserie.includes(normCarrosserie(a.carrosserie))) return false;
  if (f.transmissie && normTransmissie(a.transmissie) !== f.transmissie) return false;
  return true;
}

function kwantiel(gesorteerd, q) {
  if (!gesorteerd.length) return null;
  const pos = (gesorteerd.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return Math.round(gesorteerd[lo] + (gesorteerd[hi] - gesorteerd[lo]) * (pos - lo));
}

function verdeling(items, fn) {
  const c = {};
  items.forEach(a => { const k = fn(a); c[k] = (c[k] || 0) + 1; });
  return Object.entries(c)
    .sort((x, y) => y[1] - x[1])
    .map(([k, n]) => ({ waarde: k, aantal: n, procent: Math.round((n / items.length) * 100) }));
}

function rond(n, op) { return n == null ? null : Math.round(n / op) * op; }

function stats(items) {
  const prijzen = items.map(a => a.prijs).sort((x, y) => x - y);
  const kms = items.map(a => a.km).filter(k => typeof k === 'number' && k > 0).sort((x, y) => x - y);
  const jaren = items.map(a => a.jaar).filter(j => typeof j === 'number' && j > 1950);

  // Prijs per bouwjaar: precies het soort uitsplitsing die template §3 als
  // H3-onderverdeling noemt. Alleen jaren met genoeg exemplaren (>=5), anders
  // is een mediaan geen eerlijk getal om te publiceren.
  const perJaar = {};
  items.forEach(a => { if (a.jaar > 1950) (perJaar[a.jaar] = perJaar[a.jaar] || []).push(a.prijs); });
  const prijsPerBouwjaar = Object.keys(perJaar).map(Number).sort((x, y) => y - x)
    .filter(j => perJaar[j].length >= 5)
    .map(j => {
      const p = perJaar[j].sort((x, y) => x - y);
      const k = items.filter(a => a.jaar === j && a.km > 0).map(a => a.km).sort((x, y) => x - y);
      return { bouwjaar: j, aantal: p.length, mediaanPrijs: rond(kwantiel(p, 0.5), 50), mediaanKm: rond(kwantiel(k, 0.5), 1000) };
    });

  // Bewust GEEN dealer/particulier-verdeling: isDealer() telt elke
  // Marktplaats-advertentie zonder "dealer"/"garage" e.d. in de titel als
  // particulier, terwijl veel dealers dat niet in de titel zetten. Prima voor
  // een badge per advertentie, maar als percentage in een artikel misleidend
  // (het Golf-concept, PR #178, noemde zo "87% particulier").
  const scores = items.map(a => a.dealScore).filter(s => typeof s === 'number');

  return {
    aantal: items.length,
    prijs: {
      p25: rond(kwantiel(prijzen, 0.25), 50),
      mediaan: rond(kwantiel(prijzen, 0.5), 50),
      p75: rond(kwantiel(prijzen, 0.75), 50),
      laagste: prijzen[0] || null,
    },
    kilometerstand: { mediaan: rond(kwantiel(kms, 0.5), 1000), aantalMetKm: kms.length },
    bouwjaar: jaren.length ? { oudste: Math.min(...jaren), nieuwste: Math.max(...jaren) } : null,
    prijsPerBouwjaar,
    brandstof: verdeling(items, a => normBrandstof(a.brandstof)),
    transmissie: verdeling(items, a => normTransmissie(a.transmissie)),
    prijsTrend: verdeling(items, a => a.priceTrend || 'onbekend'),
    mediaanDealScore: scores.length ? kwantiel(scores.sort((x, y) => x - y), 0.5) : null,
  };
}

// Zelfde mapnaam-logica als occasions/, maar dan voor de marktanalyse-pagina's
// (prijstrend/afschrijving) -- een sterk interne-linkdoel voor modelgidsen.
function paginaUrl(sectie, merk, model, rootDir) {
  rootDir = rootDir || ROOT;
  const merkSlug = slugifyMerk(merk);
  const merkDir = path.join(rootDir, sectie, merkSlug);
  if (!fs.existsSync(merkDir)) return null;
  // marktanalyse/ heeft (anders dan occasions/) geen merk-indexpagina, dus de
  // merk-URL is alleen een geldige fallback als die index ook echt bestaat.
  const merkUrl = fs.existsSync(path.join(merkDir, 'index.html')) ? '/' + sectie + '/' + merkSlug + '/' : null;
  if (!model) return merkUrl;
  const want = String(model).toLowerCase();
  const hit = fs.readdirSync(merkDir).filter(d => fs.existsSync(path.join(merkDir, d, 'index.html')))
    .find(d => d === want || d === want.replace(/\s+/g, '-') || d === slugifyMerk(want));
  return hit ? '/' + sectie + '/' + merkSlug + '/' + hit + '/' : merkUrl;
}

// Occasion-URL alleen teruggeven als die pagina echt bestaat -- de check in
// check-artikel.js weigert links naar niet-bestaande pagina's, dus het model
// krijgt hier uitsluitend geldige linkdoelen.
function occasionUrl(merk, model, rootDir) { return paginaUrl('occasions', merk, model, rootDir); }
function marktanalyseUrl(merk, model, rootDir) { return paginaUrl('marktanalyse', merk, model, rootDir); }

// Andere modellen die in de brondata onder hetzelfde modelveld staan
// (Marktplaats e.a. hebben geen apart "Yaris Cross"-model). Zonder deze
// splitsing telde het Yaris-concept (#185) 85 Yaris Cross-SUV's mee en kwam
// de middelste vraagprijs ±€2.500 te hoog uit. Uitvoeringen/trims (GTI,
// GR Sport, Variant, Touring) horen er NIET in: dat is hetzelfde model.
// Sleutel: "merk|model" in kleine letters, waarde: { variantnaam: regex op titel }.
const VARIANTEN = {
  'toyota|yaris': { 'Yaris Cross': /\byaris\s+cross\b/i, 'GR Yaris': /\bgr[\s-]*yaris\b|\byaris\s+gr\b(?![\s-]*sport)/i },
  'toyota|corolla': { 'Corolla Cross': /\bcorolla\s+cross\b/i, 'Corolla Verso': /\bverso\b/i },
  'volkswagen|golf': { 'Golf Plus': /\bgolf\s+plus\b/i, 'Golf Sportsvan': /\bsportsvan\b/i },
  'land rover|range rover': { 'Range Rover Sport': /\brange\s*rover\s+sport\b/i, 'Range Rover Evoque': /\bevoque\b/i, 'Range Rover Velar': /\bvelar\b/i },
};

// Naam van het afwijkende model als deze advertentie er een is, anders null.
// `extra`: optionele regex-strings uit een planning-item ({merk, model, uitsluiten}).
function variantVan(a, extra) {
  const tabel = VARIANTEN[(String(a.merk || '') + '|' + String(a.model || '')).toLowerCase()] || {};
  for (const [naam, re] of Object.entries(tabel)) if (re.test(a.titel || '')) return naam;
  for (const r of extra || []) if (new RegExp(r, 'i').test(a.titel || '')) return r;
  return null;
}

// Signaal voor de eindredactie (in de PR-body): woorden die in de titel direct
// na de modelnaam staan en een groep met een duidelijk afwijkende prijs vormen
// ("Yaris Cross" +140%, "Golf Plus" -64%). Vaak een ander model dat de brondata
// onder dezelfde modelnaam zet, soms een dure/goedkope uitvoering (AMG, John
// Cooper Works). Bewust een hint, geen automatische uitsluiting: de mens beslist
// en zet echte andere modellen in VARIANTEN hierboven. Achteraf getoetst: had
// Yaris Cross, Corolla Cross/Verso, Golf Plus en Range Rover Evoque gevonden,
// Range Rover Sport en Golf Sportsvan niet (prijs te gelijk / te weinig).
const GEEN_VARIANT = new Set(['hybrid', 'hybride', 'electric', 'elektrisch', 'ev', 'phev', 'plug-in', 'hev', 'mhev',
  'tsi', 'tdi', 'tfsi', 'e-tsi', 'etsi', 'vvt-i', 'vvti', 'dig-t', 'gdi', 't-gdi', 'automaat', 'aut', 'benzine', 'diesel',
  'variant', 'combi', 'touring', 'st', 'sc', 'sportstourer', 'sports', 'tourer', 'sportback', 'avant', 'estate', 'sw', 'break', 'wagon', 'sedan', 'hatchback',
  'cabrio', 'cabriolet', 'coupe', 'coupé', 'apk', 'nap', 'btw', 'nieuw', 'nieuwe', 'dealer', 'van', 'met', 'en', 'de']);

function signaleerVarianten(model, items) {
  if (!model || items.length < 20) return [];
  const ml = String(model).toLowerCase();
  const laatste = ml.split(' ').pop();
  const med = l => { const p = [...l].sort((x, y) => x - y); return p[Math.floor(p.length / 2)]; };
  const alle = med(items.map(a => a.prijs));
  const groepen = {};
  items.forEach(a => {
    const t = String(a.titel || '').toLowerCase();
    const i = t.indexOf(ml);
    if (i < 0) return;
    const w = t.slice(i + ml.length).trim().split(/[\s,|/()]+/)[0];
    if (!w || w.length < 2 || /\d/.test(w) || w === laatste || GEEN_VARIANT.has(w)) return;
    (groepen[w] = groepen[w] || []).push(a.prijs);
  });
  return Object.entries(groepen)
    .filter(([, p]) => p.length >= 8 && p.length / items.length >= 0.04)
    .map(([w, p]) => ({ titelwoord: w, aantal: p.length, mediaanPrijs: med(p), afwijkingProcent: Math.round((med(p) / alle - 1) * 100) }))
    .filter(x => Math.abs(x.afwijkingProcent) >= 30)
    .sort((x, y) => Math.abs(y.afwijkingProcent) - Math.abs(x.afwijkingProcent))
    .slice(0, 3);
}

function matchModel(a, m) {
  if (String(a.merk || '').toLowerCase() !== String(m.merk).toLowerCase()) return false;
  if (!m.model) return true;
  return String(a.model || '').toLowerCase() === String(m.model).toLowerCase();
}

// planning-item -> marktdata-snapshot die 1-op-1 in de prompt en de PR-body gaat.
function berekenMarktdata(rows, item, opties) {
  opties = opties || {};
  const basis = rows.filter(bruikbaar).filter(a => voldoetAanFilters(a, item.filters));
  const uit = {
    peildatum: opties.peildatum || new Date().toISOString().slice(0, 10),
    bron: 'Carkijker-aanbod (Marktplaats, AutoScout24, AutoTrack, AutoTrader, ViaBovag e.a.), exclusief advertenties gemarkeerd als verdacht goedkoop',
    filters: item.filters || {},
    totaalInSelectie: basis.length,
    modellen: [],
  };

  const modellen = item.modellen && item.modellen.length ? item.modellen : null;
  if (modellen) {
    for (const m of modellen) {
      const alle = basis.filter(a => matchModel(a, m));
      const items = [], uitgesloten = {};
      alle.forEach(a => {
        const v = m.model ? variantVan(a, m.uitsluiten) : null;
        if (v) uitgesloten[v] = (uitgesloten[v] || 0) + 1; else items.push(a);
      });
      uit.modellen.push(Object.assign({ merk: m.merk, model: m.model || null, occasionUrl: occasionUrl(m.merk, m.model, opties.rootDir), marktanalyseUrl: marktanalyseUrl(m.merk, m.model, opties.rootDir) },
        stats(items), Object.keys(uitgesloten).length ? { uitgeslotenVarianten: uitgesloten } : {},
        { mogelijkeVarianten: signaleerVarianten(m.model, items) }));
    }
  } else {
    // Segmentartikel ("beste automaat onder €10.000"): de meest aangeboden
    // modellen binnen de filters, zodat de lijst op het echte aanbod rust.
    const groepen = {};
    // Een afwijkend model (Yaris Cross) krijgt een eigen groep i.p.v. de
    // cijfers van het basismodel te vertekenen; de links wijzen naar de
    // pagina van het basismodel, omdat er geen aparte variant-pagina is.
    basis.filter(a => a.merk && a.model && a.merk !== 'overig').forEach(a => {
      const v = variantVan(a);
      const k = a.merk + '|' + (v || a.model) + '|' + a.model; (groepen[k] = groepen[k] || []).push(a);
    });
    Object.entries(groepen)
      .sort((x, y) => y[1].length - x[1].length)
      .slice(0, opties.topN || 12)
      .forEach(([k, items]) => {
        const [merk, model, basisModel] = k.split('|');
        uit.modellen.push(Object.assign({ merk, model, occasionUrl: occasionUrl(merk, basisModel, opties.rootDir), marktanalyseUrl: marktanalyseUrl(merk, basisModel, opties.rootDir) },
          stats(items), { mogelijkeVarianten: signaleerVarianten(model, items) }));
      });
  }
  // Selectie-brede cijfers alleen als die iets zeggen: bij een segment (filters)
  // of informatief artikel, niet bij een modelgids over de hele markt.
  if (basis.length && (!modellen || Object.keys(item.filters || {}).length)) uit.selectie = stats(basis);
  return uit;
}

module.exports = {
  laadListings, berekenMarktdata, stats, voldoetAanFilters, occasionUrl, marktanalyseUrl, variantVan, signaleerVarianten,
  normBrandstof, normCarrosserie, normTransmissie,
};
