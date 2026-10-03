

function _saveFilters(){var s={z:document.getElementById("zoekInput").value,m:document.getElementById("merkFilter").value,mo:document.getElementById("modelInput").value,jn:document.getElementById("jaarMin").value,jx:document.getElementById("jaarMax").value,pn:document.getElementById("prijsMin").value,px:document.getElementById("prijsMax").value,kn:document.getElementById("kmMin").value,kx:document.getElementById("kmMax").value,b:(document.getElementById("brandstofFilter")||{}).value||"",c:(document.getElementById("carrosserieFilter")||{}).value||"",t:transmissieActief,s:document.getElementById("sortering").value};var any=s.z||s.m||s.mo||s.jn||s.jx||s.pn||s.px||s.kn||s.kx||s.b||s.c||s.t;if(any||s.s!="jaar-desc")localStorage.setItem("_ck_st",JSON.stringify(s));else localStorage.removeItem("_ck_st");}
function _restoreFilters(){if(window.location.search)return;var raw=localStorage.getItem("_ck_st");if(!raw)return;try{var s=JSON.parse(raw);if(s.z)document.getElementById("zoekInput").value=s.z;if(s.m){document.getElementById("merkFilter").value=s.m;if(typeof updateModelDropdown==="function")updateModelDropdown();}if(s.mo)document.getElementById("modelInput").value=s.mo;if(s.jn)document.getElementById("jaarMin").value=s.jn;if(s.jx)document.getElementById("jaarMax").value=s.jx;if(s.pn)document.getElementById("prijsMin").value=s.pn;if(s.px)document.getElementById("prijsMax").value=s.px;if(s.kn)document.getElementById("kmMin").value=s.kn;if(s.kx)document.getElementById("kmMax").value=s.kx;var bf=document.getElementById("brandstofFilter");if(s.b&&bf)bf.value=s.b;var cf=document.getElementById("carrosserieFilter");if(s.c&&cf)cf.value=s.c;if(s.t)transmissieActief=s.t;if(s.s)document.getElementById("sortering").value=s.s;}catch(e){}}
var _vgl = [];
var _favs = new Set(JSON.parse(localStorage.getItem('_av_favs') || '[]'));
window._vglData = {};

const MERK_MODELLEN={'Volkswagen':['Golf','Polo','Passat','Tiguan','T-Roc','ID.4','ID.3','ID.5'],'BMW':['1-serie','2-serie','3-serie','4-serie','5-serie','7-serie','X1','X3','X5','iX3','i4'],'Toyota':['Corolla','Yaris','RAV4','Prius','Aygo','C-HR','bZ4X'],'Ford':['Focus','Fiesta','Puma','Kuga','Mustang Mach-E','Explorer','Mondeo','Ranger'],'Audi':['A1','A3','A4','A5','A6','Q3','Q5','Q7','e-tron','Q4 e-tron'],'Peugeot':['208','308','3008','2008','508','e-208','e-2008'],'Renault':['Clio','Megane','Captur','Zoe','Scenic','Twingo','Arkana'],'Hyundai':['i10','i20','i30','Tucson','Kona','IONIQ 5','IONIQ 6','Santa Fe'],'Kia':['Picanto','Stonic','Ceed','Sportage','Niro','EV6','Sorento','EV9'],'Tesla':['Model 3','Model S','Model Y','Model X'],'Volvo':['V40','V60','V90','XC40','XC60','XC90','S60','C40'],'Skoda':['Fabia','Octavia','Superb','Kodiaq','Karoq','Scala','Enyaq'],'Mercedes-Benz':['A-Klasse','B-Klasse','C-Klasse','E-Klasse','GLA','GLB','GLC','GLE','EQA','EQC'],'Seat':['Ibiza','Leon','Arona','Ateca','Tarraco'],'Opel':['Corsa','Astra','Mokka','Grandland','Insignia','Corsa-e'],'Fiat':['500','500e','Panda','Tipo','500X'],'Honda':['Civic','Jazz','HR-V','CR-V'],'Mazda':['2','3','6','CX-3','CX-5','CX-30','MX-30'],'Nissan':['Micra','Qashqai','Juke','Leaf','Ariya','X-Trail'],'Citroën':['C1','C3','C3 Aircross','C4','C5 Aircross','e-C4'],'Dacia':['Sandero','Duster','Logan','Spring','Jogger'],'Mini':['Cooper','Clubman','Countryman','Electric'],'Land Rover':['Discovery','Discovery Sport','Range Rover','Defender'],'Porsche':['Cayenne','Macan','Panamera','911','Taycan','Boxster'],'Jeep':['Renegade','Compass','Cherokee','Grand Cherokee','Wrangler','Avenger'],'Alfa Romeo':['Giulia','Stelvio','Tonale','Giulietta','Mito'],'Suzuki':['Swift','Vitara','S-Cross','Jimny','Ignis'],'Mitsubishi':['ASX','Outlander','Eclipse Cross','Space Star'],'Cupra':['Born','Formentor','Ateca','Leon'],'MG':['ZS','HS','MG4','MG5','MG3'],'Polestar':['Polestar 2','Polestar 3','Polestar 4'],'Jaguar':['E-Pace','F-Pace','I-Pace','XE','XF'],'Subaru':['Forester','Outback','XV','Impreza'],'Lexus':['UX','NX','RX','IS','ES','CT'],'BYD':['Atto 3','Han','Tang','Seal','Dolphin'],'Smart':['#1','#3','fortwo'],'DS':['DS3','DS4','DS7','DS9'],'Zeekr':['001','007','X','X2'],'Xpeng':['P7','G3','G9','P5','G6'],'NIO':['ES6','ES8','ET7','EL6','ET5'],'Leapmotor':['C10','T03'],'Ora':['Funky Cat','Good Cat'],'Aiways':['U5','U6']};
function updateModelDropdown(){var merk=document.getElementById('merkFilter').value,sel=document.getElementById('modelInput');if(!merk||!MERK_MODELLEN[merk]){sel.innerHTML='<option value="">Selecteer eerst een merk</option>';sel.disabled=true;sel.style.opacity='0.5';sel.style.cursor='not-allowed';}else{sel.innerHTML='<option value="">Alle modellen</option>'+MERK_MODELLEN[merk].map(function(m){return'<option value="'+m+'">'+m+'</option>';}).join('');sel.disabled=false;sel.style.opacity='1';sel.style.cursor='pointer';}}
function toggleCustomRange(sel){var grp=(sel.id==='prijsMin'||sel.id==='prijsMax')?'prijs':'km';var hasCustom=document.getElementById(grp+'Min').value==='custom'||document.getElementById(grp+'Max').value==='custom';document.getElementById(grp+'-custom').style.display=hasCustom?'flex':'none';}

function _filtersActief(){var _tf=document.getElementById('transmissieFilter');return !!(document.getElementById('zoekInput').value.trim()||document.getElementById('merkFilter').value||document.getElementById('modelInput').value.trim()||document.getElementById('jaarMin').value||document.getElementById('jaarMax').value||document.getElementById('prijsMin').value||document.getElementById('prijsMax').value||document.getElementById('kmMin').value||document.getElementById('kmMax').value||document.getElementById('brandstofFilter').value||document.getElementById('carrosserieFilter').value||transmissieActief||(_tf&&_tf.value));}
function dedupAutos(arr){var seen={};return arr.filter(function(a){if(!a.prijs||!a.km)return true;var k=(a.prijs|0)+(String.fromCharCode(95))+(a.km|0)+(String.fromCharCode(95))+(a.merk||"");if(seen[k]===undefined){seen[k]=a.dealScore||0;return true;}if((a.dealScore||0)>seen[k]){seen[k]=a.dealScore||0;return true;}return false;});}
// Advertentietitels/locaties komen van externe, ongecontroleerde bronnen (iedereen kan
// een Marktplaats/AutoScout24-advertentie met een willekeurige titel plaatsen). Alle
// zulke tekst MOET hierdoorheen vóór 'ie in innerHTML/attributen terechtkomt, anders is
// het een opgeslagen XSS-vector.
function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// Uitgaande listing-links krijgen UTM's mee (zodat de bron-site ziet dat het
// verkeer van Carkijker komt) én een eigen GA4-event bij klik (zodat wíj kunnen
// aantonen hoeveel leads een advertentiebron/affiliate-partner oplevert, i.p.v.
// te moeten vertrouwen op wat de bron zelf terugrapporteert). Geen server-kant
// nodig: puur client-side, dus geen nieuwe infra op een tot nu toe volledig
// statische site.
function outUrl(url, bron) {
  if (!url) return url;
  try {
    var u = new URL(url);
    u.searchParams.set('utm_source', 'carkijker');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', (bron||'occasions').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
    return u.toString();
  } catch (e) { return url; }
}
document.addEventListener('click', function(e){
  var el = e.target.closest && e.target.closest('[data-out]');
  if (!el || typeof gtag !== 'function') return;
  gtag('event', 'click_uitgaande_listing', {
    bron: el.getAttribute('data-bron') || '',
    merk: el.getAttribute('data-merk') || '',
    prijs: Number(el.getAttribute('data-prijs')) || undefined
  });
});
let alleResultaten = [];
let huidigDetailId = null;
// var i.p.v. let: moet ook als window.transmissieActief leesbaar/schrijfbaar
// zijn vanuit de zoekagent-code verderop, die in een latere, aparte
// <script>-tag staat -- een let-binding stopt bij de grens van zijn eigen
// <script>-element, var (top-level) wordt een echte window-property.
var transmissieActief = '';
const VANDAAG = new Date().toISOString().split('T')[0];
// Tier 2 groei-prioriteit: plek voor één advertentie tussen de resultaten is
// gereserveerd (zie .ad-slot / renderAutoResultaten), maar nog niet actief --
// bij te weinig verkeer levert een advertentienetwerk nog niets op. Zet dit
// op true (en koppel een netwerkscript) zodra dat de moeite waard is.
window.ADS_ENABLED = false;

