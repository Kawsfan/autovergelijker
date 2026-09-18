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

  return {
    isDealer: isDealer,
    slugifyMerk: slugifyMerk,
    dealScoreKleur: dealScoreKleur,
    DEAL_SCORE_GOED: DEAL_SCORE_GOED,
    DEAL_SCORE_DUUR: DEAL_SCORE_DUUR,
    URL_PARAM_NAAM: URL_PARAM_NAAM,
    resolveUrlParamNaam: resolveUrlParamNaam,
  };
});
