
var TRANS = {
  nl: {
    hero_h1: "Alle occasions. Één zoekopdracht.",
    hero_p:  "Dagelijks gescraped van Marktplaats, AutoScout24, Gaspedaal, ViaBOVAG, AutoTrack en AutoTrader. Geen account, geen kosten.",
    search_ph: "Zoek op trefwoord, merk, model of plaats",
    lbl: ["Merk","Model","Bouwjaar","Prijs","Brandstof","Km.stand","Transmissie","Carrosserie"],
    sort: {"prijs-asc":"Prijs ↑","prijs-desc":"Prijs ↓","jaar-desc":"Nieuwste","km-asc":"Minste km"},
    btn_wis: "\u2715 Wis alles", btn_zoek: "Zoeken", btn_terug: "\u2190 Terug",
    hero_cta: "🔍 Zoek jouw auto",
    afstand_lbl: "📍 Afstand",
    loc_btn: "📌 Mijn locatie",
    alle_afstanden: "Alle afstanden",
    gratis: "Gratis",
    alles: "Alles",
    kosten: "Kosten",
    spec_trans: "Transmissie",
    spec_brand: "Brandstof",
    empty_h3: "Geen resultaten gevonden",
    empty_p: "Pas je filters aan of verbreed je zoekopdracht.",
    verk_recent: "d online",
    verk_lang: "2+ weken",
    spec_carro: "Carrosserie",
    spec_loc: "Locatie",
    agent_desc: "Sla je zoekcriteria op en ontvang een melding als er nieuwe auto's verschijnen.",
    agent_geen: "Geen zoekagenten opgeslagen.",
    agent_opslaan: "💾 Huidige filters opslaan",
    agent_check: "🔍 Nu controleren",
    fav_btn: "Favorieten",
    bekijk_adv: "Bekijk advertentie op",
    vgl_sel: "auto's geselecteerd",
    vgl_btn: "Vergelijk nu",
    opt_merken: "Alle merken", opt_brandstoffen: "Alle brandstoffen", opt_types: "Alle types",
    opt_auto: "Automaat", opt_hand: "Handgeschakeld",
    eigen_p: "Eigen bedrag...", eigen_k: "Eigen km...",
    result: function(n){ return n + ' advertentie' + (n!==1?'s':'') + ' gevonden'; },
    sub: function(b){ return b.length ? 'Via ' + b.join(', ') : 'Autoadvertenties'; }
  },
  en: {
    hero_h1: "All occasions. One search.",
    hero_p:  "Daily scraped from Marktplaats, AutoScout24, Gaspedaal, ViaBOVAG, AutoTrack and AutoTrader. No account, no costs.",
    search_ph: "Search by keyword, make, model or city",
    lbl: ["Make","Model","Year","Price","Fuel","Mileage","Transmission","Body type"],
    sort: {"prijs-asc":"Price \u2191","prijs-desc":"Price \u2193","jaar-desc":"Newest first","km-asc":"Lowest mileage"},
    btn_wis: "\u2715 Clear all", btn_zoek: "Search", btn_terug: "\u2190 Back",
    hero_cta: "🔍 Find your car",
    afstand_lbl: "📍 Distance",
    loc_btn: "📌 My location",
    alle_afstanden: "All distances",
    gratis: "Free",
    alles: "All",
    kosten: "Costs",
    spec_trans: "Transmission",
    spec_brand: "Fuel type",
    empty_h3: "No results found",
    empty_p: "Try adjusting your filters or widening your search.",
    verk_recent: "d listed",
    verk_lang: "2+ weeks",
    spec_carro: "Body type",
    spec_loc: "Location",
    agent_desc: "Save your search and get notified when new cars appear.",
    agent_geen: "No saved alerts.",
    agent_opslaan: "💾 Save current filters",
    agent_check: "🔍 Check now",
    fav_btn: "Favourites",
    bekijk_adv: "View listing on",
    vgl_sel: "cars selected",
    vgl_btn: "Compare now",
    opt_merken: "All makes", opt_brandstoffen: "All fuel types", opt_types: "All types",
    opt_auto: "Automatic", opt_hand: "Manual",
    eigen_p: "Custom...", eigen_k: "Custom...",
    result: function(n){ return n + ' listing' + (n!==1?'s':'') + ' found'; },
    sub: function(b){ return b.length ? 'Via ' + b.join(', ') : 'Car listings'; }
  }
};
window.lang = localStorage.getItem('lang') || 'nl';

