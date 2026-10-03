
// ── Nederlandse steden coördinaten ──
var NL_CITIES = {
  'amsterdam':[52.3676,4.9041],'rotterdam':[51.9225,4.4792],'den haag':[52.0705,4.3007],
  "'s-gravenhage":[52.0705,4.3007],'utrecht':[52.0908,5.1222],'eindhoven':[51.4416,5.4697],
  'tilburg':[51.5555,5.0913],'groningen':[53.2194,6.5665],'almere':[52.3508,5.2647],
  'breda':[51.5719,4.7683],'nijmegen':[51.8426,5.8546],'enschede':[52.2215,6.8937],
  'apeldoorn':[52.2112,5.9699],'haarlem':[52.3874,4.6462],'arnhem':[51.9851,5.8987],
  'amersfoort':[52.1561,5.3878],'zaanstad':[52.4560,4.8150],'zoetermeer':[52.0574,4.4940],
  'zwolle':[52.5168,6.0830],'leiden':[52.1601,4.4970],'maastricht':[50.8514,5.6910],
  'dordrecht':[51.8133,4.6901],'ede':[52.0439,5.6641],'delft':[52.0116,4.3571],
  'deventer':[52.2550,6.1542],'helmond':[51.4823,5.6635],'alkmaar':[52.6324,4.7534],
  'venlo':[51.3704,6.1724],'leeuwarden':[53.2012,5.7999],'hilversum':[52.2292,5.1683],
  'heerlen':[50.8881,5.9797],'roosendaal':[51.5280,4.4641],'purmerend':[52.5053,4.9580],
  'schiedam':[51.9202,4.3880],'lelystad':[52.5185,5.4714],'oss':[51.7638,5.5191],
  'gouda':[52.0116,4.7100],'hoorn':[52.6427,5.0590],'zeist':[52.0906,5.2336],
  'nieuwegein':[52.0285,5.0907],'vlaardingen':[51.9122,4.3419],'spijkenisse':[51.8459,4.3267],
  'alphen aan den rijn':[52.1286,4.6619],"'s-hertogenbosch":[51.6978,5.3037],
  'den bosch':[51.6978,5.3037],'sittard':[50.9988,5.8720],'geleen':[50.9680,5.8350],
  'emmen':[52.7791,6.9009],'westland':[52.0001,4.2200],'bergen op zoom':[51.4942,4.2883],
  'venray':[51.5260,5.9739],'roermond':[51.1934,5.9879],'hardenberg':[52.5741,6.6153],
  'assen':[52.9926,6.5642],'veenendaal':[52.0259,5.5568],'doetinchem':[51.9659,6.2957],
  'ridderkerk':[51.8680,4.5959],'capelle aan den ijssel':[51.9280,4.5622],
  'katwijk':[52.2024,4.4054],'soest':[52.1773,5.3038],'weert':[51.2518,5.7079],
  'terneuzen':[51.3353,3.8302],'middelburg':[51.4987,3.6136],'vlissingen':[51.4419,3.5706],
  'goes':[51.5026,3.8905],'zutphen':[52.1383,6.2000],'harderwijk':[52.3444,5.6219],
  'almelo':[52.3564,6.6631],'hengelo':[52.2659,6.7926],'oldenzaal':[52.3117,6.9278],
  'hoogeveen':[52.7272,6.4771],'meppel':[52.6960,6.1975],'coevorden':[52.6607,6.7419],
  'sneek':[53.0327,5.6591],'drachten':[53.1097,6.0967],'heerenveen':[52.9601,5.9205],
  'smallingerland':[53.1097,6.0967],'beverwijk':[52.4889,4.6611],'heemskerk':[52.5127,4.6766],
  'velsen':[52.4560,4.6350],'ijmuiden':[52.4607,4.6185],'amstelveen':[52.3084,4.8610],
  'diemen':[52.3390,4.9422],'barendrecht':[51.8560,4.5340],'zwijndrecht':[51.8180,4.6362],
  'hendrik-ido-ambacht':[51.8468,4.6266],'papendrecht':[51.8302,4.6898],
  'sliedrecht':[51.8255,4.7737],'gorinchem':[51.8305,4.9747],'tiel':[51.8875,5.4326],
  'culemborg':[51.9442,5.2303],'waalwijk':[51.6843,5.0699],'dongen':[51.6245,4.9338],
  'leidschendam':[52.0869,4.3952],'voorburg':[52.0701,4.3591],'rijswijk':[52.0425,4.3206],
  'pijnacker':[52.0168,4.4379],'nootdorp':[52.0329,4.3864],'wassenaar':[52.1454,4.3980],
  'naaldwijk':[51.9980,4.2123],'monster':[52.0252,4.1729],'midden-delfland':[51.9900,4.3000]
};

var _kaartMap = null;
var _kaartLaag = null;
var _kaartCircle = null;
var _huidigeLijst = [];