// ── LADEN ─────────────────────────────────────────────────────────────────────
// Kleine sleep-helper voor de retry-backoff hieronder.
function _sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }
// listings-top.json (~3,4MB) is de kritieke eerste fetch: zonder resultaat
// hier toont de hele pagina "Laden mislukt". Eén hapering op een wisselende
// mobiele verbinding (of een tussentijds afgebroken/onvolledige respons, die
// resp.json() als parse-fout naar boven gooit) was voorheen definitief -- geen
// retry, dus pas een handmatige refresh hielp. Probeert nu tot 3x, met een
// korte oplopende pauze, voor we de "Laden mislukt"-melding daadwerkelijk
// tonen.
async function _fetchListingsTopMetRetry() {
  const max = 3;
  let laatsteFout;
  for (let poging = 1; poging <= max; poging++) {
    try {
      const resp = await fetch('/data/listings-top.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } catch (e) {
      laatsteFout = e;
      if (poging < max) await _sleep(poging * 700);
    }
  }
  throw laatsteFout;
}

async function laadListings() {
  try {
    const data = await _fetchListingsTopMetRetry();
    // data.totaal komt uit de scraper en is identiek in listings-top.json en listings.json —
    // dit getal verandert dus niet als de volledige dataset later op de achtergrond bijladen wordt.
    window._totaalAdvertenties = data.totaal || (data.listings || []).length;
    window._totaalPlatforms = (data.bronnen || []).length;
    alleResultaten = dedupAutos(data.listings || []);
    window._alleAutos = alleResultaten;
    alleResultaten.forEach(function(a){if(!a.merk||!/^[a-zA-ZÀ-ɏ]/.test(a.merk))a.merk=extraheerMerk(a.titel||"");});
    // a.model bestaat niet in de scraped data (alleen a.merk) -- zonder deze
    // backfill blijft de modeldropdown in Marktanalyse (en dus ook de
    // inruilwaarde-schatter, die merk+model verplicht stelt) altijd leeg.
    alleResultaten.forEach(function(a){if(!a.model)a.model=_getModel(a.titel||"");});

    if (alleResultaten.length === 0) {
      // Was hier voorheen: filtering (favorieten/"nieuw"/afstand) toegepast op een
      // nooit-gedeclareerde variabele "gesorteerd" -- dat gooide in deze (zeldzame
      // "scraper leverde 0 advertenties op")-tak altijd een ReferenceError, i.p.v.
      // gewoon de onderstaande "nog geen advertenties"-melding te tonen. Zinloos
      // sowieso: er valt niets te filteren als alleResultaten al leeg is.
      window._laadStatus = 'leeg';
      if(window._pagina>1&&!window._manualPage)window._pagina=1;
      window._manualPage=false;
      if(typeof filtersNaarURL==='function')filtersNaarURL();
      document.getElementById('autoGrid').innerHTML = `
        <div class="geen-resultaten">
          <span class="icon">🔄</span>
          <h2>Nog geen advertenties</h2>
          <p>De scraper draait dagelijks om 06:00. Kom morgen terug!<br/>
          Of zoek direct op <a href="https://www.gaspedaal.nl/" target="_blank">Gaspedaal</a>.</p>
        </div>`;
      ((document.getElementById('statusTekst')||{})||{}).textContent = 'Nog geen advertenties beschikbaar';
      return;
    }

    const bijgewerkt = data.bijgewerkt
      ? new Date(data.bijgewerkt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
      : '';
    ((document.getElementById('statusTekst')||{})||{}).textContent =
      `${window._totaalAdvertenties} advertenties geladen` + (bijgewerkt ? ` · Bijgewerkt: ${bijgewerkt}` : '');

    // Update bron badge dynamically based on actual data
    const bronnen = [...new Set(alleResultaten.map(l => l.bron).filter(Boolean))];
    if (bronnen.length > 0) {
      (document.getElementById('bronBadge')||{}).textContent = bronnen.join(' · ');
    }

    updateVindenCount(window._totaalAdvertenties);
    _restoreFilters();
    _populeerMerkFilter();
    _vulZoekSuggesties();
    zoekNu();
    if (typeof urlNaarMarkt === 'function') urlNaarMarkt();
    // Trending/merk-stats/schema pas ná de eerste render van de resultatengrid
    // (niet-kritiek voor wat de gebruiker als eerste ziet) — verbetert LCP.
    setTimeout(function(){
      berekenTrending();
      _renderMerkStats(alleResultaten);
      _renderMerkenLinks(alleResultaten);
      if (typeof _injectCarSchema === 'function') _injectCarSchema(alleResultaten);
    }, 0);
    // Background: laad alle listings (uitgesteld — niet meteen bij pageload)
    window._isSubset = !!data.isSubset;
    if (data.isSubset) {
      window._laadVolledig = function() {
        if (window._volledigGeladen) return;
        window._volledigGeladen = true;
        // listings-lean-*.json i.p.v. listings.json (performance-audit 31 aug):
        // zelfde volledige advertentieset, maar zonder de imgs-fotogalerij
        // (~39% kleiner) -- die is alleen nodig in de detailweergave, en
        // daar zorgt de vangnet-fetch in openDetail() (zie verderop) alsnog
        // voor de volledige galerij via het bijbehorende merken/<merk>.json.
        //
        // Sinds 8 sep '26 staat dit in kolomvorm (gedeelde `fields`-lijst +
        // `rows` array-per-advertentie i.p.v. object-per-advertentie) om
        // onder Cloudflare's 25MiB-bestandslimiet te blijven. Sinds 12 sep
        // '26 bovendien opgesplitst in meerdere genummerde bestanden
        // (listings-lean-0.json, -1.json, ...) -- de kolomvorm-fix loste het
        // op bij 46,8k advertenties, maar 4 dagen later (61,7k) stond het
        // enkele bestand alwéér over de limiet. Chunking schaalt vanzelf mee
        // met een groeiend aanbod i.p.v. dat er ooit weer een harde grens
        // bereikt wordt (zie scripts/scrape.js). Chunk 0 eerst ophalen (voor
        // het totale aantal chunks), de rest daarna parallel; meteen na het
        // fetchen terug naar gewone objecten, zodat de rest van deze functie
        // (en de rest van de codebase) ongewijzigd blijft.
        function _reconstrueerLean(chunk) {
          return chunk.rows.map(function(row){
            var o = {};
            for (var i=0;i<chunk.fields.length;i++){ if (row[i] !== null) o[chunk.fields[i]] = row[i]; }
            return o;
          });
        }
        fetch('/data/listings-lean-0.json').then(function(r){return r.json();}).then(function(eersteChunk){
          var totalChunks = eersteChunk.totalChunks || 1;
          var overigeFetches = [];
          for (var i=1;i<totalChunks;i++) overigeFetches.push(fetch('/data/listings-lean-'+i+'.json').then(function(r){return r.json();}));
          return Promise.all(overigeFetches).then(function(overigeChunks){
            var alleRows = _reconstrueerLean(eersteChunk);
            overigeChunks.forEach(function(c){ alleRows = alleRows.concat(_reconstrueerLean(c)); });
            return { listings: alleRows, totaal: eersteChunk.totaal };
          });
        }).then(function(fullData){
          var full = fullData.listings||[];
          // totaal blijft ongewijzigd (zelfde bron als listings-top.json), dus alleen de
          // achterliggende pool aanvullen — geen zichtbare aantallen laten "springen".
          window._totaalAdvertenties = fullData.totaal || window._totaalAdvertenties;
          if(full.length > alleResultaten.length){
            alleResultaten = dedupAutos(full);
            window._alleAutos = alleResultaten;
            alleResultaten.forEach(function(a){if(!a.merk)a.merk=extraheerMerk(a.titel||'');});
            alleResultaten.forEach(function(a){if(!a.model)a.model=_getModel(a.titel||'');});
            _populeerMerkFilter();
            _vulZoekSuggesties();
            // Zoekagenten checken pas ná de volledige dataset opnieuw: de eerdere,
            // automatische check (3s na laden, zie de IIFE bij controleerZoekagenten)
            // draait vrijwel altijd nog tegen de kleine top-300-subset, en zou dus
            // nieuwe advertenties buiten die subset structureel missen.
            if (typeof controleerZoekagenten === 'function') controleerZoekagenten(false);
            // Trending/merk-stats/schema zijn bij het eerste laden berekend op de kleine
            // top-subset (dealScore-gesorteerd, dus niet representatief voor de volledige
            // merkverdeling) — nu de complete dataset binnen is, opnieuw berekenen zodat
            // deze secundaire onderdelen ook kloppen.
            setTimeout(function(){
              berekenTrending();
              _renderMerkStats(alleResultaten);
              _renderMerkenLinks(alleResultaten);
              if (typeof _injectCarSchema === 'function') _injectCarSchema(alleResultaten);
            }, 0);
            // Alleen zichtbaar herrenderen (met fade) als de gebruiker al aan het zoeken/filteren
            // is — dan zijn er mogelijk nieuwe matches. Bij de standaard, ongefilterde weergave
            // niet herrenderen: dat gaf een storende flikkering en veranderde kaarten/aantallen
            // zomaar terwijl iemand aan het kijken was.
            if (_filtersActief()) {
              var _g=document.getElementById('autoGrid');if(_g){_g.style.transition='opacity 0.3s';_g.style.opacity='0.5';}
              setTimeout(function(){zoekNu();if(_g){setTimeout(function(){_g.style.opacity='1';_g.style.transition='';},150);}},300);
            }
          }
        }).catch(function(){});
      };
      // Laad pas na 8 seconden (requestIdleCallback indien beschikbaar)
      if (window.requestIdleCallback) {
        requestIdleCallback(function(){ setTimeout(window._laadVolledig, 3000); }, {timeout: 10000});
      } else {
        setTimeout(window._laadVolledig, 0);
      }
    }
    // getComputedStyle i.p.v. .style.display: die laatste is alleen de inline stijl en
    // staat bij het eerste laden altijd leeg (''), ook al verbergt de stylesheet de
    // kaart standaard — waardoor renderKaart() voorheen op ELKE pageload draaide, ook
    // als de kaartweergave niet actief was. Los ook geïsoleerd: als de Leaflet-kaart om
    // wat voor reden dan ook faalt (CDN niet bereikbaar, ad-blocker), mag dat niet de
    // hele resultatenlijst wegvagen.
    if (getComputedStyle(document.getElementById('kaartView')).display !== 'none') {
      _laadLeaflet().then(function(){
        try { renderKaart(); } catch (kaartErr) { console.error('renderKaart mislukt:', kaartErr); }
      }).catch(function(kaartErr){ console.error('Kaart laden mislukt:', kaartErr); });
    }
  } catch (err) {
    window._laadStatus = 'mislukt';
    // De generieke melding hieronder gaf tot nu toe geen enkel aanknopingspunt
    // om een structurele "Laden mislukt" (retry hielp niet, dus geen
    // eenmalige netwerkhapering) te diagnosticeren zonder devtools-toegang.
    // Toon daarom ook de daadwerkelijke JS-foutmelding, in leesbare/kopieerbare
    // vorm -- console.error blijft staan voor wie wél devtools heeft.
    console.error('laadListings mislukt:', err);
    const foutDetail = (err && (err.name || 'Error') + ': ' + (err.message || String(err))) || 'onbekende fout';
    document.getElementById('autoGrid').innerHTML = `
      <div class="geen-resultaten">
        <span class="icon">⚠️</span>
        <h2>Laden mislukt</h2>
        <p>Vernieuw de pagina om het opnieuw te proberen.</p>
        <p style="margin-top:10px;font-size:11.5px;font-family:monospace;color:var(--subtekst);word-break:break-word;user-select:text">${escHtml(foutDetail)}</p>
      </div>`;
    ((document.getElementById('statusTekst')||{})||{}).textContent = 'Laden mislukt';
  }
}

function updateVindenCount(n) {
  const el = document.getElementById('vindenCount');
  if (el) el.textContent = n > 0 ? `(${n.toLocaleString('nl-NL')})` : '';
}

// ── TRANSMISSIE TOGGLE ────────────────────────────────────────────────────────
function setTransmissie(btn) {
  document.querySelectorAll('.toggle-btns button').forEach(b => b.classList.remove('actief'));
  btn.classList.add('actief');
  transmissieActief = btn.dataset.val;
  zoekNu();
}

// ── FILTEREN ──────────────────────────────────────────────────────────────────
async function _laadMerkEnZoek() {
  if (window._isSubset) {
    const merk = (document.getElementById('merkFilter')||{}).value || '';
    if (merk) {
      const slug = merk.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      try {
        const r = await fetch('data/merken/' + slug + '.json');
        if (r.ok) {
          const d = await r.json();
          const merkListings = d.listings || [];
          const lc = merk.toLowerCase();
          const other = alleResultaten.filter(function(l){ return (l.merk||'').toLowerCase() !== lc; });
          alleResultaten = other.concat(merkListings);
          window._alleAutos = alleResultaten;
        }
      } catch(e) {}
    }
  }
  zoekNu();
}

function zoekNu() {
    // Trigger volledig laden bij actieve zoekopdracht
    if (window._laadVolledig && (document.getElementById('zoekInput').value.trim() || document.getElementById('merkFilter').value)) { window._laadVolledig(); }

  // Data (listings-top.json) kan nog onderweg zijn -- vroeger stopte zoekNu()
  // hier stilzwijgend, waardoor een bezoeker die meteen na het laden van de
  // pagina al ging filteren (bv. op een trage verbinding) niets te zien kreeg:
  // geen foutmelding, gewoon een bevroren skeleton. laadListings() roept
  // zoekNu() zelf ook aan zodra de data binnen is, dus dit herstelt zichzelf --
  // maar tot die tijd verdient de gebruiker wél feedback i.p.v. stilte.
  if (alleResultaten.length === 0) {
    // window._laadStatus wordt in laadListings() op 'mislukt'/'leeg' gezet zodra
    // het laden een terminale staat bereikt (fetch mislukt, of 0 advertenties) --
    // in dat geval staat er al een correcte "Laden mislukt"/"Nog geen advertenties"-
    // melding in #autoGrid (die #skLoader ook verwijdert). Zonder deze check zou een
    // latere filterwijziging die juiste melding overschrijven met een "bezig met
    // laden"-tekst die nooit meer verdwijnt (er is geen retry). Alleen tonen als
    // het laden nog écht bezig is (geen terminale status bereikt).
    if (!window._laadStatus) {
      var _lg = document.getElementById('autoGrid');
      if (_lg && !document.getElementById('skLoader')) {
        _lg.innerHTML = '<div class="geen-resultaten"><span class="icon">⏳</span><h3>Advertenties laden...</h3><p>Een moment geduld, je filter wordt toegepast zodra de data binnen is.</p></div>';
      }
    }
    return;
  }

  const zoek     = document.getElementById('zoekInput').value.trim().toLowerCase();
  const merk     = document.getElementById('merkFilter').value.toLowerCase();
  const model    = document.getElementById('modelInput').value.trim().toLowerCase();
  const jaarMin  = parseInt(document.getElementById('jaarMin').value) || 0;
  const jaarMax  = parseInt(document.getElementById('jaarMax').value) || 9999;
  var _pMnV=document.getElementById('prijsMin').value;const prijsMin=_pMnV==='custom'?(parseInt(document.getElementById('prijsMinCustom').value)||0):(parseInt(_pMnV)||0);
  var _pMxV=document.getElementById('prijsMax').value;const prijsMax=_pMxV==='custom'?(parseInt(document.getElementById('prijsMaxCustom').value)||Infinity):(parseInt(_pMxV)||Infinity);
  var _kMnV=document.getElementById('kmMin').value;const kmMin=_kMnV==='custom'?(parseInt(document.getElementById('kmMinCustom').value)||0):(parseInt(_kMnV)||0);
  var _kMxV=document.getElementById('kmMax').value;const kmMax=_kMxV==='custom'?(parseInt(document.getElementById('kmMaxCustom').value)||Infinity):(parseInt(_kMxV)||Infinity);
  const carroVal = document.getElementById('carrosserieFilter').value.toLowerCase();
  const bsVal    = document.getElementById('brandstofFilter').value.toLowerCase();
  // Afstandsfilter: hergebruikt _vindStadCoord()/_haversineKm() (elders in dit
  // bestand, voor de Marktanalyse-regiotool) i.p.v. de NL_CITIES-opzoeklogica
  // een derde keer te dupliceren. window._locCoord wordt gezet door _geoLoc()
  // (locatieveld) of geolocate() (Mijn locatie-knop) -- als dat door timing nog
  // niet gebeurd is maar het locatieveld wél een bekende plaatsnaam bevat, hier
  // nog een directe (synchrone) poging als vangnet.
  const radiusKm = parseInt(document.getElementById('radiusSelect').value) || 0;
  if (radiusKm > 0 && !window._locCoord) {
    const _liWaarde = document.getElementById('locInput').value.trim();
    if (_liWaarde) window._locCoord = _vindStadCoord(_liWaarde);
  }
  const _locCoordNu = window._locCoord;

  let gefilterd = alleResultaten.filter(a => {
    const titel = (a.titel || '').toLowerCase();
    const locatie = (a.locatie || '').toLowerCase();
    if (zoek && !titel.includes(zoek) && !locatie.includes(zoek)) return false;
    if (merk && (a.merk||"").toLowerCase() !== merk && !titel.includes(merk)) return false;
    if (model && !titel.includes(model)) return false;
    if (jaarMin && (a.jaar || 0) < jaarMin) return false;
    if (jaarMax < 9999 && (a.jaar || 9999) > jaarMax) return false;
    if (prijsMin && a.prijs < prijsMin) return false;
    if (prijsMax && a.prijs > prijsMax) return false;
    if (kmMin && (a.km || 0) < kmMin) return false;
    if (kmMax && (a.km || 0) > kmMax) return false;
    if (carroVal && !(a.carrosserie || '').toLowerCase().includes(carroVal)) return false;
    if (bsVal) {
      const bf = (a.brandstof || '').toLowerCase();
      if (bsVal === 'hybride') { if (!bf.includes('hybride')) return false; }
      else if (bsVal === 'elektrisch') { if (!bf.includes('elektr')) return false; }
      else if (!bf.includes(bsVal)) return false;
    }
    if (radiusKm > 0 && _locCoordNu) {
      const _ac = _vindStadCoord(a.locatie);
      if (!_ac || _haversineKm(_locCoordNu, _ac) > radiusKm) return false;
    }
    if (transmissieActief) {
      const tr = (a.transmissie || '').toLowerCase();
      const trMatch = transmissieActief === 'automaat'
        ? (tr.includes('automat') || tr === 'automaat')
        : transmissieActief === 'handgeschakeld'
          ? (tr.includes('handm') || tr.includes('manueel') || tr.includes('handgesch'))
          : tr.includes(transmissieActief);
      if (!trMatch) return false;
    }
    return true;
  });

  const n = gefilterd.length;
  const totaal = window._totaalAdvertenties || alleResultaten.length;
  const filtersActief = _filtersActief();
  ((document.getElementById('statusTekst')||{})||{}).textContent =
    !filtersActief ? `${totaal} advertenties` : (n === totaal ? `${totaal} advertenties` : `${n} van ${totaal} advertenties`);

  updateVindenCount(filtersActief ? n : totaal);
  _huidigeLijst = gefilterd;
  _saveFilters();
  toonResultaten(gefilterd);
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetFilters() {
  document.getElementById('zoekInput').value = '';
  document.getElementById('merkFilter').value = '';
  document.getElementById('modelInput').value = '';
  document.getElementById('jaarMin').value = '';
  document.getElementById('jaarMax').value = '';
  document.getElementById('prijsMin').value = '';
  document.getElementById('prijsMax').value = '';
  document.getElementById('kmMin').value = '';
  document.getElementById('kmMax').value = '';
  document.getElementById('brandstofFilter').value = '';
  document.getElementById('carrosserieFilter').value = '';
  var _tf=document.getElementById('transmissieFilter');if(_tf)_tf.value='';
  transmissieActief = '';
  document.querySelectorAll('.toggle-btns button').forEach((b, i) => b.classList.toggle('actief', i === 0));
  localStorage.removeItem('_ck_st'); window.scrollTo({ top: 0, behavior: 'smooth' });
  if (alleResultaten.length > 0) {
    updateVindenCount(window._totaalAdvertenties || alleResultaten.length);
    toonResultaten(alleResultaten);
  }
}

// ── TONEN ─────────────────────────────────────────────────────────────────────
function transLabel(v) {
  if (!v) return '';
  if ((window.lang || 'nl') !== 'nl') {
    var vl = v.toLowerCase();
    if (vl.includes('automat') || vl === 'automaat') return 'Automatic';
    if (vl.includes('handm') || vl.includes('manueel') || vl.includes('handgesch')) return 'Manual';
  }
  return v;
}
// Placeholder voor advertenties zonder (werkende) hoofdafbeelding -- zowel
// gebruikt als er helemaal geen imgSrc is, als als fallback wanneer een
// bestaande imgSrc-url niet laadt (onerror), zodat beide gevallen er
// hetzelfde en verzorgd uitzien i.p.v. een kapot-plaatje-icoon of lege box.
function _fotoLeegHtml(){
  return '<div class="auto-foto-leeg"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13"/><path d="M3 13h18v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V16H6.5v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V13Z"/><circle cx="7" cy="16" r="1.2"/><circle cx="17" cy="16" r="1.2"/></svg><span>Geen foto beschikbaar</span></div>';
}
// Mini-sparkline op de kaart in het overzicht: dezelfde onderliggende data
// (a.prijsHistorie + huidige prijs) als de volle prijsverloop-grafiek in de
// detailweergave (zie het "Waardeontwikkeling"-blok in openDetail()), maar
// hier zonder assen/labels -- gewoon een piepklein lijntje + het
// percentage, zodat een trend al zichtbaar is vóórdat je hoeft te klikken.
// Toont niets als er geen prijshistorie is (nieuwe advertentie of nooit
// gewijzigd), zelfde voorwaarde als de bestaande "was €X"-badge hierboven.
function _sparklineHtml(a){
  if (!a.prijsHistorie || !a.prijsHistorie.length) return '';
  var all = [].concat(a.prijsHistorie).concat([{prijs:a.prijs}]);
  var prices = all.map(function(p){ return +(p.prijs)||0; });
  var minP = Math.min.apply(null, prices), maxP = Math.max.apply(null, prices);
  var range = (maxP - minP) || 1;
  var n = prices.length;
  var pts = prices.map(function(p,i){
    var x = ((i/(n-1))*44+1).toFixed(1);
    var y = (13-((p-minP)/range)*11).toFixed(1);
    return x+','+y;
  }).join(' ');
  var startP = prices[0], curP = +(a.prijs)||0, delta = curP-startP;
  var pct = startP ? Math.round(Math.abs(delta)/startP*100) : 0;
  // Groen/pijl-omlaag = goedkoper geworden (gunstig voor een koper), rood/
  // pijl-omhoog = duurder -- zelfde kleurlogica als het detailweergave-blok.
  var col = delta<0 ? '#16a34a' : delta>0 ? '#dc2626' : '#9ca3af';
  var pijl = delta<0 ? '▼' : delta>0 ? '▲' : '–';
  // Tooltip legt expliciet uit dat dit percentage de eigen prijshistorie van
  // DEZE advertentie is (eerst-geregistreerde prijs t.o.v. nu) -- niet een
  // vergelijking met het marktgemiddelde van vergelijkbare auto's. De
  // generieke "Prijsverloop"-tekst liet dat eerder in het midden.
  var fmtE = function(p){ return '€ ' + Math.round(p).toLocaleString('nl-NL'); };
  var tip = delta === 0
    ? 'Prijs van deze advertentie is niet gewijzigd sinds plaatsing (' + fmtE(curP) + ').'
    : 'Prijs van deze advertentie: van ' + fmtE(startP) + ' naar ' + fmtE(curP) + ' sinds plaatsing (' + (delta<0?'-':'+') + pct + '%).';
  return '<span class="auto-sparkline" title="'+escHtml(tip)+'">'
    + '<svg width="46" height="14" viewBox="0 0 46 14" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '<span style="color:'+col+'">'+pijl+(pct?' '+pct+'%':'')+'</span></span>';
}
function toonResultaten(lijst) {
  const sort = document.getElementById('sortering').value;
  const gesorteerd = sorteer([...lijst], sort);
  const header = document.getElementById('resultatenHeader');

  // renderKaart() werd voorheen alleen aangeroepen bij het wisselen náár de
  // kaartweergave — wijzig je daarna een filter (merk, prijsdaling, etc.)
  // terwijl de kaart al open staat, dan bleven de oude/ongefilterde pins
  // staan. _huidigeLijst hier bijwerken met de definitieve, volledig
  // gefilterde+gesorteerde lijst (na eventuele prijsdaling/top-deals-
  // toggles) en de kaart verversen als die zichtbaar is.
  _huidigeLijst = gesorteerd;
  var _kv = document.getElementById('kaartView');
  if (_kv && getComputedStyle(_kv).display !== 'none' && typeof _laadLeaflet === 'function') {
    _laadLeaflet().then(function(){
      try { renderKaart(); } catch (kaartErr) { console.error('renderKaart mislukt:', kaartErr); }
    }).catch(function(){});
  }

  const _hc=document.getElementById('heroCnt');if(_hc)_hc.textContent=(window._totaalAdvertenties||window._alleAutos?.length||0).toLocaleString('nl-NL')+'+';
  const _pc=document.getElementById('platformCnt');if(_pc&&window._totaalPlatforms)_pc.textContent=window._totaalPlatforms;
  // Bij geen actieve filters toont dit hetzelfde (mogelijk nog niet volledig
  // bijgeladen) aantal als de badge bovenaan — dubbel en soms verwarrend
  // afwijkend. Alleen tonen als er daadwerkelijk gefilterd/gezocht is, waar
  // het aantal wél afwijkt van het totaal en dus relevant is.
  document.getElementById('aantalTekst').textContent =
    _filtersActief() ? TRANS[window.lang||'nl'].result(gesorteerd.length) : '';
  header.style.display = 'flex';

  if (!gesorteerd.length) {
    document.getElementById('autoGrid').innerHTML = `
      <div class="geen-resultaten">
        <span class="icon">🔍</span>
        <h3>${(window.lang||'nl')==='en'?"No results found":"Geen resultaten gevonden"}</h3>
        <p>${(window.lang||'nl')==='en'?"Try adjusting your filters or widening your search.":"Pas je filters aan of verbreed je zoekopdracht."}</p>
        <p style="margin-top:.4rem"><a href="/" onclick="window.location.reload()" style="color:#1a56db;font-size:.875rem">Alle filters wissen &rarr;</a></p>
      </div>`;
    return;
  }

  var _pp=24, _pg=window._pagina||1;
    var _slice=gesorteerd.slice((_pg-1)*_pp, _pg*_pp);
    var _cardsHtml = _slice.map((a, _i) => `
    <div class="auto-card" onclick="openDetail('${a.id}')">
      <div class="auto-foto">
        <button class="fav-btn${_favs.has(a.id)?' fav-actief':''}" data-fav="${a.id}" onclick="toggleFav(event,'${a.id}')" title="Fav">${_favs.has(a.id)?'♥':'♡'}</button>
        <button class="vgl-btn${_vgl.includes(a.id)?' vgl-actief':''}" data-vgl="${a.id}" onclick="toggleVergelijk(event,'${a.id}')" title="Vergelijk">⊕</button>
        ${(()=>{window._vglData[a.id]=a;return '';})()}${(()=>{var _d=isDealer(a);return _d===true?'<span class="dealer-badge">DEALER</span>':_d===false?'<span class="particulier-badge">PRIVÉ</span>':''})()}
        ${(()=>{if(a.prijsHistorie&&a.prijsHistorie.length){
          var oud=a.prijsHistorie[a.prijsHistorie.length-1].prijs;
          return '<span class="prijs-daling">↘ was €'+Number(oud).toLocaleString('nl-NL')+'</span>';
        }return '';})()}
        ${!a.imgSrc ? _fotoLeegHtml() : '<img alt="'+escHtml(a.titel||'')+'" referrerpolicy="no-referrer" loading="'+(_i<6?'eager':'lazy')+'"'+(_i===0?' fetchpriority="high"':'')+' onload="if(!this.naturalWidth){this.closest(\'.auto-foto\').insertAdjacentHTML(\'beforeend\',_fotoLeegHtml());this.remove();}" src="'+((()=>{if(a.imgSrc.startsWith('/data/'))return a.imgSrc;let s=a.imgSrc.startsWith('//')?'https:'+a.imgSrc:a.imgSrc;
                  // Host expliciet parsen i.p.v. een kale substring-check op de hele URL --
                  // een Gaspedaal-URL bevat zelf al een geneste "source="-parameter naar een
                  // ander domein, dus een substring-match op "marktplaats.com" zou daar in
                  // theorie ten onrechte op kunnen matchen. Gaspedaal ook bewust eerst checken.
                  var _host='';try{_host=new URL(s).hostname;}catch(_e){}
                  // Gaspedaal's CDN blokkeert verzoeken zonder de juiste Referer-header (hotlink-
                  // bescherming) -- carkijker-img-proxy (eigen Cloudflare Worker, los project,
                  // geen Git-koppeling) zet die header server-side goed. De Worker zelf geeft de
                  // bron-afbeelding ongewijzigd door (die staat in "/images/large/", vaak >1MB) --
                  // daarom hier ook nog een laag weserv.nl overheen, dezelfde resize-service als
                  // de Admarkt/dealer-fallback hieronder: weserv haalt de foto bij ÓNZE Worker op
                  // (dus mét de juiste Referer al gezet) en comprimeert 'm pas dan. De Worker-URL
                  // (die zelf al een geëncodeerde Gaspedaal-URL als queryparam bevat) moet daarom
                  // NOG EEN KEER encodeURIComponent doorlopen voordat 'ie als weserv's eigen url-
                  // param meegaat -- weserv decodeert zijn url-param maar 1 laag, en zonder deze
                  // dubbele encodering zou een eventuele "&"/"="/"?" in de Gaspedaal-URL zelf
                  // (bv. een eigen querystring) weserv's queryparser in de war sturen en de
                  // Gaspedaal-URL afkappen. Precies het patroon dat weserv.nl's eigen docs
                  // voorschrijven voor "nested"/nested-proxy-URL's -- lokaal getest met url's mét
                  // en zonder eigen querystring, beide keren een exacte round-trip.
                  if(_host.includes('gaspedaal'))return 'https://images.weserv.nl/'+String.fromCharCode(63)+'url='+encodeURIComponent('carkijker-img-proxy.fergusknies.workers.dev/?url='+encodeURIComponent(s))+'&w=800&q=82';
                  // Marktplaats levert zelf al grote varianten via een size-preset-suffix
                  // (bv. "$_82.jpg") -- dezelfde $_86-truc die de detailgalerij al gebruikt,
                  // rechtstreeks van hun eigen CDN, geen externe resize-proxy nodig. Admarkt/
                  // dealer-advertenties gebruiken een ander patroon (geen "$_"-prefix, bv.
                  // "eps_82.JPG") waarvoor geen bevestigde grotere preset bekend is -- die
                  // vallen terug op de bestaande weserv.nl-resize-proxy i.p.v. de ongewijzigde
                  // (mogelijk zeer grote) bron-afbeelding rechtstreeks te laden.
                  if(_host.includes('marktplaats.com')){
                    var _mp=s.replace(/\$_\d+\.jpg/gi,'$_86.jpg');
                    if(_mp!==s)return _mp;
                    return 'https://images.weserv.nl/'+String.fromCharCode(63)+'url='+s.replace(/^https:[/][/]/,'')+'&w=800&q=82';
                  }
                  return s.replace(/\/\d+x\d+\.webp$/,'/800x600.webp');})())+'" alt="'+escHtml(a.titel)+'" onerror="this.onerror=null;this.closest(\'.auto-foto\').insertAdjacentHTML(\'beforeend\',_fotoLeegHtml());this.remove();" />'}
        ${/* NIEUW hoort "vandaag voor het eerst gescraped" te betekenen, niet "vandaag
           nogmaals gezien" -- a.bijgewerkt wordt bij ELKE run voor elke nog actieve
           advertentie op vandaag gezet (ook al stond hij er al weken), dus stond dit
           badge tot nu toe op bijna elke kaart na een scrape-run. a.eersteGezien
           verandert alleen de allereerste keer dat we een advertentie zien.
           Verving ook het aparte "N online"/"2+ weken"-badge hieronder (verwarrend
           in de resultatengrid volgens gebruiker) -- nu simpelweg NIEUW of niets;
           de precieze "X dagen online" blijft wel in de detailweergave staan. */''}
        ${a.eersteGezien === VANDAAG ? '<span class="nieuw-badge">NIEUW</span>' : ''}

      </div>
      <div class="auto-info">
        <h3>${escHtml(a.titel)}</h3>
        <div class="auto-prijs-groot">€ ${typeof a.prijs==='number'?a.prijs.toLocaleString('nl-NL'):a.prijs||'—'}${_sparklineHtml(a)}</div>
        <div class="auto-specs-row">
          ${a.jaar?'<span class="auto-spec-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+a.jaar+'</span>':''}
          ${a.km!=null?'<span class="auto-spec-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+(typeof a.km==='number'?a.km.toLocaleString('nl-NL')+' km':a.km)+'</span>':''}
          ${a.brandstof?'<span class="auto-spec-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V8l9-6 9 6v14"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><rect x="9" y="12" width="6" height="10"/></svg>'+a.brandstof+'</span>':''}
          ${a.transmissie?'<span class="auto-spec-chip">'+transLabel(a.transmissie)+'</span>':''}
        </div>
        <div class="auto-card-footer">
          <span class="auto-bron-tag" style="color:${({'Marktplaats':'#0063D3','Gaspedaal':'#E87722','ViaBovag':'#003082','AutoScout24':'#FF6600','AutoTrack':'#1B5FA8'})[a.bron]||'#9ca3af'}">${a.bron||'—'}</span>
          ${(a.dealScore!=null&&a.dealScore>0)?'<button type="button" class="auto-deal-pill" onclick="_toggleDealTip(event)" data-tip="Dealscore: vergelijkt prijs met soortgelijke occasions'+(a.dealBasis==='regressie'?', gecorrigeerd voor bouwjaar en km-stand':'')+'. Groen (60+) = goede deal, rood (<35) = duur." style="background:'+CarkijkerCore.dealScoreKleur(a.dealScore).bg+';color:'+CarkijkerCore.dealScoreKleur(a.dealScore).fg+'">'+Math.round(a.dealScore)+' score</button>':''}
          ${a.verdachtGoedkoop?'<button type="button" class="auto-deal-pill" onclick="_toggleDealTip(event)" data-tip="Prijs wijkt statistisch sterk af van vergelijkbare auto\'s. Vaak een unieke koopje-vondst, maar wees extra alert: nooit vooruitbetalen, auto altijd fysiek bekijken." style="background:#fef3c7;color:#92400e">⚠ Extra check</button>':''}
        </div></div>
    </div>`);
    // Tier 2: één rustige, gereserveerde advertentieplek na de 8e kaart op
    // pagina 1 -- ADS_ENABLED staat uit tot er genoeg verkeer is, dus dit
    // voegt momenteel niets toe aan de output. De .ad-slot-CSS (vaste
    // min-height) staat al klaar zodat activeren later geen layout shift geeft.
    var _adSlot = (window.ADS_ENABLED && _pg===1 && _cardsHtml.length>8)
      ? '<div class="ad-slot" data-ad-slot="grid-1" aria-hidden="true"></div>' : '';
    document.getElementById('autoGrid').innerHTML =
      (_adSlot ? _cardsHtml.slice(0,8).join('')+_adSlot+_cardsHtml.slice(8).join('') : _cardsHtml.join(''))
      + (_paginaControls ? _paginaControls(gesorteerd.length, _pg, _pp) : '');
}

function extraheerMerk(titel){
  var merken=["Alfa Romeo","Aston Martin","Land Rover","Mercedes-Benz","Rolls-Royce","Lynk & Co","Abarth","Citroën","Polestar","Porsche","Renault","Hyundai","Peugeot","Volkswagen","Mitsubishi","Chevrolet","Chrysler","Genesis","Lamborghini","Maserati","Ferrari","Infiniti","Leapmotor","Subaru","Toyota","Nissan","Jaguar","Lexus","Suzuki","Skoda","Dacia","Cupra","Tesla","Honda","Mazda","Volvo","Dodge","Maxus","Seat","Ford","Opel","Jeep","Fiat","Kia","BMW","Audi","MINI","Smart","Saab","Iveco","Voyah","Daihatsu","BYD","MG","DS","VW","Mercedes","Lynk","Isuzu","Lancia","Bentley","McLaren","Lotus","Lada","Ssangyong","Zeekr","Xpeng","NIO","Leapmotor","Ora","Aiways"];
  var lager=titel.toLowerCase();
  return merken.find(function(m){var ml=m.toLowerCase();return lager===ml||lager.startsWith(ml+' ')||lager.startsWith(ml+'-');})||(function(){var s=lager.replace(/^[^a-zÀ-ɏ]+/i,'').trim();if(!s)return 'overig';return merken.find(function(m){var ml=m.toLowerCase();return s===ml||s.startsWith(ml+' ')||s.startsWith(ml+'-');})||'overig';})();
}
function _vulZoekSuggesties() {
  var dl = document.getElementById('zoekSuggestiesData');
  if (!dl || !alleResultaten.length) return;
  var seen = {}, opts = [];
  alleResultaten.forEach(function(l) {
    var merk = l.merk || '';
    if (merk && !seen[merk]) { seen[merk]=1; opts.push(merk); }
    var words = (l.titel||'').split(' ');
    if (words.length >= 2) {
      var mm = words.slice(0,2).join(' ');
      if (!seen[mm]) { seen[mm]=1; opts.push(mm); }
    }
    if (words.length >= 3) {
      var mmm = words.slice(0,3).join(' ');
      if (!seen[mmm]) { seen[mmm]=1; opts.push(mmm); }
    }
  });
  dl.innerHTML = opts.slice(0,300).map(function(s){return '<option value="'+s.replace(/"/g,'&quot;')+'">';}).join('');
}
function _populeerMerkFilter() {
  var sel = document.getElementById('merkFilter');
  if (!sel || !alleResultaten.length) return;
  var cur = sel.value;
  var counts = {};
  alleResultaten.forEach(function(l) {
    var m = l.merk || extraheerMerk(l.titel || '');
    if (m && m !== 'overig' && /^[a-zA-ZÀ-ɏ]/.test(m)) counts[m] = (counts[m]||0) + 1;
  });
  var MIN_MERK_COUNT = 3;
  var merken = Object.keys(counts).filter(function(m){return counts[m]>=MIN_MERK_COUNT;}).sort(function(a,b){return a.localeCompare(b,'nl');});
  var html = '<option value="">Alle merken</option>';
  merken.forEach(function(m) { html += '<option value="'+m+'">'+m+' ('+counts[m]+')</option>'; });
  sel.innerHTML = html;
  if (cur) sel.value = cur;
}
// isDealer() komt uit CarkijkerCore (lib/carkijker-core.js) -- was hier en
// in generate-occasions.js bewust gedupliceerd, nu één bron van waarheid.
var isDealer = CarkijkerCore.isDealer;
function sorteer(lijst, sort) {
  if (sort === 'prijs-asc')  return lijst.sort((a,b) => a.prijs - b.prijs);
  if (sort === 'prijs-desc') return lijst.sort((a,b) => b.prijs - a.prijs);
  if (sort === 'jaar-desc') {
    // Waarde heet nog 'jaar-desc' (legacy, uit de tijd dat dit echt op
    // bouwjaar sorteerde), maar dit is de "Nieuwste eerst"-optie in de UI --
    // dat hoort te betekenen "recentst aan Carkijker toegevoegd", niet
    // "hoogste bouwjaar". Een gebruiker meldde een BYD Atto 3 met bouwjaar
    // 2027 die al 12 dagen online stond bovenaan "Nieuwste eerst": precies
    // dit verschil. Sorteert nu op eersteGezien (ISO-datum YYYY-MM-DD, dus
    // gewone stringvergelijking sorteert al correct); advertenties zonder
    // dat veld vallen achteraan.
    return lijst.sort((a,b) => (b.eersteGezien||'').localeCompare(a.eersteGezien||''));
  }
  if (sort === 'km-asc')     return lijst.sort((a,b) => (a.km||999999) - (b.km||999999));
  if (sort === 'deal-score') {
    lijst = lijst.sort(function(a,b){ return (b.dealScore||0)-(a.dealScore||0); });
  }
  if (sort === 'pkm-asc') {
    var _withKm = lijst.filter(function(a){return a.km > 0 && a.prijs > 0;});
    var _noKm = lijst.filter(function(a){return !a.km || !a.prijs;});
    _withKm.sort(function(a,b){return (a.prijs/a.km)-(b.prijs/b.km);});
    return _withKm.concat(_noKm);
  }
  return lijst;
}

function herSorteer() { zoekNu(); }

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
// Geeft alleen nog een inhoudelijk oordeel terug -- prijs t.o.v. vergelijkbare
// occasions (dealScore) én leeftijd/km-verhouding -- niet langer de losse specs
// (jaar/km/brandstof/carrosserie/locatie), die staan al als chips in de
// specs-grid erboven en dat was een letterlijke herhaling. dealScore is de enige
// van de twee die vrijwel altijd een uitspraak oplevert (35-60 = "gemiddeld"
// blijft bewust stil, dat is niet iets wat "opvalt"); de km-verhouding vult dat
// aan zodra dié wél opvallend is.
function genereerSamenvatting(a) {
  const delen = [];
  if (a.dealScore != null && a.dealScore > 0) {
    if (a.dealScore > 60) delen.push('Met een dealscore van ' + Math.round(a.dealScore) + ' staat deze auto gunstig geprijsd ten opzichte van vergelijkbare occasions.');
    else if (a.dealScore < 35) delen.push('Met een dealscore van ' + Math.round(a.dealScore) + ' is deze auto relatief duur vergeleken met soortgelijke advertenties.');
  }
  const nu = 2026;
  const leeftijd = a.jaar ? (nu - a.jaar) : null;
  if (a.km != null && leeftijd && leeftijd > 0) {
    const kmPJ = Math.round(a.km / leeftijd);
    if (leeftijd <= 3 && a.km < 30000) delen.push('Gezien het lage aantal kilometers en de jonge leeftijd betreft dit een uitstekend onderhouden occasion.');
    else if (kmPJ < 10000 && leeftijd > 5) delen.push('Het lage jaarkilometrage wijst op een spaarzaam gebruik — een pluspunt voor de staat van het voertuig.');
    else if (a.km > 200000) delen.push('Let op de hoge kilometerstand; een goede APK en onderhoudshistorie zijn aan te raden.');
    else if (kmPJ >= 25000) delen.push('Het jaarkilometrage ligt met ' + kmPJ.toLocaleString('nl-NL') + ' km/jaar boven gemiddeld voor deze leeftijd — vraag naar onderhoudshistorie en bandenslijtage.');
  }
  return delen.join(' ');
}

function openDetail(id) {
  const a = alleResultaten.find(x => x.id === id);
  if (!a) return;
  huidigDetailId = id;

  document.getElementById('detailTitel').textContent = a.titel;
  window._galImgs = (a.imgs && a.imgs.length) ? a.imgs.slice(0,10).map(u=>u.replace('/250x188.webp','/800x600.webp').replace('/250x188.jpg','/800x600.jpg')) : (a.imgSrc ? [a.imgSrc.replace('/250x188.webp','/800x600.webp')] : []);
  window._galIdx = 0;
  // Vangnet voor advertenties uit listings-lean.json (achtergrond-load zonder
  // imgs, zie window._laadVolledig): a.imgs ontbreekt dan, dus hierboven
  // staat alleen de ene imgSrc-thumbnail in de galerij. Haal in dat geval
  // alsnog het bijbehorende merken/<merk>.json op -- dat bestand bevat de
  // volledige imgs-array altijd -- en vul de galerij met terugwerkende
  // kracht aan zodra dat binnen is. huidigDetailId===id voorkomt dat een
  // late respons de galerij van een inmiddels geopende, andere advertentie
  // overschrijft.
  if ((!a.imgs || !a.imgs.length) && a.merk) {
    var _slug = a.merk.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    fetch('/data/merken/' + _slug + '.json').then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (!d || huidigDetailId !== id) return;
      var voll = (d.listings || []).find(function(x){ return x.id === id; });
      if (voll && voll.imgs && voll.imgs.length) {
        window._galImgs = voll.imgs.slice(0,10).map(function(u){ return u.replace('/250x188.webp','/800x600.webp').replace('/250x188.jpg','/800x600.jpg'); });
        galRender();
      }
    }).catch(function(){});
  }
  document.getElementById('detailInhoud').innerHTML = `
    <div class="gallery-main" style="position:relative">
      <button class="gal-prev gal-nav" onclick="galNav(-1)" aria-label="Vorige foto">&#8249;</button>
      <img id="galFoto" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'" src="${a.imgSrc?'https://wsrv.nl/?url='+(a.imgSrc.replace(/^https?:/,'').replace(/^\/\//,'').replace(/\$_\d+\.jpg/gi,'$_86.jpg')):'data:,'}" alt="${escHtml(a.titel)}"
        onerror="this.src='https://placehold.co/720x320/e8e8e3/999?text=${encodeURIComponent((a.titel||'').split(' ').slice(0,2).join(' '))}'" />
      <button class="gal-next gal-nav" onclick="galNav(1)" aria-label="Volgende foto">&#8250;</button>
      <div id="galTeller" class="gal-teller"></div>
    </div>
    <div id="galThumbs" class="gal-thumbs"></div>
    <div id="galMeerFotos" style="display:none;text-align:center;padding:6px 12px 2px;font-size:13px;color:#888"></div>
    <div class="detail-content">
      <div class="detail-title-row">
        <h2>${escHtml(a.titel)}</h2>
        <div>
          <div class="detail-prijs">€ ${a.prijs != null ? a.prijs.toLocaleString('nl-NL') : '–'}</div>
          <div class="detail-prijs-sub">${a.bron || 'Gaspedaal'}</div>
        </div>
      </div>
      ${(()=>{
        // Dealscore/dagen-online/dealer staan al op de grid-kaart, maar
        // verdwenen tot nu toe zodra je een advertentie opende -- juist hier,
        // vlak voor de klik naar de bron, wil je die signalen kunnen zien.
        var chips = '';
        if (a.dealScore != null && a.dealScore > 0) {
          var dsKleur = CarkijkerCore.dealScoreKleur(a.dealScore);
          var dsBg = dsKleur.bg;
          var dsCol = dsKleur.fg;
          chips += '<button type="button" class="auto-deal-pill" onclick="_toggleDealTip(event)" data-tip="Dealscore: vergelijkt prijs met soortgelijke occasions'+(a.dealBasis==='regressie'?', gecorrigeerd voor bouwjaar en km-stand':'')+'. Groen (60+) = goede deal, rood (<35) = duur." style="background:'+dsBg+';color:'+dsCol+'">'+Math.round(a.dealScore)+' score</button>';
        }
        if (a.verdachtGoedkoop) {
          chips += '<button type="button" class="auto-deal-pill" onclick="_toggleDealTip(event)" data-tip="Prijs wijkt statistisch sterk af van vergelijkbare auto\'s. Vaak een unieke koopje-vondst, maar wees extra alert: nooit vooruitbetalen, auto altijd fysiek bekijken." style="background:#fef3c7;color:#92400e">⚠ Extra check</button>';
        }
        if (a.eersteGezien) {
          var _d = Math.round((Date.now()-new Date(a.eersteGezien+'T12:00:00').getTime())/86400000);
          if (_d >= 1 && _d < 14) chips += '<span class="detail-chip tijd recent">🕒 '+_d+' dagen online</span>';
          else if (_d >= 14) chips += '<span class="detail-chip tijd lang">🕒 2+ weken online</span>';
        }
        var dl = isDealer(a);
        if (dl === true) chips += '<span class="detail-chip eigenaar dealer">🏢 Dealer</span>';
        else if (dl === false) chips += '<span class="detail-chip eigenaar particulier">🙋 Particulier</span>';
        return chips ? '<div class="detail-badges-row">'+chips+'</div>' : '';
      })()}
      <div class="detail-versie">${[a.brandstof, transLabel(a.transmissie), a.carrosserie].filter(Boolean).join(' · ')}</div>
      <div class="specs-grid">
        ${a.jaar ? `<div class="spec-item"><div class="spec-icon">📅</div><div class="spec-val">${a.jaar}</div><div class="spec-lbl">Bouwjaar</div></div>` : ''}
        ${a.km != null ? `<div class="spec-item"><div class="spec-icon">🛣️</div><div class="spec-val">${typeof a.km==='number'?a.km.toLocaleString('nl-NL'):a.km}</div><div class="spec-lbl">Kilometer</div></div>` : ''}
        ${a.brandstof ? `<div class="spec-item"><div class="spec-icon">⛽</div><div class="spec-val">${a.brandstof}</div><div class="spec-lbl">${(window.lang||'nl')==='en'?"Fuel type":"Brandstof"}</div></div>` : ''}
        ${a.transmissie ? `<div class="spec-item"><div class="spec-icon">⚙️</div><div class="spec-val">${transLabel(a.transmissie)}</div><div class="spec-lbl">${(window.lang||'nl')==='en'?"Transmission":"Transmissie"}</div></div>` : ''}
        <div class="spec-item"><div class="spec-icon">📍</div><div class="spec-val" style="font-size:12px">${escHtml(a.locatie || 'Nederland')}</div><div class="spec-lbl">${(window.lang||'nl')==='en'?"Location":"Locatie"}</div></div>
        ${a.carrosserie ? `<div class="spec-item"><div class="spec-icon">🚗</div><div class="spec-val">${a.carrosserie}</div><div class="spec-lbl">${(window.lang||'nl')==='en'?"Body type":"Carrosserie"}</div></div>` : ''}
        ${(()=>{ var soh=/elektr|hybr/i.test(a.brandstof||'')?_parseSoh(a):null; return soh ? `<div class="spec-item"><div class="spec-icon">🔋</div><div class="spec-val">${soh.toLocaleString('nl-NL')}%</div><div class="spec-lbl">Accuconditie</div></div>` : ''; })()}
      </div>
      <div class="detail-tools-links">
        <a href="/tco/${a.brandstof?'?brandstof='+encodeURIComponent(a.brandstof):''}" target="_blank" rel="noopener">⛽ Bereken de maandlasten van deze auto &rarr;</a>
        <a href="/inruilwaarde/" target="_blank" rel="noopener">💰 Wat is mijn huidige auto waard? &rarr;</a>
      </div>
      ${genereerSamenvatting(a) ? `<div class="ai-samenvatting"><div class="ai-label">✦ Wat opvalt</div><p>${escHtml(genereerSamenvatting(a))}</p></div>` : ''}
      ${(()=>{
        // Prijsontwikkeling en afschrijving gaan allebei over waardeontwikkeling
        // -- voorheen twee losse blokken met dezelfde (niet-bestaande)
        // var(--achtergrond), waardoor ze in elkaar overliepen. Nu één kaart
        // met een eigen accentkleur, en alleen wat er daadwerkelijk is.
        var chartHtml = '';
        if (a.prijsHistorie && a.prijsHistorie.length >= 1) {
          var all=[].concat(a.prijsHistorie).concat([{datum:"Nu",prijs:a.prijs}]);
          var prices=all.map(function(p){return+(p.prijs)||0;});
          var minP=Math.min.apply(null,prices);
          var maxP=Math.max.apply(null,prices);
          var range=maxP-minP||1;
          var n=prices.length;
          var pts=prices.map(function(p,i){return((i/(n-1))*198+1).toFixed(1)+","+(47-((p-minP)/range)*44).toFixed(1);}).join(" ");
          var startP=prices[0];var curP=+(a.prijs)||0;var delta=curP-startP;var deltaPct=(startP?(delta/startP*100):0).toFixed(1);var dCol=delta<0?'#16a34a':delta>0?'#dc2626':'var(--subtekst)';var dSym=delta<0?'▼':delta>0?'▲':'—';var dStr=delta!==0?dSym+' €'+Math.abs(delta).toLocaleString('nl-NL')+' ('+deltaPct+'%)':'Stabiel';
          var dots=prices.map(function(p,i){var x=((i/(n-1))*198+1).toFixed(1);var y=(47-((p-minP)/range)*44).toFixed(1);return'<circle cx="'+x+'" cy="'+y+'" r="2.5" fill="var(--oranje)"/>';}).join('');
          chartHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:12px;color:var(--subtekst)">Prijsverloop</div><div style="font-size:12px;font-weight:700;color:'+dCol+'">'+dStr+'</div></div>'
            + '<svg width="100%" height="44" viewBox="0 0 200 50" preserveAspectRatio="none" style="display:block"><polyline points="'+pts+'" fill="none" stroke="var(--oranje)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>'
            + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--subtekst);margin-top:4px"><span>'+all[0].datum+': €'+Number(startP).toLocaleString("nl-NL")+'</span><span>Nu: €'+Number(curP).toLocaleString("nl-NL")+'</span></div>';
        }
        var afschrHtml = (a.afschrijvingJaar?'<div>Circa <b>€'+a.afschrijvingJaar.toLocaleString('nl-NL')+'</b> per jaar</div>':'')
          + (a.afschrijvingKm?'<div>Circa <b>€'+a.afschrijvingKm.toLocaleString('nl-NL')+'</b> bij een verdubbeling van de km-stand</div>':'');
        if (!chartHtml && !afschrHtml) return '';
        return '<div style="margin:12px 0;padding:12px 14px;background:var(--grijs);border-left:3px solid #2563eb;border-radius:10px;font-size:13px;color:var(--tekst);line-height:1.6">'
          + '<div style="font-size:11px;font-weight:700;color:#2563eb;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px">📉 Waardeontwikkeling</div>'
          + chartHtml
          + (chartHtml && afschrHtml ? '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--grijs2)">'+afschrHtml+'</div>' : afschrHtml)
          + '</div>';
      })()}
      <div class="markt-inruil detail-inruil">
        <div class="markt-inruil-title">&#128176; Wat kost deze auto jou na inruil?</div>
        <div class="markt-inruil-row-input">
          <select id="dInruilMerk" onchange="updateDetailModellen(this.value)" aria-label="Merk van jouw huidige auto"><option value="">Merk van jouw auto</option></select>
          <select id="dInruilModel" onchange="berekenDetailInruil()" aria-label="Model van jouw huidige auto"><option value="">Model</option></select>
        </div>
        <div class="markt-inruil-row-input" style="margin-top:8px">
          <label for="dInruilKm">Jouw km-stand</label>
          <input type="number" id="dInruilKm" placeholder="bv. 85000" min="0" step="1000" oninput="berekenDetailInruil()" disabled>
          <label for="dInruilJaar">Bouwjaar</label>
          <input type="number" id="dInruilJaar" placeholder="bv. 2019" min="1980" step="1" oninput="berekenDetailInruil()" disabled>
        </div>
        <div id="dInruilLeeg" class="markt-leeg" style="display:none;padding:10px 0 0;font-size:13px">Vul hierboven merk en model van jouw huidige auto in.</div>
        <div id="dInruilUitkomst" style="display:none;font-size:13px;line-height:1.55;margin-top:10px"></div>
      </div>
      <a href="${escHtml(outUrl(a.url,a.bron))}" target="_blank" rel="noopener noreferrer" data-out data-bron="${escHtml(a.bron||'')}" data-merk="${escHtml(a.merk||'')}" data-prijs="${a.prijs||''}" style="display:block;background:#e84c15;color:white;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;margin:16px 0">${(window.lang||'nl')==='en'?"View listing on":"Bekijk advertentie op"} ${a.bron||'bron'} &rarr;</a>
      <p style="font-size:12px;color:var(--subtekst);margin-top:8px;text-align:center">
        Foto's en volledige omschrijving staan op de originele advertentie.
      </p>
    </div>`;

  _populeerMerkSelect(document.getElementById('dInruilMerk'), false);
  berekenDetailInruil();
  galRender();
  galRender();
  document.getElementById('overlay').classList.add('open');
  document.getElementById('detailPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function galNav(dir) {
  const imgs = window._galImgs || [];
  if (imgs.length <= 1) return;
  window._galIdx = (window._galIdx + dir + imgs.length) % imgs.length;
  galRender();
}
function galGoTo(i) {
  window._galIdx = i;
  galRender();
}
function galRender() {
  var imgs = window._galImgs || [];
  var n    = imgs.length;
  var raw  = window._galIdx || 0;
  var idx  = n ? ((raw % n) + n) % n : 0;
  if (n) window._galIdx = idx;
  var mainImg = document.getElementById('galFoto');
  var teller  = document.getElementById('galTeller');
  var thumbs  = document.getElementById('galThumbs');
  if (!mainImg) return;
  if (!n) { mainImg.style.opacity = '0'; return; }
  mainImg.style.opacity = '';
  mainImg.src = 'https://wsrv.nl/?url='+(imgs[idx].replace(/\$_\d+\.jpg/gi,'\$_86.jpg')).replace(/^https?:/,'').replace(/^\/\//,'');
  document.querySelectorAll('.gal-nav').forEach(function(b) {
    b.style.display = n > 1 ? '' : 'none';
  });
  if (teller) teller.textContent = n > 1 ? (idx+1)+' / '+n : '';
  if (thumbs) {
    thumbs.style.display = n > 0 ? 'flex' : 'none';
    thumbs.innerHTML = imgs.map(function(url, i) {
      var bdr = i === idx ? '#e84c15' : 'transparent';
      var opc = i === idx ? '1' : '.65';
      var ts = 'https://wsrv.nl/?url='+(url.replace(/\$_\d+\.jpg/gi,'\$_82.jpg')).replace(/^https?:/,'').replace(/^\/\//,'');
      return '<img alt="Foto '+(i+1)+'" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'" onclick="galGoTo('+i+')" src="'+ts+'" style="width:72px;height:54px;object-fit:cover;border-radius:6px;cursor:pointer;flex-shrink:0;border:2px solid '+bdr+';opacity:'+opc+';transition:.15s">';
    }).join('');
    var at = thumbs.children[idx];
    if (at) at.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
  }
  // "Meer fotos" link
  var mf = document.getElementById('galMeerFotos');
  if (mf) {
    var auto = (window._alleAutos || []).find(function(a) { return a.id === window.huidigDetailId; });
    if (auto && auto.url) {
      mf.style.display = '';
      mf.innerHTML = '📷 Meer foto’s zien? <a href="'+escHtml(outUrl(auto.url,auto.bron))+'" target="_blank" rel="noopener" data-out data-bron="'+escHtml(auto.bron||'')+'" data-merk="'+escHtml(auto.merk||'')+'" data-prijs="'+(auto.prijs||'')+'" style="color:#e84c15;font-weight:600;text-decoration:none">Bekijk de advertentie →</a>';
    } else {
      mf.style.display = 'none';
    }
  }
}
function sluitDetail() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('detailPanel').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('zoekInput').addEventListener('keydown', e => { if (e.key === 'Enter') zoekNu(); });
document.getElementById('modelInput').addEventListener('keydown', e => { if (e.key === 'Enter') zoekNu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') sluitDetail(); });

document.addEventListener('DOMContentLoaded', laadListings);

    function setPrijsInterval(btn) {
      document.querySelectorAll('#prijsIntervals button').forEach(b => b.classList.remove('actief'));
      btn.classList.add('actief');
      document.getElementById('prijsMin').value = btn.dataset.min;
      document.getElementById('prijsMax').value = btn.dataset.max;
      zoekNu();
    }
    function setKmInterval(btn) {
      document.querySelectorAll('#kmIntervals button').forEach(b => b.classList.remove('actief'));
      btn.classList.add('actief');
      document.getElementById('kmMin').value = btn.dataset.min;
      document.getElementById('kmMax').value = btn.dataset.max;
      zoekNu();
    }
  