function setLang(l) {
  window.lang = l;
  localStorage.setItem('lang', l);
  var tr = TRANS[l];
  var q = function(s){ return document.querySelector(s); };
  var qa = function(s){ return document.querySelectorAll(s); };
  var h1 = q('.hero h1'); if(h1) h1.textContent = tr.hero_h1;
  var hp = q('.hero p');  if(hp) hp.textContent = tr.hero_p;
  var zi = document.getElementById('zoekInput'); if(zi) zi.placeholder = tr.search_ph;
  qa('.filter-kaart label').forEach(function(el,i){ if(tr.lbl[i]) el.textContent = tr.lbl[i]; });
  qa('#sortering option').forEach(function(o){ if(tr.sort[o.value]) o.textContent = tr.sort[o.value]; });
  qa('button').forEach(function(b){
    var t = b.textContent.trim();
    if(/Wis alles|Clear all/.test(t)) b.textContent = tr.btn_wis;
    else if(/^(Zoeken|Search)$/.test(t)) b.textContent = tr.btn_zoek;
    else if(/Terug|Back/.test(t) && !b.classList.contains('info-btn')) b.textContent = tr.btn_terug;
  });
  qa('[data-val="automaat"]').forEach(function(b){ b.textContent = tr.opt_auto; });
  qa('[data-val="handgeschakeld"]').forEach(function(b){ b.textContent = tr.opt_hand; });
  var mo = q('#merkFilter option[value=""]'); if(mo) mo.textContent = tr.opt_merken;
  var bso = q('#brandstofFilter option[value=""]'); if(bso) bso.textContent = tr.opt_brandstoffen;
  qa('#carrosserieFilter option[value=""]').forEach(function(o){ o.textContent = tr.opt_types; });
  qa('#prijsMin option[value="custom"],#prijsMax option[value="custom"]').forEach(function(o){ o.textContent = tr.eigen_p; });
  qa('#kmMin option[value="custom"],#kmMax option[value="custom"]').forEach(function(o){ o.textContent = tr.eigen_k; });
  qa('.lang-btn').forEach(function(b){ b.classList.toggle('actief', b.dataset.lang === l); });
  

  // Extended translations (Elena)
  var en = l === 'en';

  // Nav text spans
  document.querySelectorAll('.nav-txt').forEach(function(el) {
    if (!el.dataset.nl) el.dataset.nl = el.textContent.trim();
    var m = {'Zoekagent':'Alerts','Markt':'Market','Kosten':'Costs'};
    if (m[el.dataset.nl]) el.textContent = en ? ' ' + m[el.dataset.nl] : ' ' + el.dataset.nl;
  });

  // Map / Kaart button
  var _bk = document.getElementById('btnKaart');
  if (_bk) _bk.innerHTML = en ? '🗺 Map' : '🗺 Kaart';

  // Price drops button
  var _pb = document.getElementById('prijsdalingBtn');
  if (_pb) { if (!_pb.dataset.nl) _pb.dataset.nl = _pb.innerHTML; _pb.innerHTML = en ? '📉 Price drops' : _pb.dataset.nl; }

  // Close buttons
  document.querySelectorAll('#sheetCloseBtn, #vergelijkSluit, #agentSluit, #marktSluit').forEach(function(sc) {
    if (!sc.dataset.nl) sc.dataset.nl = sc.textContent.trim();
    if (sc.dataset.nl === '✕ Sluiten' || sc.dataset.nl.includes('Sluiten')) sc.textContent = en ? '✕ Close' : sc.dataset.nl;
  });

  // Search button with result count
  var _vb = document.querySelector('.vinden-btn');
  if (_vb) { var _cnt = (_vb.textContent.match(/[d.,]+/) || [''])[0]; _vb.textContent = en ? 'Search (' + _cnt + ')' : 'Zoeken (' + _cnt + ')'; }

  // Select: first placeholder options
  var _optMap = {'radiusSelect':['Alle afstanden','All distances'],'modelInput':['Selecteer eerst een merk','Select a make first'],'mModel':['Alle modellen','All models'],'mJaar':['Alle jaren','All years'],'mTrans':['Alle transmissies','All transmissions']};
  Object.keys(_optMap).forEach(function(id) { var _s = document.getElementById(id); if (_s && _s.options[0]) _s.options[0].text = en ? _optMap[id][1] : _optMap[id][0]; });

  // Range placeholders
  ['prijsMin','kmMin'].forEach(function(id) { var _s = document.getElementById(id); if (_s && _s.options[0]) _s.options[0].text = en ? 'from' : 'van'; });
  ['prijsMax','kmMax'].forEach(function(id) { var _s = document.getElementById(id); if (_s && _s.options[0]) _s.options[0].text = en ? 'to' : 't/m'; });

  // FAQ summaries
  var _faq = {'Hoe werkt Carkijker?':'How does Carkijker work?','Is Carkijker gratis?':'Is Carkijker free?','Kan ik een auto kopen via Carkijker?':'Can I buy a car through Carkijker?','Hoe vaak worden advertenties bijgewerkt?':'How often are listings updated?','Waarom zie ik sommige advertenties niet meer?':'Why have some listings disappeared?'};
  document.querySelectorAll('summary').forEach(function(s) { if (!s.dataset.nl) s.dataset.nl = s.textContent.trim(); if (_faq[s.dataset.nl]) s.textContent = en ? _faq[s.dataset.nl] : s.dataset.nl; });

  // H2 headings
  var _h2m = {'Marktoverzicht occasions per merk':'Used car market by brand','Hoe werkt Carkijker?':'How Carkijker works'};
  document.querySelectorAll('h2').forEach(function(h2) { if (!h2.dataset.nl) h2.dataset.nl = h2.textContent.trim(); if (_h2m[h2.dataset.nl]) h2.textContent = en ? _h2m[h2.dataset.nl] : h2.dataset.nl; });

    // Hero CTA
  var _hcta = document.querySelector('.hero-cta');
  if (_hcta) _hcta.innerHTML = tr.hero_cta;
  // Afstand label
  var _laf = document.getElementById('lbl_afstand');
  if (_laf) _laf.textContent = tr.afstand_lbl;
  // Location button
  var _locBtn = document.querySelector('.loc-btn');
  if (_locBtn) _locBtn.innerHTML = tr.loc_btn;
  // Radius options
  var _rs = document.getElementById('radiusSelect');
  if (_rs && _rs.options[0]) _rs.options[0].textContent = tr.alle_afstanden;
  // Hero badges Gratis/Free
  document.querySelectorAll('.hero-badge').forEach(function(b) {
    if (/Gratis|Free/.test(b.textContent)) b.innerHTML = b.innerHTML.replace(/Gratis|Free/, tr.gratis);
  });
  // Alles transmission button
  document.querySelectorAll('[data-val=""]').forEach(function(b) {
    if (/Alles|All/.test(b.textContent)) b.textContent = tr.alles;
  });
  // Zoekagent modal buttons
  document.querySelectorAll('.btn').forEach(function(b) {
    var t = b.textContent.trim();
    if (/Huidige filters opslaan|Save current/.test(t)) b.innerHTML = tr.agent_opslaan;
    else if (/Nu controleren|Check now/.test(t)) b.innerHTML = tr.agent_check;
  });
  // Compare bar
  var _vst = document.getElementById('vglSelTxt');
  if (_vst) _vst.textContent = tr.vgl_sel;
if(typeof zoekNu === 'function') zoekNu();
}
document.addEventListener('DOMContentLoaded', function(){ if(window.lang !== 'nl') setLang(window.lang); });
