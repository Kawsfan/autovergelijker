// mcp-server/src/tools.js
// Pure logica voor de Carkijker MCP-server -- bewust zonder fetch/netwerk,
// zodat dit los van de Workers-runtime met `node --test` te testen is (zie
// mcp-server/test/tools.test.js). index.js haalt de databestanden op en
// roept deze functies aan met de rauwe listings-array.
'use strict';

// LET OP: dit is NIET dezelfde functie als slugifyMerk() in
// lib/carkijker-core.js (die NFD-normaliseert en diakritische tekens
// wegstript, gebruikt voor /occasions/<slug>/-URL's). data/merken/<x>.json
// wordt geschreven met een eigen, simpelere inline-variant in
// scripts/scrape.js (geen NFD-stap) -- "Citroën" wordt zo "citro-n", niet
// "citroen". Deze kopie moet dus exact scrape.js volgen, niet
// carkijker-core.js, anders 404't elke merk-lookup met een diakritisch
// teken in de naam stilletjes terug naar de generieke top-300-fallback.
function slugifyMerk(naam) {
  return String(naam || 'overig').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

var MAX_LIMIET = 25;
var DEFAULT_LIMIET = 10;

function bevat(veld, zoek) {
  if (!zoek) return true;
  if (!veld) return false;
  return String(veld).toLowerCase().indexOf(String(zoek).toLowerCase()) !== -1;
}

function filterListings(listings, f) {
  f = f || {};
  return listings.filter(function (a) {
    if (f.merk && !bevat(a.merk, f.merk)) return false;
    if (f.model && !bevat(a.model || a.titel, f.model)) return false;
    if (f.prijsMin != null && (a.prijs == null || a.prijs < f.prijsMin)) return false;
    if (f.prijsMax != null && (a.prijs == null || a.prijs > f.prijsMax)) return false;
    if (f.jaarMin != null && (a.jaar == null || a.jaar < f.jaarMin)) return false;
    if (f.jaarMax != null && (a.jaar == null || a.jaar > f.jaarMax)) return false;
    if (f.kmMax != null && (a.km == null || a.km > f.kmMax)) return false;
    if (f.brandstof && !bevat(a.brandstof, f.brandstof)) return false;
    if (f.carrosserie && !bevat(a.carrosserie, f.carrosserie)) return false;
    if (f.transmissie && !bevat(a.transmissie, f.transmissie)) return false;
    return true;
  });
}

function sorteerOpDealscore(listings) {
  return listings.slice().sort(function (a, b) {
    var sa = typeof a.dealScore === 'number' ? a.dealScore : -1;
    var sb = typeof b.dealScore === 'number' ? b.dealScore : -1;
    return sb - sa;
  });
}

function compacteListing(a) {
  return {
    titel: a.titel, merk: a.merk, model: a.model, prijs: a.prijs, jaar: a.jaar, km: a.km,
    brandstof: a.brandstof, carrosserie: a.carrosserie, transmissie: a.transmissie,
    dealScore: a.dealScore, bron: a.bron, locatie: a.locatie, url: a.url,
    bijgewerkt: a.bijgewerkt,
  };
}

function zoekListings(listings, ruweFilters) {
  ruweFilters = ruweFilters || {};
  var limiet = Math.min(Math.max(parseInt(ruweFilters.limiet, 10) || DEFAULT_LIMIET, 1), MAX_LIMIET);
  var gefilterd = filterListings(listings, ruweFilters);
  var gesorteerd = sorteerOpDealscore(gefilterd);
  return {
    totaalGevonden: gefilterd.length,
    resultaten: gesorteerd.slice(0, limiet).map(compacteListing),
  };
}

var DEALSCORE_UITLEG =
  'Dealscore loopt van 0 t/m 100 per advertentie: hoe hoger, hoe gunstiger de vraagprijs is ' +
  'vergeleken met andere advertenties van hetzelfde merk, model, bouwjaar en kilometerstand ' +
  '(regressie op bouwjaar + km-stand per merk/modelgroep, uitgedrukt als z-score). Het is GEEN ' +
  'kwaliteitsoordeel over de auto zelf, alleen een prijsindicatie t.o.v. vergelijkbare exemplaren. ' +
  '60 of hoger = relatief goedkoop voor dit type auto, onder de 35 = relatief duur. ' +
  'Volledige rekenmethode: https://carkijker.nl/artikelen/dealscore-uitgelegd/';

// dagenTerugVoorTrend: minimaal aantal dagen terug om een trend-referentiepunt
// te zoeken (marktHistorie heeft niet gegarandeerd precies 1 entry per dag).
function marktStatsVoorMerk(marktHistorie, merkNaam, dagenTerugVoorTrend) {
  dagenTerugVoorTrend = dagenTerugVoorTrend || 28;
  if (!Array.isArray(marktHistorie) || !marktHistorie.length) return null;
  var merkKey = String(merkNaam || '').toLowerCase();
  var laatste = marktHistorie[marktHistorie.length - 1];
  var huidig = laatste && laatste.segmenten && laatste.segmenten[merkKey];
  if (!huidig) return null;

  var referentie = null;
  for (var i = marktHistorie.length - 1; i >= 0; i--) {
    var dagenTerug = (new Date(laatste.datum) - new Date(marktHistorie[i].datum)) / 86400000;
    if (dagenTerug >= dagenTerugVoorTrend) { referentie = marktHistorie[i]; break; }
  }
  var vorig = referentie && referentie.segmenten && referentie.segmenten[merkKey];
  var trendPct = (vorig && vorig.avg) ? Math.round(((huidig.avg - vorig.avg) / vorig.avg) * 1000) / 10 : null;

  return {
    merk: merkNaam,
    datum: laatste.datum,
    aantalAdvertenties: huidig.n,
    gemiddeldePrijs: huidig.avg,
    mediaanPrijs: huidig.med,
    prijsRange: { min: huidig.min, max: huidig.max, p25: huidig.p25, p75: huidig.p75 },
    trend30Dagen: trendPct === null ? null : { percentage: trendPct, referentieDatum: referentie.datum },
  };
}

module.exports = {
  slugifyMerk: slugifyMerk,
  filterListings: filterListings,
  sorteerOpDealscore: sorteerOpDealscore,
  compacteListing: compacteListing,
  zoekListings: zoekListings,
  DEALSCORE_UITLEG: DEALSCORE_UITLEG,
  marktStatsVoorMerk: marktStatsVoorMerk,
  MAX_LIMIET: MAX_LIMIET,
  DEFAULT_LIMIET: DEFAULT_LIMIET,
};