var _leafletPromise = null;
function _laadLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletPromise) return _leafletPromise;
  _leafletPromise = new Promise(function(resolve, reject) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = resolve;
    js.onerror = reject;
    document.head.appendChild(js);
  });
  return _leafletPromise;
}

function setView(v) {
  var isKaart = v === 'kaart';
  document.getElementById('autoGrid').style.display = isKaart ? 'none' : '';
  document.getElementById('kaartView').style.display = isKaart ? 'block' : 'none';
  document.getElementById('btnLijst').classList.toggle('actief', !isKaart);
  document.getElementById('btnKaart').classList.toggle('actief', isKaart);
  if (isKaart) {
    window.scrollTo(0,0);
    // Leaflet (kaartweergave) laadt pas nu, i.p.v. onvoorwaardelijk op elke pageload —
    // de meeste bezoekers openen de kaart nooit (~97 KiB ongebruikte JS bespaard).
    _laadLeaflet().then(function(){
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ renderKaart(); }); });
    }).catch(function(err){ console.error('Kaart laden mislukt:', err); });
  }
}

function renderKaart() {
  if (_kaartMap) { try{_kaartMap.remove();}catch(e){} _kaartMap=null; }
  document.getElementById('kaartCanvas').innerHTML='';
  _kaartMap = L.map('kaartCanvas', {fadeAnimation: false});
  _kaartMap.invalidateSize({animate: false});
  _kaartMap.setView([52.15, 5.28], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(_kaartMap);
  if (_kaartLaag) { _kaartLaag.remove(); _kaartLaag = null; }
  if (_kaartCircle) { _kaartCircle.remove(); _kaartCircle = null; }
  var markers = [];
  var bounds = [];
  var _lijstVoorKaart = (_huidigeLijst && _huidigeLijst.length > 0) ? _huidigeLijst : (window._alleAutos || []).slice(0, 800);
  var _cityMap={};
  _lijstVoorKaart.forEach(function(auto){
    if(!auto.locatie)return;
    var k=auto.locatie.toLowerCase().trim();
    var c=NL_CITIES[k];
    if(!c){for(var ct in NL_CITIES){if(k.indexOf(ct)>=0||ct.indexOf(k)>=0){c=NL_CITIES[ct];break;}}}
    if(!c)return;
    var ck=c[0]+':'+c[1];
    if(!_cityMap[ck])_cityMap[ck]={c:c,list:[],min:Infinity,loc:auto.locatie};
    _cityMap[ck].list.push(auto);
    if(auto.prijs&&auto.prijs<_cityMap[ck].min)_cityMap[ck].min=auto.prijs;
  });
  Object.keys(_cityMap).forEach(function(ck){
    var g=_cityMap[ck];
    var n=g.list.length;
    var p=g.min<Infinity?g.min:0;
    var kleur=p>0&&p<5000?'#c0392b':p<15000?'#d35400':'#27ae60';
    var pt=p>=1000?'\u20ac'+Math.round(p/1000)+'K':p>0?'\u20ac'+p:'?';
    var badge=n>1?' ('+n+')':'';
    var jCoord=[g.c[0],g.c[1]];
    var icon=L.divIcon({className:'',html:'<div class'+String.fromCharCode(61)+'"kaart-pin" style'+String.fromCharCode(61)+'"background:'+kleur+'">'+pt+badge+'</div>',iconSize:[70,26],iconAnchor:[35,32]});
    var topAuto=g.list.sort(function(a,b){return(a.prijs||999999)-(b.prijs||999999);})[0];
    var autoId=topAuto.id;
    var apos=String.fromCharCode(39);
    var popup='<div class'+String.fromCharCode(61)+'"kaart-popup"><b>'+escHtml(g.loc)+'</b> ('+n+')<br>';
    // Elke voorbeeldadvertentie is nu zelf klikbaar (id als string-literal met aanhalingstekens
    // \u2014 zonder aanhalingstekens werd bv. "gp-138322166" gelezen als "gp min 138322166", een
    // JS-fout die de klik altijd liet mislukken).
    g.list.slice(0,3).forEach(function(a){popup+='<hr style'+String.fromCharCode(61)+'"margin:3px 0"><small onclick'+String.fromCharCode(61)+'"setTimeout(function(){openDetail('+apos+a.id+apos+')},120)" style'+String.fromCharCode(61)+'"cursor:pointer;display:block">'+escHtml((a.titel||'').substring(0,35))+'<br>\u20ac'+(a.prijs?a.prijs.toLocaleString('nl-NL'):'?')+'</small>';});
    if(n>3)popup+='<br><small>+'+(n-3)+' meer</small>';
    popup+='<br><button onclick'+String.fromCharCode(61)+'"setTimeout(function(){openDetail('+apos+autoId+apos+')},120)" style'+String.fromCharCode(61)+'"margin-top:8px;width:100%;padding:6px;background:#1a56db;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">Bekijk goedkoopste \u2192</button></div>';
    var marker=L.marker(jCoord,{icon:icon});
    marker.bindPopup(popup,{maxWidth:220});
    markers.push(marker);
    bounds.push(jCoord);
  });
  _kaartLaag = L.layerGroup(markers).addTo(_kaartMap);
  var locCoord = window._locCoord;
  var radiusSel = document.getElementById('radiusSelect');
  var km = (locCoord && radiusSel && radiusSel.value) ? parseFloat(radiusSel.value) : 0;
  if (locCoord && km > 0) {
    _kaartCircle = L.circle(locCoord, {
      radius: km * 1000,
      color: '#1a56db',
      fillColor: '#1a56db',
      fillOpacity: 0.06,
      weight: 2,
      dashArray: '6 4'
    }).addTo(_kaartMap);
    var zl = km <= 5 ? 12 : km <= 15 ? 11 : km <= 30 ? 10 : km <= 50 ? 9 : 8;
    _kaartMap.setView(locCoord, zl);
  } else if (bounds.length > 1) {
    _kaartMap.fitBounds(bounds, {padding: [30, 30], maxZoom: 11});
  } else if (bounds.length === 1) {
    _kaartMap.setView(bounds[0], 10);
  }
}
// Bijvangst tijdens het uitzoeken van de RDW-lookup-bug hieronder: dit was
// hier een TWEEDE, volledig dode openVergelijk()-definitie -- een latere
// function openVergelijk(){...} verderop in dit bestand overschrijft 'm door
// JS-hoisting al vóór er ook maar iets uitvoert, dus deze body draaide nooit.
// Verwijderd i.p.v. laten staan, om toekomstige verwarring (welke van de
// twee is "de echte"?) te voorkomen. De RDW-wrapper hieronder verwees naar
// elementen (#vergelijkOverlay, .vgl-car-col) die alleen in DEZE dode versie
// bestonden -- vandaar dat de RDW-kentekenlookup het nooit deed, ook al werkt
// fetchRDW()/_updateRDWRows() zelf prima. Fix: de wrapper wijst nu naar de
// daadwerkelijk gerenderde elementen (#vglModal, .vgl-car-th, .vgl-tbl --
// zie de actieve openVergelijk() verderop).
var _rdwData={};
async function fetchRDW(kt,idx){
  var n=kt.replace(/-/g,'').toUpperCase().slice(0,8);
  var inp=document.querySelector('.vgl-kt-input[data-idx="'+idx+'"]');
  if(inp){inp.disabled=true;inp.classList.add('vgl-kt-load');inp.value=n;}
  try{
    var res=await Promise.all([
      fetch('https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken='+n+'&$limit=1').then(function(r){return r.json();}),
      fetch('https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken='+n+'&$limit=1').then(function(r){return r.json();})
    ]);
    _rdwData[idx]={v:res[0][0]||null,b:res[1][0]||null};
    if(inp){inp.classList.remove('vgl-kt-load');inp.classList.add('vgl-kt-ok');}
  }catch(e){
    _rdwData[idx]={err:true};
    if(inp){inp.classList.remove('vgl-kt-load');inp.classList.add('vgl-kt-err');}
  }
  _updateRDWRows();
}
function _driveLabel(c){var m={'1':'Voorwiel','2':'Achterwiel','4':'4WD','A':'Alle wielen'};return m[String(c)]||c;}
function _rdwDate(s){if(!s)return null;s=String(s);return s.slice(6,8)+'-'+s.slice(4,6)+'-'+s.slice(0,4);}
function _updateRDWRows(){
  var cars=_vgl.slice(0,3);var n=cars.length;
  var specs=[
    ['Aandrijving',function(d){return d&&d.v&&d.v.aandrijving?_driveLabel(d.v.aandrijving):null;}],
    ['Vermogen',function(d){if(!d||!d.b)return null;var kw=parseFloat(d.b.nettomaximumvermogen||d.b.netto_max_vermogen_elektrisch||0);return kw>0?Math.round(kw)+' kW ('+Math.round(kw*1.36)+' pk)':null;}],
    ['Actieradius',function(d){return d&&d.b&&d.b.actieradius_gecombineerd?d.b.actieradius_gecombineerd+' km':null;}],
    ['CO2 (g/km)',function(d){return d&&d.b&&d.b.co2_uitstoot_gecombineerd?d.b.co2_uitstoot_gecombineerd+' g/km':null;}],
    ['Verbruik',function(d){return d&&d.b&&d.b.brandstofverbruik_gecombineerd?d.b.brandstofverbruik_gecombineerd+' l/100km':null;}],
    ['Massa rijklaar',function(d){return d&&d.v&&d.v.massa_rijklaar?parseInt(d.v.massa_rijklaar).toLocaleString('nl-NL')+' kg':null;}],
    ['Wielbasis',function(d){return d&&d.v&&d.v.wielbasis?parseInt(d.v.wielbasis)+' mm':null;}],
    ['Zitplaatsen',function(d){return d&&d.v&&d.v.aantal_zitplaatsen?String(d.v.aantal_zitplaatsen):null;}],
    ['APK vervalt',function(d){return _rdwDate(d&&d.v&&d.v.vervaldatum_apk);}],
    ['1e tenaamstelling NL',function(d){return _rdwDate(d&&d.v&&d.v.datum_eerste_tenaamstelling_in_nederland);}]
  ];
  var body=document.getElementById('vgl-rdw-body');
  if(!body)return;
  if(!Object.keys(_rdwData).length){body.innerHTML='';return;}
  var nc=n+1;
  var divider='<tr class="vgl-rdw-divider"><td colspan="'+nc+'"><span>RDW-gegevens</span></td></tr>';
  var rows=specs.map(function(sp){
    var anyReal=false;
    var tds=cars.map(function(a,i){
      var d=_rdwData[i];
      if(!d)return '<td class="vgl-spec-val vgl-rdw-pending">...</td>';
      if(d.err)return '<td class="vgl-spec-val vgl-rdw-err">?</td>';
      var v=sp[1](d);anyReal=anyReal||(v!=null);
      return '<td class="vgl-spec-val">'+(v||'-')+'</td>';
    });
    if(!anyReal)return '';
    var tvs=cars.map(function(a,i){var d=_rdwData[i];if(!d||d.err)return null;return sp[1](d);}).filter(Boolean);
    var same=tvs.length>1&&tvs.every(function(v,ii,arr){return v===arr[0];});
    return '<tr class="vgl-spec-row'+(same?'':tvs.length>1?' vgl-diff':'')+'">'
      +'<td class="vgl-spec-label">'+sp[0]+'</td>'+tds.join('')+'</tr>';
  }).filter(Boolean).join('');
  body.innerHTML=divider+rows;
}
var _origOV=openVergelijk;
openVergelijk=function(){
  _rdwData={};
  _origOV();
  // Fix: dit keek voorheen naar #vergelijkOverlay/.vgl-car-col -- elementen
  // die alleen in de inmiddels verwijderde, dode eerste openVergelijk()-
  // definitie bestonden. De daadwerkelijk gerenderde modal is #vglModal, met
  // per auto een <th class="vgl-car-th"> (geen <div class="vgl-car-col">) en
  // de specificatietabel zelf heeft class "vgl-tbl" (niet "vgl-spec-body").
  var ov=document.getElementById('vglModal');
  if(!ov)return;
  ov.querySelectorAll('.vgl-car-th').forEach(function(col,i){
    var w=document.createElement('div');w.className='vgl-kt-row';
    var inp=document.createElement('input');
    inp.className='vgl-kt-input';inp.placeholder='Kenteken (bv. AB-12-CD)';
    inp.dataset.idx=i;
    inp.addEventListener('input',function(){
      var v=this.value.replace(/[-\s]/g,'').toUpperCase();
      if(v.length>=6)fetchRDW(v,parseInt(this.dataset.idx));
    });
    w.appendChild(inp);col.appendChild(w);
  });
  var tbl=ov.querySelector('.vgl-tbl');
  if(tbl&&!document.getElementById('vgl-rdw-body')){
    var tb=document.createElement('tbody');tb.id='vgl-rdw-body';tbl.appendChild(tb);
  }
};

var _kofferbakDB={
'tesla model 3':561,'tesla model y':854,'tesla model s':804,'tesla model x':2182,
'byd seal u':512,'byd atto 3':440,'byd atto 2':308,'byd dolphin surf':345,'byd dolphin':345,'byd sealion 7':520,'byd sealion 6':425,'byd seal':400,'byd han':440,'byd tang':192,
'volkswagen golf variant':611,'volkswagen golf sportsvan':505,'volkswagen golf':380,'volkswagen polo':280,'volkswagen passat alltrack':636,'volkswagen passat variant':650,'volkswagen passat':586,'volkswagen tiguan allspace':760,'volkswagen tiguan':615,'volkswagen id.3':385,'volkswagen id.4':543,'volkswagen id.5':549,'volkswagen id.7':532,'volkswagen touareg':810,'volkswagen t-roc':445,'volkswagen t-cross':385,'volkswagen taigo':438,'volkswagen arteon':563,'volkswagen caddy':750,'volkswagen up':251,'volkswagen sharan':267,'volkswagen touran':834,
'audi a1':335,'audi a3 sportback':380,'audi a3':380,'audi a4 avant':505,'audi a4':460,'audi a5 sportback':480,'audi a5':465,'audi a6 avant':565,'audi a6':530,'audi a7':535,'audi a8':505,'audi q2':405,'audi q3 sportback':400,'audi q3':530,'audi q5 sportback':535,'audi q5':610,'audi q7':865,'audi q8 e-tron':569,'audi q8':605,'audi e-tron gt':405,'audi e-tron':660,'audi q4 e-tron':520,'audi tt':290,
'bmw 1-serie':360,'bmw 2-serie active tourer':470,'bmw 2-serie gran coupe':430,'bmw 2-serie':390,'bmw 3-serie touring':500,'bmw 3-serie':480,'bmw 4-serie gran coupe':470,'bmw 4-serie':470,'bmw 5-serie touring':570,'bmw 5-serie':530,'bmw 6-serie gran turismo':610,'bmw 6-serie':560,'bmw 7-serie':515,'bmw 8-serie':420,'bmw x1':540,'bmw x2 active tourer':532,'bmw x2':470,'bmw x3':550,'bmw x4':525,'bmw x5':650,'bmw x6':580,'bmw x7':750,'bmw i3':260,'bmw i4':470,'bmw i5':570,'bmw i7':500,'bmw ix1':490,'bmw ix3':510,'bmw ix':500,'bmw z4':281,
'mercedes a-klasse':370,'mercedes b-klasse':486,'mercedes c-klasse':455,'mercedes e-klasse':540,'mercedes glc':560,'mercedes gle':630,'mercedes glb':560,'mercedes gls':730,'mercedes gla':435,'mercedes eqa':340,'mercedes eqb':495,'mercedes eqc':500,'mercedes eqe':430,'mercedes eqs':610,'mercedes cla':460,'mercedes cls':520,'mercedes s-klasse':540,'mercedes sl':354,'mercedes g-klasse':688,
'polestar 2':405,'polestar 3':484,'polestar 4':526,
'cupra formentor':420,'cupra born':385,'cupra leon sportstourer':610,'cupra leon':380,'cupra tavascan':540,'cupra terramar':460,'cupra ateca':510,
'seat ibiza':355,'seat leon sportstourer':620,'seat leon':380,'seat arona':400,'seat ateca':510,'seat mii':251,'seat alhambra':267,'seat tarraco':700,
'skoda octavia combi':640,'skoda octavia':600,'skoda fabia':380,'skoda superb combi':660,'skoda superb':625,'skoda kodiaq':720,'skoda enyaq coupe':570,'skoda enyaq':585,'skoda karoq':521,'skoda kamiq':400,'skoda scala':467,'skoda citigo':251,'skoda rapid':550,
'hyundai ioniq 5':527,'hyundai ioniq 6':401,'hyundai ioniq':350,'hyundai kona':332,'hyundai tucson':620,'hyundai i20':352,'hyundai i30 fastback':395,'hyundai i30':395,'hyundai santa fe':571,'hyundai bayon':411,'hyundai nexo':461,'hyundai i10':252,'hyundai ix20':326,'hyundai ix35':591,
'kia ev6':480,'kia ev9':333,'kia ev3':352,'kia niro':451,'kia sportage':591,'kia ceed':380,'kia stonic':352,'kia sorento':821,'kia picanto':255,'kia rio':325,'kia xceed':426,
'toyota corolla touring':591,'toyota corolla':361,'toyota yaris cross':397,'toyota yaris':286,'toyota rav4':580,'toyota c-hr':377,'toyota prius':457,'toyota camry':524,'toyota aygo':168,'toyota bz4x':452,'toyota land cruiser':909,'toyota verso':440,'toyota auris':360,'toyota avensis':510,
'renault clio':391,'renault megane e-tech':389,'renault megane':388,'renault zoe':338,'renault captur':422,'renault austral':575,'renault scenic':545,'renault kadjar':472,'renault koleos':567,'renault twingo':219,'renault kangoo':775,'renault talisman':562,'renault laguna':480,'renault espace':613,
'peugeot 208':311,'peugeot e-208':265,'peugeot 2008':434,'peugeot 308 sw':660,'peugeot 308':412,'peugeot 3008':520,'peugeot 5008':780,'peugeot 408':471,'peugeot rifter':775,'peugeot 508 sw':530,'peugeot 508':487,'peugeot 107':196,'peugeot 207':270,
'citroën c3 aircross':410,'citroën c3':300,'citroën c4 x':460,'citroën c4':380,'citroën c5 aircross':580,'citroën c5 x':485,'citroën c5':460,'citroën berlingo':775,'citroën c1':196,
'citroen c3 aircross':410,'citroen c3':300,'citroen c4 x':460,'citroen c4':380,'citroen c5 aircross':580,'citroen c5 x':485,'citroen c5':460,'citroen berlingo':775,'citroen c1':196,
'ds ds 3':350,'ds ds 4':390,'ds ds 7':555,'ds ds 9':510,
'opel corsa':309,'opel astra sports tourer':540,'opel astra':422,'opel mokka':350,'opel grandland':514,'opel zafira':620,'opel crossland':410,'opel insignia sports tourer':540,'opel insignia':490,'opel antara':440,'opel meriva':400,
'ford fiesta':303,'ford focus':375,'ford puma':456,'ford kuga':583,'ford mustang mach-e':402,'ford explorer':634,'ford capri':572,'ford galaxy':300,'ford s-max':285,'ford edge':602,'ford mondeo':450,'ford ecosport':333,'ford b-max':318,
'suzuki swift':265,'suzuki e-vitara':320,'suzuki vitara':375,'suzuki ignis':267,'suzuki s-cross':430,'suzuki sx4':270,'suzuki alto':254,'suzuki celerio':254,'suzuki across':490,
'mitsubishi space star':315,'mitsubishi eclipse cross':341,'mitsubishi outlander':463,'mitsubishi asx':363,'mitsubishi colt':289,'mitsubishi grandis':232,
'jeep compass':438,'jeep renegade':351,'jeep avenger':355,'jeep grand cherokee':782,'jeep cherokee':727,'jeep wrangler':142,
'volvo xc40':452,'volvo xc60':505,'volvo xc90':721,'volvo v40':335,'volvo v60':529,'volvo v90':529,'volvo c40':413,'volvo ex30':318,'volvo ex40':419,'volvo s60':442,'volvo s90':500,'volvo c30':310,
'alfa romeo tonale':500,'alfa romeo mito':270,'alfa romeo giulietta':350,'alfa romeo giulia':480,'alfa romeo stelvio':525,'alfa romeo spider':245,'alfa romeo 147':270,'alfa romeo 159':405,
'mini cooper convertible':215,'mini cooper':211,'mini countryman':450,'mini clubman':360,'mini paceman':330,
'nissan leaf':435,'nissan qashqai':504,'nissan micra':300,'nissan juke':422,'nissan ariya':415,'nissan x-trail':585,'nissan murano':901,'nissan note':317,
'porsche taycan sport turismo':446,'porsche taycan':407,'porsche macan':500,'porsche cayenne':772,'porsche panamera sport turismo':520,'porsche panamera':495,'porsche 911':132,'porsche 718':275,'porsche boxster':150,
'range rover evoque':591,'range rover sport':788,'range rover':818,'land rover discovery sport':586,'land rover discovery':1137,'land rover defender':786,
'mazda cx-60':570,'mazda cx-5':522,'mazda cx-30':430,'mazda cx-3':350,'mazda3':408,'mazda6':474,'mazda2':267,'mazda mx-30':366,'mazda mx-5':130,
'honda civic':410,'honda hr-v':393,'honda cr-v':561,'honda jazz':304,'honda e':171,'honda accord':473,'honda zr-v':385,
'fiat 500x':385,'fiat 500l':400,'fiat 500e':185,'fiat 500':185,'fiat tipo':440,'fiat bravo':280,'fiat punto':275,'fiat 600':415,
'jaguar f-pace':650,'jaguar e-pace':577,'jaguar i-pace':505,'jaguar xe':455,'jaguar xf sportbrake':565,'jaguar xf':540,'jaguar xj':450,'jaguar f-type':407,
'subaru forester':520,'subaru xv':385,'subaru outback':522,'subaru levorg':522,'subaru impreza':385,
'lexus lbx':315,'lexus nx':520,'lexus ux':320,'lexus rx':612,'lexus ct':375,'lexus es':454,'lexus is':450,'lexus ls':510,'lexus lc':197,
'dacia sandero stepway':328,'dacia sandero':328,'dacia duster':467,'dacia jogger':575,'dacia spring':308,'dacia logan':510,
'smart #5':550,'smart #3':370,'smart #1':273,'smart forfour':185,'smart fortwo':220,
'lynk & co 01':402,'lynk & co':402,
'mg mg zs':448,'mg mg4 electric':363,'mg mg4':363,'mg ehs':398,'mg hs':507,'mg marvel r':357,'mg5':479,
'leapmotor t03':210,'leapmotor c10':435
};

function _lookupKofferbak(titel){if(!titel)return null;var t=titel.toLowerCase();var best=null,bestLen=0;for(var k in _kofferbakDB){if(t.includes(k)&&k.length>bestLen){best=_kofferbakDB[k];bestLen=k.length;}}return best;}
function _parseSoh(a){var t=(a.titel||'')+' '+(a.beschrijving||'');var m=t.match(/(\d+(?:[,\.]\d+)?)\s*%\s*soh/i)||t.match(/soh\s*(\d+(?:[,\.]\d+)?)\s*%/i);if(!m)return null;var v=parseFloat((m[1]||m[2]).replace(',','.'));return(v>0&&v<=100)?v:null;}
function toggleFav(event,id){event.stopPropagation();if(_favs.has(id)){_favs.delete(id);}else{_favs.add(id);}localStorage.setItem('_av_favs',JSON.stringify([..._favs]));var b=event.currentTarget;if(b){b.classList.toggle('fav-actief',_favs.has(id));b.title=_favs.has(id)?'Verwijder uit favorieten':'Voeg toe aan favorieten';}}
// Dealscore-tooltip (.auto-deal-pill) opent tot nu toe alleen via :hover --
// op een touchscreen (verreweg het meeste verkeer) is die uitleg dus
// onbereikbaar. Tik toggelt 'm nu ook open/dicht; stopPropagation voorkomt
// dat de tik ook nog de hele kaart (openDetail) activeert.
function _toggleDealTip(event){event.stopPropagation();var el=event.currentTarget;var was=el.classList.contains('tip-open');document.querySelectorAll('.auto-deal-pill.tip-open').forEach(function(p){p.classList.remove('tip-open');});if(!was)el.classList.add('tip-open');}
document.addEventListener('click',function(e){if(!e.target.closest('.auto-deal-pill')){document.querySelectorAll('.auto-deal-pill.tip-open').forEach(function(p){p.classList.remove('tip-open');});}});

// Nav "Tools"/"Meer"-dropdowns -- zelfde tap-toggle + klik-buiten-sluit
// patroon als _toggleDealTip hierboven.
function toggleNavDd(event,id){
  event.stopPropagation();
  var panel=document.getElementById(id);
  var trigger=event.currentTarget;
  var was=panel.classList.contains('open');
  closeAllNavDd();
  if(!was){panel.classList.add('open');trigger.classList.add('open');trigger.setAttribute('aria-expanded','true');}
}
function closeAllNavDd(){
  document.querySelectorAll('.nav-dd-panel.open').forEach(function(p){p.classList.remove('open');});
  document.querySelectorAll('.nav-dd-trigger.open').forEach(function(t){t.classList.remove('open');t.setAttribute('aria-expanded','false');});
}
document.addEventListener('click',function(e){if(!e.target.closest('.nav-dd')){closeAllNavDd();}});
function toggleVergelijk(event,id){event.stopPropagation();var i=_vgl.indexOf(id);if(i>=0){_vgl.splice(i,1);}else{if(_vgl.length>=3){alert("Max. 3 auto\u2019s");return;}_vgl.push(id);}updateVglBar();document.querySelectorAll("[data-vgl=\""+id+"\"]").forEach(function(b){var sel=_vgl.includes(id);b.classList.toggle("vgl-actief",sel);b.title=sel?"Verwijder":"Voeg toe";});}
function updateVglBar(){var b=document.getElementById("vglBar");if(!b)return;b.style.display=_vgl.length?"flex":"none";document.getElementById("vglCount").textContent=_vgl.length+" geselecteerd";}
function openVergelijk(){
  if(_vgl.length<2){alert("Selecteer min. 2 auto's");return;}
  var cars=_vgl.map(function(id){return window._vglData[id];}).filter(Boolean);
  var n=cars.length;
  var specs=[
    ['Bouwjaar',function(a){return a.jaar?String(a.jaar):'\u2014';}],
    ['Kilometerstand',function(a){return a.km?a.km.toLocaleString('nl-NL')+' km':'\u2014';}],
    ['SOH',function(a){var sv=_parseSoh(a);return sv?sv+'%':'\u2014';}],
    ['Brandstof',function(a){return a.brandstof||'\u2014';}],
    ['Transmissie',function(a){return a.transmissie||'\u2014';}],
    ['Carrosserie',function(a){return a.carrosserie||'\u2014';}],
    ['Kofferbak',function(a){var lk=a.kofferbak||_lookupKofferbak(a.titel);return lk?lk+' L':'\u2014';}]
  ];
  if(!cars.some(function(a){return a.brandstof&&/elektr|hybr/i.test(a.brandstof)||_parseSoh(a);}))specs=specs.filter(function(s){return s[0]!=='SOH';});
  var thCols=cars.map(function(a){
    var imgH=a.imgSrc
      ?'<img class="vgl-car-photo" src="'+escHtml(a.imgSrc)+'" alt="'+escHtml(a.titel||'')+'" loading="lazy" onerror="this.style.display=\'none\'">'
      :'<div class="vgl-car-nophoto">=€</div>';
    var prijs=a.prijs?'€'+a.prijs.toLocaleString('nl-NL'):'';
    return '<th class="vgl-car-th">'+imgH
      +'<div class="vgl-car-ttl">'+escHtml(a.titel||'')+'</div>'
      +'<div class="vgl-car-prc">'+prijs+'</div>'
      +(a.url?'<a href="'+escHtml(outUrl(a.url,a.bron))+'" target="_blank" class="vgl-car-btn" data-out data-bron="'+escHtml(a.bron||'')+'" data-merk="'+escHtml(a.merk||'')+'" data-prijs="'+(a.prijs||'')+'">Bekijk →</a>':'')
      +'</th>';
  }).join('');
  var rows=specs.map(function(sp){
    var vals=cars.map(sp[1]);
    var same=vals.every(function(v){return v===vals[0];});
    var vCells=vals.map(function(v){return '<td class="vgl-val-td">'+v+'</td>';}).join('');
    return '<tr'+(same?'':' class="vgl-row-diff"')+'><td class="vgl-lbl-td">'+sp[0]+'</td>'+vCells+'</tr>';
  }).join('');
  var modal=document.getElementById('vglModal');
  if(!modal)return;
  modal.innerHTML='<div class="vgl-panel">'
    +'<div class="vgl-panel-hdr">'
    +'<span class="vgl-panel-title">Vergelijking \u2014 '+n+' auto\'s</span>'
    +'<button class="vgl-close-x" onclick="document.getElementById(\'vglModal\').style.display=\'none\';document.body.style.overflow=\'\'">&#215;</button>'
    +'</div>'
    +'<div style="overflow-x:auto"><table class="vgl-tbl">'
    +'<thead><tr><td class="vgl-label-col vgl-lbl-td"></td>'+thCols+'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table></div></div>';
  modal.style.display='flex';
  document.body.style.overflow='hidden';
  modal.onclick=function(e){if(e.target===modal){modal.style.display='none';document.body.style.overflow='';}}
}
function closeVergelijk(){document.getElementById("vglModal").style.display="none";}
function resetVergelijk(){_vgl=[];updateVglBar();document.querySelectorAll("[data-vgl]").forEach(function(b){b.classList.remove("vgl-actief");});}
function filtersNaarURL(){var p=new URLSearchParams();var g=function(id){var e=document.getElementById(id);return e?e.value:"";};var sv=function(k,v){if(v)p.set(k,v);};sv("q",g("zoekInput"));sv("merk",g("merkFilter"));sv("model",g("modelInput"));sv("brandstof",g("brandstofFilter"));sv("jaarMin",g("jaarMin"));sv("jaarMax",g("jaarMax"));sv("prijsMin",g("prijsMin"));sv("prijsMax",g("prijsMax"));sv("kmMin",g("kmMin"));sv("kmMax",g("kmMax"));sv("carrosserie",g("carrosserieFilter"));if(window._actieveTrans)sv("trans",window._actieveTrans);history.replaceState(null,"",p.toString()?"?"+p.toString():location.pathname);}
// setCI (case-insensitief) i.p.v. een kale e.value=val voor de vier
// <select>-velden (merk/model/brandstof/carrosserie): hun <option value>'s
// zijn exact zo gecast als de data zelf (bv. "Audi"), maar oudere/externe
// links naar deze URL's staan vaak in lowercase (bv. ?merk=audi -- door
// Google zelf ontdekt via oude interne links van vóór de /occasions/<merk>/-
// pagina's). Een kale .value="audi" matcht dan geen enkele <option> en de
// select valt terug op "Alle merken", waarna filtersNaarURL() de URL
// vlak daarna herschrijft naar een versie ZONDER merk -- dat ziet Google's
// renderer als een pagina die zichzelf omleidt (69 van zulke URL's onder
// "Page with redirect" in Search Console, sep '26, vrijwel allemaal deze
// exacte ?merk=<lowercase>-vorm). updateModelDropdown() moet vóór het model
// gezet wordt draaien, anders bestaat de matchende <option> voor het model
// nog niet (die opties worden pas gevuld ná een merk-selectie).
function urlNaarFilters(){var p=new URLSearchParams(location.search);if(!p.toString())return;var set=function(id,val){var e=document.getElementById(id);if(e&&val)e.value=val;};var setCI=function(id,val){var e=document.getElementById(id);if(!e||!val)return;var opt=Array.from(e.options).find(function(o){return o.value.toLowerCase()===String(val).toLowerCase();});if(opt)e.value=opt.value;};set("zoekInput",p.get("q"));setCI("merkFilter",p.get("merk"));if(document.getElementById("merkFilter").value&&typeof updateModelDropdown==="function")updateModelDropdown();setCI("modelInput",p.get("model"));setCI("brandstofFilter",p.get("brandstof"));set("jaarMin",p.get("jaarMin"));set("jaarMax",p.get("jaarMax"));set("prijsMin",p.get("prijsMin"));set("prijsMax",p.get("prijsMax"));set("kmMin",p.get("kmMin"));set("kmMax",p.get("kmMax"));setCI("carrosserieFilter",p.get("carrosserie"));if(p.get("trans")){var tb=document.querySelector("[data-val=\""+p.get("trans")+"\"]");if(tb)setTransmissie(tb);}zoekNu();}
document.addEventListener("DOMContentLoaded",urlNaarFilters);

