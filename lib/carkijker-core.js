// lib/carkijker-core.js
// Gedeelde, puur-functionele logica die tot nu toe BEWUST gedupliceerd stond
// in index.html, generate-occasions.js en scripts/send-notifications.js (zie
// de "bewust hier gedupliceerd"-comments die deze code verving). Drie
// kopieën van dezelfde regel betekent drie plekken die uit de pas kunnen
// lopen -- en precies dát overkwam _toURL()'s parameter-mapping eerder al
// (de GSC "Page with redirect"-bug, #131). Dit bestand is de ene bron van
// waarheid, met unit-tests in test/carkijker-core.test.js.
//
// Werkt zowel in Node (via require() in de generator-scripts) als in de
// browser (via <script src="/lib/carkijker-core.js"></script> vóór
// index.html's eigen inline scripts, als globale CarkijkerCore).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarkijkerCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Herleidt of een advertentie van een dealer of particulier is.
  // Gaspedaal/ViaBovag/AutoScout24 zijn altijd dealerplatforms. Marktplaats
  // is de enige bron hier met echte particuliere aanbieders -- zonder
  // dealer-signaalwoorden in de titel is dat vrijwel zeker particulier. Bij
  // andere/onbekende bronnen blijft het "onbekend" (null) i.p.v. een gok.
  function isDealer(a) {
    if (!a) return null;
    var b = (a.bron || '').toLowerCase();
    if (b === 'gaspedaal' || b === 'viabovag' || b === 'autoscout24') return true;
    var t = (a.titel || '').toLowerCase();
    if (['dealer', 'garage', 'occasions', 'autobedrijf', 'autohandel'].some(function (w) { return t.includes(w); })) return true;
    if (b === 'marktplaats') return false;
    return null;
  }

  // Normaliseert een merknaam naar een URL-/mapnaam-veilige slug (ë -> e,
  // spaties -> streepjes, enz.). Enige bron van waarheid voor de map-/
  // URL-naam van een merk -- zie generate-occasions.js voor de achtergrond
  // van waarom dit ook al eens een "Page with redirect" veroorzaakte.
  function slugifyMerk(naam) {
    return String(naam || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Dezelfde kleurdrempels (60/35) die overal waar een dealscore getoond
  // wordt hetzelfde horen te zijn: groen (60+) = goede deal, rood (<35) =
  // duur, geel = ertussenin. Retourneert {bg, fg} hex-kleuren.
  var DEAL_SCORE_GOED = 60;
  var DEAL_SCORE_DUUR = 35;
  function dealScoreKleur(score) {
    if (score > DEAL_SCORE_GOED) return { bg: '#dcfce7', fg: '#15803d' };
    if (score < DEAL_SCORE_DUUR) return { bg: '#fee2e2', fg: '#b91c1c' };
    return { bg: '#fef9c3', fg: '#854d0e' };
  }

  // De vier filter-<select>/<input>-DOM-id's die een andere naam hebben dan
  // hun canonieke URL-parameter (zie filtersNaarURL()/urlNaarFilters() in
  // index.html voor die canonieke namen: merk, model, brandstof,
  // carrosserie). _toURL() gebruikte voorheen de kale DOM-id als
  // parameternaam, wat bij deze vier niet overeenkwam met wat elders op de
  // site (en in gedeelde links) verwacht werd -- vandaar 65 "Page with
  // redirect"-meldingen in Search Console (#131). resolveUrlParamNaam()
  // is de ene plek die deze vertaling nu nog doet.
  var URL_PARAM_NAAM = {
    merkFilter: 'merk',
    modelInput: 'model',
    brandstofFilter: 'brandstof',
    carrosserieFilter: 'carrosserie',
  };
  function resolveUrlParamNaam(id) {
    return URL_PARAM_NAAM[id] || id;
  }

  // Schat de markt-/inruilwaarde van een auto op basis van vergelijkbare
  // live advertenties van hetzelfde merk+model. Was tot nu toe alleen
  // inline in index.html's Markt-modal gedefinieerd (als _schatInruilwaarde,
  // DOM-gebonden) -- hierheen verplaatst (puur-functioneel, geen DOM) zodat
  // zowel de Markt-modal als de losse /inruilwaarde/-pagina exact dezelfde,
  // geteste berekening gebruiken i.p.v. twee kopieën die uit de pas kunnen
  // lopen. `advertenties` is een array van {merk, model, prijs, km, jaar}
  // (subset-filtering op merk/model gebeurt hier zelf, niet door de caller).
  function schatInruilwaarde(advertenties, merk, model, km, jaar) {
    if (!merk || !model) return { fout: 'Selecteer een merk en model.' };
    var huidigJaar = new Date().getFullYear();
    if (!km || km <= 0) return { fout: 'Vul je kilometerstand in voor een schatting.' };
    if (!jaar || jaar < 1980 || jaar > huidigJaar + 1) return { fout: 'Vul het bouwjaar van je auto in voor een schatting.' };

    var subset = (advertenties || []).filter(function (a) {
      return a.merk === merk && a.model === model && a.prijs >= 500;
    });
    if (subset.length < 5) return { fout: 'Onvoldoende advertenties van dit merk en model voor een betrouwbare schatting.' };

    var metKm = subset.filter(function (a) { return a.km > 1000 && a.km < 300000; });
    if (metKm.length < 5) return { fout: 'Onvoldoende advertenties met bekende kilometerstand voor een betrouwbare schatting.' };

    // Multiple regressie prijs ~ b0 + b1*km + b2*jaar, met bouwjaar als
    // tweede voorspeller (een jonge auto met veel km is meer waard dan een
    // oude auto met evenveel km).
    var metKmJaar = metKm.filter(function (a) { return a.jaar >= 1980 && a.jaar <= huidigJaar + 1; });

    var marktwaarde;
    var n;
    if (metKmJaar.length >= 8) {
      n = metKmJaar.length;
      var meanKm = 0, meanJaar = 0, meanP = 0;
      metKmJaar.forEach(function (a) { meanKm += a.km; meanJaar += a.jaar; meanP += a.prijs; });
      meanKm /= n; meanJaar /= n; meanP /= n;
      var Sxx = 0, Sxz = 0, Szz = 0, Sxy = 0, Szy = 0;
      metKmJaar.forEach(function (a) {
        var dk = a.km - meanKm, dj = a.jaar - meanJaar, dp = a.prijs - meanP;
        Sxx += dk * dk; Sxz += dk * dj; Szz += dj * dj; Sxy += dk * dp; Szy += dj * dp;
      });
      var det = Sxx * Szz - Sxz * Sxz;
      if (Math.abs(det) > 1e-6 * (Sxx * Szz || 1)) {
        var b1 = (Sxy * Szz - Szy * Sxz) / det;
        var b2 = (Szy * Sxx - Sxy * Sxz) / det;
        var b0 = meanP - b1 * meanKm - b2 * meanJaar;
        marktwaarde = Math.max(500, Math.round(b0 + b1 * km + b2 * jaar));
      }
    }
    if (marktwaarde == null) {
      // Fallback: te weinig spreiding in jaar of te weinig data voor een
      // stabiele multiple regressie -- dan een enkelvoudige regressie op km.
      n = metKm.length;
      var sX = 0, sY = 0, sXY = 0, sX2 = 0;
      metKm.forEach(function (a) { sX += a.km; sY += a.prijs; sXY += a.km * a.prijs; sX2 += a.km * a.km; });
      var denom = n * sX2 - sX * sX;
      var sl = denom ? (n * sXY - sX * sY) / denom : 0;
      var ic = (sY - sl * sX) / n;
      marktwaarde = Math.max(500, Math.round(ic + sl * km));
    }

    var inruilMin = Math.round(marktwaarde * 0.70 / 50) * 50;
    var inruilMax = Math.round(marktwaarde * 0.85 / 50) * 50;

    // Bereik van de vergelijkbare advertenties zelf (niet van de regressie-
    // uitkomst) -- puur voor een visuele "waar valt mijn schatting binnen de
    // groep"-balk bij de uitkomst, geen invloed op de berekening hierboven.
    var groepPrijzen = subset.map(function (a) { return a.prijs; });
    var groepMin = Math.min.apply(null, groepPrijzen);
    var groepMax = Math.max.apply(null, groepPrijzen);

    return { marktwaarde: marktwaarde, inruilMin: inruilMin, inruilMax: inruilMax, n: n, groepMin: groepMin, groepMax: groepMax };
  }

  function mediaanVan(prijzen) {
    var pp = prijzen.slice().sort(function (a, b) { return a - b; });
    var n = pp.length;
    return n % 2 === 0 ? Math.round((pp[n / 2 - 1] + pp[n / 2]) / 2) : pp[Math.floor(n / 2)];
  }

  // Prijshistogram met IQR-hekken tegen uitschieters: één extreme advertentie
  // (bv. een exoot voor €400k tussen occasions van €20k) trekt anders bijna de
  // hele balkenreeks samen in de eerste 1-2 balken. Dezelfde methode als een
  // boxplot (Q1-1,5*IQR / Q3+1,5*IQR) i.p.v. vaste percentielen -- die laatste
  // kunnen bij kleine n een enkele uitschieter niet uitsluiten. Was tot nu toe
  // alleen inline in index.html's berekenMarkt() gedefinieerd; hierheen
  // verplaatst zodat de statische Marktanalyse-pagina's (generate-occasions.js)
  // exact dezelfde, geteste histogramberekening gebruiken.
  function berekenPrijsHistogram(prijzen, buckets) {
    buckets = buckets || 12;
    var pp = (prijzen || []).slice().sort(function (a, b) { return a - b; });
    var n = pp.length;
    if (!n) return null;
    var minP = pp[0], maxP = pp[n - 1];
    var histMin = minP, histMax = maxP;
    var q1 = pp[Math.floor(n * 0.25)];
    var q3 = pp[Math.min(n - 1, Math.floor(n * 0.75))];
    var iqr = q3 - q1;
    if (iqr > 0) {
      histMin = Math.max(minP, q1 - 1.5 * iqr);
      histMax = Math.min(maxP, q3 + 1.5 * iqr);
      if (histMax <= histMin) { histMin = minP; histMax = maxP; }
    }
    var range = (histMax - histMin) || 1, step = range / buckets;
    var counts = new Array(buckets).fill(0);
    var buitenBereik = 0;
    pp.forEach(function (p) {
      if (p < histMin || p > histMax) buitenBereik++;
      var clamped = Math.min(Math.max(p, histMin), histMax);
      var i = Math.min(Math.floor((clamped - histMin) / step), buckets - 1);
      counts[i]++;
    });
    return { histMin: histMin, histMax: histMax, step: step, counts: counts, buitenBereik: buitenBereik, mediaan: mediaanVan(pp), n: n };
  }

  // Bouwjaarverdeling (2008 t/m huidig jaar) -- zelfde bereik als de
  // Marktanalyse-modal's jaarData, hierheen verplaatst om ook de statische
  // pagina's dezelfde verdeling te laten tonen.
  function berekenJaarVerdeling(advertenties) {
    var huidigJaar = new Date().getFullYear();
    var jaarData = {};
    (advertenties || []).forEach(function (a) {
      if (a.jaar >= 2008 && a.jaar <= huidigJaar) jaarData[a.jaar] = (jaarData[a.jaar] || 0) + 1;
    });
    var jaren = Object.keys(jaarData).map(Number).sort(function (a, b) { return a - b; });
    return { jaren: jaren, counts: jaren.map(function (j) { return jaarData[j]; }) };
  }

  // Top-deals: zelfde dealScore-weging als de Marktanalyse-modal (40% prijs
  // t.o.v. mediaan, 40% km-ratio voor leeftijd, 20% bouwjaar) -- hierheen
  // verplaatst zodat de statische pagina's dezelfde, geteste selectie tonen
  // i.p.v. een tweede kopie van deze formule.
  function berekenTopDeals(advertenties, mediaan, limit) {
    limit = limit || 5;
    if (!mediaan) return [];
    var huidigJaar = new Date().getFullYear();
    return (advertenties || [])
      .filter(function (a) { return a.prijs > 5000 && a.prijs < mediaan * 0.95 && a.jaar >= 2008 && a.km > 10000 && a.km < 220000; })
      .map(function (a) {
        var pct = Math.round((a.prijs - mediaan) / mediaan * 100);
        var prijsScore = Math.max(0, (mediaan - a.prijs) / mediaan);
        var leeftijd = Math.max(1, huidigJaar - a.jaar);
        var kmRatio = a.km / (leeftijd * 15000);
        var kmScore = Math.max(0, 1 - kmRatio);
        var jaarScore = Math.max(0, Math.min(1, (a.jaar - 2005) / (huidigJaar - 2005)));
        var dealScore = 0.40 * prijsScore + 0.40 * kmScore + 0.20 * jaarScore;
        return { advertentie: a, pct: pct, dealScore: dealScore };
      })
      .sort(function (x, y) { return y.dealScore - x.dealScore; })
      .slice(0, limit);
  }

  // Merkenranglijst: top-volume en top-goedkoopste merken (mediaan, min. 20
  // advertenties) over de hele dataset -- zelfde als de Marktanalyse-modal's
  // ranglijst wanneer er geen merk geselecteerd is (_renderMerkenRanglijst).
  function berekenMerkenRanglijst(advertenties, topN) {
    topN = topN || 8;
    var groepen = {};
    (advertenties || []).forEach(function (a) {
      if (!a.merk || a.merk === 'overig' || !a.prijs || a.prijs < 500) return;
      if (!groepen[a.merk]) groepen[a.merk] = [];
      groepen[a.merk].push(a.prijs);
    });
    var merken = Object.keys(groepen).map(function (m) {
      return { merk: m, n: groepen[m].length, mediaan: mediaanVan(groepen[m]) };
    });
    var topVolume = merken.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, topN);
    var topGoedkoop = merken.filter(function (m) { return m.n >= 20; }).sort(function (a, b) { return a.mediaan - b.mediaan; }).slice(0, topN);
    return { topVolume: topVolume, topGoedkoop: topGoedkoop };
  }

  // Statistieken van één merk+model-groep (mediaan, prijsspreiding,
  // afschrijving per 1.000 km) uit een reeds gefilterde subset -- gedeelde
  // rekenkern voor modelMarktStats() en berekenAlleModelStats() hieronder.
  function _modelStatsUitGroep(merk, model, subset) {
    if (subset.length < 5) return null;
    var pp = subset.map(function (a) { return a.prijs; }).sort(function (a, b) { return a - b; });
    var n = pp.length;
    var metKm = subset.filter(function (a) { return a.km > 1000 && a.km < 300000; });
    var slope = null;
    if (metKm.length >= 5) {
      var kn = metKm.length, sX = 0, sY = 0, sXY = 0, sX2 = 0;
      metKm.forEach(function (a) { sX += a.km; sY += a.prijs; sXY += a.km * a.prijs; sX2 += a.km * a.km; });
      var denom = kn * sX2 - sX * sX;
      slope = denom ? (kn * sXY - sX * sY) / denom : 0;
    }
    return {
      merk: merk, model: model, n: n, mediaan: mediaanVan(pp),
      p25: pp[Math.floor(n * 0.25)], p75: pp[Math.min(n - 1, Math.floor(n * 0.75))],
      afschrKm: slope == null ? null : slope * 1000,
    };
  }

  // Statistieken van één merk+model-segment -- zelfde als de modal's
  // _modelStats(), maar hier zonder DOM-afhankelijkheid. Voor één opzoeking;
  // zie berekenAlleModelStats() als je dit voor (bijna) elke merk+model-
  // combinatie tegelijk nodig hebt (bv. vindVergelijkbareModellen) -- dat in
  // een lus over deze functie aanroepen zou de hele dataset net zo vaak
  // opnieuw filteren.
  function modelMarktStats(advertenties, merk, model) {
    var subset = (advertenties || []).filter(function (a) { return a.merk === merk && a.model === model && a.prijs >= 500; });
    return _modelStatsUitGroep(merk, model, subset);
  }

  // Statistieken van ALLE merk+model-segmenten tegelijk, in één keer over de
  // dataset (O(n) groeperen + O(aantal segmenten) statistiek) -- de bouwsteen
  // voor vindVergelijkbareModellen() op honderden pagina's tegelijk (zie
  // generate-occasions.js) zonder de hele dataset per pagina opnieuw te
  // doorzoeken.
  function berekenAlleModelStats(advertenties) {
    var groepen = {};
    (advertenties || []).forEach(function (a) {
      if (!a.merk || !a.model || !a.prijs || a.prijs < 500) return;
      var key = a.merk + '\u0000' + a.model;
      if (!groepen[key]) groepen[key] = { merk: a.merk, model: a.model, items: [] };
      groepen[key].items.push(a);
    });
    var resultaat = [];
    Object.keys(groepen).forEach(function (key) {
      var g = groepen[key];
      var s = _modelStatsUitGroep(g.merk, g.model, g.items);
      if (s) resultaat.push(s);
    });
    return resultaat;
  }

  // Vergelijkbare modellen: kiest 'limit' andere modellen met de dichtstbijzijnde
  // mediaanprijs -- de statische pendant van de modal's vrije 2-model-kiezer
  // (_renderModelVergelijk), die een bezoekerskeuze nodig heeft en dus niet
  // vooraf gerenderd kan worden. Helpt kiezen wélk model te zoeken, o.b.v.
  // hetzelfde prijssegment. Neemt bewust een reeds met berekenAlleModelStats()
  // vooraf berekende lijst i.p.v. de rauwe advertenties -- anders zou elke
  // aanroep (één per merk+model-pagina) de hele dataset opnieuw doorzoeken.
  function vindVergelijkbareModellen(alleModelStats, merk, model, limit) {
    limit = limit || 2;
    var basis = (alleModelStats || []).find(function (s) { return s.merk === merk && s.model === model; });
    if (!basis) return null;
    var vergelijkbaar = (alleModelStats || [])
      .filter(function (s) { return !(s.merk === merk && s.model === model); })
      .map(function (s) { return { stats: s, afstand: Math.abs(s.mediaan - basis.mediaan) }; })
      .sort(function (a, b) { return a.afstand - b.afstand; })
      .slice(0, limit)
      .map(function (x) { return x.stats; });
    return { basis: basis, vergelijkbaar: vergelijkbaar };
  }

  // Regionale prijstop: top steden (exacte locatienaam uit de advertentie,
  // geen geocoding) op advertentie-aantal, met mediaanprijs t.o.v. landelijk.
  // De statische pendant van de modal's "vergelijk met mijn plaats"-widget
  // (_renderRegionaal), die de locatie van de bezoeker nodig heeft en dus niet
  // vooraf gerenderd kan worden -- hier tonen we in plaats daarvan de steden
  // met het meeste aanbod van dit merk+model.
  function berekenRegionaleTop(advertenties, limit) {
    limit = limit || 5;
    var subset = (advertenties || []).filter(function (a) { return a.prijs >= 500 && a.locatie; });
    if (subset.length < 5) return null;
    var landelijkMediaan = mediaanVan(subset.map(function (a) { return a.prijs; }));
    var groepen = {};
    subset.forEach(function (a) {
      var loc = String(a.locatie).trim();
      if (!loc) return;
      if (!groepen[loc]) groepen[loc] = [];
      groepen[loc].push(a.prijs);
    });
    var steden = Object.keys(groepen).map(function (loc) {
      return { locatie: loc, n: groepen[loc].length, mediaan: mediaanVan(groepen[loc]) };
    }).filter(function (s) { return s.n >= 3; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, limit);
    if (!steden.length) return null;
    return { landelijkMediaan: landelijkMediaan, landelijkN: subset.length, steden: steden };
  }

  return {
    isDealer: isDealer,
    slugifyMerk: slugifyMerk,
    dealScoreKleur: dealScoreKleur,
    DEAL_SCORE_GOED: DEAL_SCORE_GOED,
    DEAL_SCORE_DUUR: DEAL_SCORE_DUUR,
    URL_PARAM_NAAM: URL_PARAM_NAAM,
    resolveUrlParamNaam: resolveUrlParamNaam,
    schatInruilwaarde: schatInruilwaarde,
    berekenPrijsHistogram: berekenPrijsHistogram,
    berekenJaarVerdeling: berekenJaarVerdeling,
    berekenTopDeals: berekenTopDeals,
    berekenMerkenRanglijst: berekenMerkenRanglijst,
    modelMarktStats: modelMarktStats,
    berekenAlleModelStats: berekenAlleModelStats,
    vindVergelijkbareModellen: vindVergelijkbareModellen,
    berekenRegionaleTop: berekenRegionaleTop,
  };
});
