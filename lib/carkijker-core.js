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

  return {
    isDealer: isDealer,
    slugifyMerk: slugifyMerk,
    dealScoreKleur: dealScoreKleur,
    DEAL_SCORE_GOED: DEAL_SCORE_GOED,
    DEAL_SCORE_DUUR: DEAL_SCORE_DUUR,
    URL_PARAM_NAAM: URL_PARAM_NAAM,
    resolveUrlParamNaam: resolveUrlParamNaam,
    schatInruilwaarde: schatInruilwaarde,
  };
});
