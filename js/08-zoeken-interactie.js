
// ── Paginering ──
window._pagina=1;
function _paginaControls(totaal,pg,pp){
  var tp=Math.ceil(totaal/pp);
  if(tp<=1)return "";
  var prev=pg>1?"<button onclick=\"gaanPagina("+(pg-1)+")\">\u2039 Vorige</button>":"<button disabled>\u2039 Vorige</button>";
  var next=pg<tp?"<button onclick=\"gaanPagina("+(pg+1)+")\">Volgende \u203a</button>":"<button disabled>Volgende \u203a</button>";
  return "<div class=\"paginering\">"+prev+"<span>Pagina "+pg+" van "+tp+"</span>"+next+"</div>";
}
function gaanPagina(n){window._pagina=n;window._manualPage=true;zoekNu();window.scrollTo({top:0,behavior:"smooth"});}
// ── Afstandsfilter ──
window._locCoord=null;
function geolocate(){
  if(!navigator.geolocation){alert("Geolocation niet beschikbaar");return;}
  navigator.geolocation.getCurrentPosition(function(pos){
    window._locCoord=[pos.coords.latitude,pos.coords.longitude];
    var inp=document.getElementById("locInput");
    if(inp)inp.value="\uD83D\uDCCD Mijn locatie";
    var rad=document.getElementById("radiusSelect");
    if(rad&&!rad.value)rad.value="50";
    zoekNu();
  },function(){alert("Locatie ophalen mislukt. Probeer een stadsnaam.");});
}
// ── Service Worker ──
if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("/sw.js")
      .then(function(r){console.log("SW geregistreerd:",r.scope);})
      .catch(function(e){console.log("SW fout:",e);});
  });
}

// Zoekagent
// _cb (optioneel) vuurt zodra window._locCoord daadwerkelijk bekend is -- zowel
// bij een directe NL_CITIES-treffer (synchroon) als na de Nominatim-fallback
// (asynchroon, na de debounce + netwerklatentie). Zonder dit bleef een postcode
// als "2101 XC" (geen bekende stad, dus altijd de async route) domweg genegeerd
// door het afstandsfilter: de radius-select's onchange=zoekNu() vuurt vaak al
// vóórdat de geocode terug is, en er was daarna niets dat de zoekopdracht
// opnieuw liet draaien zodra de coördinaat alsnog binnenkwam -- het filter-blok
// zag dan permanent _locCoord=null en toonde stilzwijgend gewoon alle resultaten
// (zichtbaar als "Zoeken (43.230)", de ongefilterde totaaltelling). Zelfde
// bugpatroon was al eerder gevonden en gefixt voor de Marktanalyse-regiotool
// (_inputMarktRegio hieronder), maar nooit toegepast op dit, meest zichtbare,
// afstandsfilter.
function _geoLoc(v,_cb){
  window._locCoord=null;
  if(!v||!v.trim()) return;
  var lk=v.trim().toLowerCase();
  var c=NL_CITIES[lk];
  if(!c){for(var k in NL_CITIES){if(lk.includes(k)||k.includes(lk)){c=NL_CITIES[k];break;}}}
  if(c){window._locCoord=c;if(_cb)_cb();return;}
  clearTimeout(window._geoTimer);
  window._geoTimer=setTimeout(function(){
    fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(v.trim())+'&countrycodes=nl&format=json&limit=1')
      .then(function(r){return r.json();})
      .then(function(d){if(d&&d[0]){window._locCoord=[+d[0].lat,+d[0].lon];if(_cb)_cb();}})
      .catch(function(){});
  },600);
}
// Herhaalt de zoekopdracht zodra een postcode/plaatsnaam alsnog een coördinaat
// opleverde -- maar alleen als de gebruiker al een afstand had gekozen (anders
// zou elke intoetsing in het locatieveld onnodig de resultatenlijst laten
// springen, ook als er nog geen radius geselecteerd is).
function _herhaalZoekMetAfstand(){
  var _rs=document.getElementById('radiusSelect');
  if(_rs&&_rs.value&&typeof zoekNu==='function')zoekNu();
}
function openAgent(){
  renderAgentList();
  document.getElementById('agentOverlay').style.display='block';
  document.body.style.overflow='hidden';
  // De badges zijn nu getoond -- als "gelezen" markeren voor de volgende keer
  // (geen tweede render hier, anders verdwijnen de net getoonde badges meteen).
  var list=_agenten(); var gewijzigd=false;
  list.forEach(function(a){ if(a.nieuwOngezien){ a.nieuwOngezien=0; gewijzigd=true; } });
  if(gewijzigd){ localStorage.setItem('zoekagenten',JSON.stringify(list)); _bijwerkAgentNavBadge(); }
}
function sluitAgent(){document.getElementById('agentOverlay').style.display='none';document.body.style.overflow='';}
function _agenten(){try{return JSON.parse(localStorage.getItem("zoekagenten")||"[]");}catch(e){return[];}}

var AGENT_BRANDSTOF_LABELS={benzine:'Benzine',diesel:'Diesel',elektrisch:'Elektrisch',hybride:'Hybride'};
var AGENT_CARROSSERIE_LABELS={hatchback:'Hatchback',sedan:'Sedan',suv:'SUV',stationwagon:'Stationwagon',cabriolet:'Cabrio',coupe:'Coupé',mpv:'MPV',bestelwagen:'Bestelwagen'};

// Leest ALLE actieve filters op de zoekpagina (niet alleen merk+prijs zoals
// voorheen) -- was de kern van de bug: zoekveld/minPrijs/maxPrijs bestaan als
// element-ID al een tijd niet meer (hernoemd naar zoekInput/prijsMin/
// prijsMax), dus sla*Zoekagent* las stilzwijgend altijd lege waarden. Zelfde
// resolutie voor de "custom"-select-optie als zoekNu() hierboven.
function _leesHuidigeFilters(){
  var zoek=(document.getElementById('zoekInput')||{}).value||'';
  var merk=(document.getElementById('merkFilter')||{}).value||'';
  var model=(document.getElementById('modelInput')||{}).value||'';
  var jaarMin=parseInt((document.getElementById('jaarMin')||{}).value)||null;
  var jaarMax=parseInt((document.getElementById('jaarMax')||{}).value)||null;
  var pMnV=(document.getElementById('prijsMin')||{}).value||'';
  var prijsMin=pMnV==='custom'?(parseInt((document.getElementById('prijsMinCustom')||{}).value)||null):(parseInt(pMnV)||null);
  var pMxV=(document.getElementById('prijsMax')||{}).value||'';
  var prijsMax=pMxV==='custom'?(parseInt((document.getElementById('prijsMaxCustom')||{}).value)||null):(parseInt(pMxV)||null);
  var kMnV=(document.getElementById('kmMin')||{}).value||'';
  var kmMin=kMnV==='custom'?(parseInt((document.getElementById('kmMinCustom')||{}).value)||null):(parseInt(kMnV)||null);
  var kMxV=(document.getElementById('kmMax')||{}).value||'';
  var kmMax=kMxV==='custom'?(parseInt((document.getElementById('kmMaxCustom')||{}).value)||null):(parseInt(kMxV)||null);
  var brandstof=(document.getElementById('brandstofFilter')||{}).value||'';
  var carrosserie=(document.getElementById('carrosserieFilter')||{}).value||'';
  var transmissie=window.transmissieActief||'';
  return {zoek:zoek,merk:merk,model:model,jaarMin:jaarMin,jaarMax:jaarMax,prijsMin:prijsMin,prijsMax:prijsMax,kmMin:kmMin,kmMax:kmMax,brandstof:brandstof,carrosserie:carrosserie,transmissie:transmissie};
}
function _agentLabel(f){return [f.merk,f.model].filter(Boolean).join(' ')||f.zoek||(((window.lang||'nl')==='en')?"All cars":"Alle auto's");}
function _agentChips(a){
  var chips=[];
  if(a.jaarMin)chips.push('Bouwjaar '+a.jaarMin+'+');
  if(a.jaarMax)chips.push('Tot bouwjaar '+a.jaarMax);
  if(a.minPrijs)chips.push('Min €'+Number(a.minPrijs).toLocaleString('nl-NL'));
  if(a.maxPrijs)chips.push('Max €'+Number(a.maxPrijs).toLocaleString('nl-NL'));
  if(a.brandstof)chips.push(AGENT_BRANDSTOF_LABELS[a.brandstof]||a.brandstof);
  if(a.carrosserie)chips.push(AGENT_CARROSSERIE_LABELS[a.carrosserie]||a.carrosserie);
  if(a.transmissie)chips.push(a.transmissie==='automaat'?'Automaat':'Handgeschakeld');
  if(a.kmMin)chips.push('Min '+Number(a.kmMin).toLocaleString('nl-NL')+' km');
  if(a.kmMax)chips.push('Max '+Number(a.kmMax).toLocaleString('nl-NL')+' km');
  if(a.q)chips.push('"'+a.q+'"');
  return chips;
}
function renderAgentList(){
  var el=document.getElementById('agentList');
  var list=_agenten();
  if(!list.length){
    el.innerHTML='<div class="agent-leeg"><span class="ic">🔔</span>'+((window.lang||'nl')==='en'?"No saved alerts yet.":"Nog geen zoekagenten opgeslagen.")+'</div>';
    return;
  }
  el.innerHTML=list.map(function(a,i){
    var chips=_agentChips(a);
    var chipsHtml=chips.length?('<div class="agent-chips">'+chips.map(function(c){return '<span class="agent-chip">'+escHtml(c)+'</span>';}).join('')+'</div>'):'';
    var nieuwBadge=a.nieuwOngezien?('<span class="agent-nieuw-badge">'+a.nieuwOngezien+' nieuw</span>'):'';
    return '<div class="agent-card">'+
      '<div class="agent-card-top"><div class="agent-titel">'+escHtml(a.label||_agentLabel(a))+'</div>'+
      '<div class="agent-acties">'+
      '<button class="agent-actie-btn" title="Bewerken" onclick="bewerkAgent('+i+')">✏️</button>'+
      '<button class="agent-actie-btn" title="Verwijderen" onclick="verwijderAgent('+i+')">🗑️</button>'+
      '</div></div>'+
      chipsHtml+
      '<div class="agent-meta"><span>Opgeslagen op '+escHtml(a.opgeslagenOp||'')+'</span>'+nieuwBadge+'</div>'+
      '</div>';
  }).join('');
}
function verwijderAgent(i){
  var list=_agenten();
  list.splice(i,1);
  localStorage.setItem("zoekagenten",JSON.stringify(list));
  if(_agentBewerkIndex===i)annuleerAgentBewerken();
  renderAgentList();
}
// Bewerken vult de ECHTE zoekfilters op de homepage met de opgeslagen criteria
// van deze agent (i.p.v. een los formulier in de modal na te bouwen) -- de
// gebruiker past ze daar aan en overschrijft deze agent zodra "Wijzigingen
// opslaan" wordt geklikt. Niets gaat verloren als de bewerking wordt
// afgebroken: de agent zelf wordt pas aangepast bij een echte opslag-actie.
var _agentBewerkIndex=null;
function bewerkAgent(i){
  var a=_agenten()[i];
  if(!a)return;
  _agentBewerkIndex=i;
  var zet=function(id,val){var el=document.getElementById(id);if(el)el.value=val;};
  zet('zoekInput',a.q||'');
  zet('merkFilter',a.merk||'');
  if(typeof updateModelDropdown==='function')updateModelDropdown();
  zet('modelInput',a.model||'');
  zet('jaarMin',a.jaarMin||'');
  zet('jaarMax',a.jaarMax||'');
  zet('prijsMin',a.minPrijs||'');
  zet('prijsMax',a.maxPrijs||'');
  zet('kmMin',a.kmMin||'');
  zet('kmMax',a.kmMax||'');
  zet('brandstofFilter',a.brandstof||'');
  zet('carrosserieFilter',a.carrosserie||'');
  var trWaarde=a.transmissie||'';
  document.querySelectorAll('.toggle-btns button').forEach(function(b){b.classList.toggle('actief',(b.dataset.val||'')===trWaarde);});
  window.transmissieActief=trWaarde;
  sluitAgent();
  if(typeof zoekNu==='function')zoekNu();
  var banner=document.getElementById('agentBewerkBanner');
  var naamEl=document.getElementById('agentBewerkNaam');
  if(naamEl)naamEl.textContent=a.label||_agentLabel(a);
  if(banner)banner.style.display='block';
  var opslaanBtn=document.getElementById('agentOpslaanBtn');
  if(opslaanBtn)opslaanBtn.innerHTML='💾 Wijzigingen opslaan';
  window.scrollTo({top:0,behavior:'smooth'});
}
function annuleerAgentBewerken(){
  _agentBewerkIndex=null;
  var banner=document.getElementById('agentBewerkBanner');
  if(banner)banner.style.display='none';
  var opslaanBtn=document.getElementById('agentOpslaanBtn');
  if(opslaanBtn)opslaanBtn.innerHTML='💾 Huidige filters opslaan';
}
function slaZoekagentOp(){
  var f=_leesHuidigeFilters();
  var list=_agenten();
  var bewerkIdx=_agentBewerkIndex;
  var bestaand=(bewerkIdx!=null)?list[bewerkIdx]:null;
  var agent={
    label:_agentLabel(f), merk:f.merk||null, model:f.model||null, q:f.zoek||null,
    jaarMin:f.jaarMin, jaarMax:f.jaarMax,
    minPrijs:f.prijsMin, maxPrijs:f.prijsMax,
    kmMin:f.kmMin, kmMax:f.kmMax,
    brandstof:f.brandstof||null, carrosserie:f.carrosserie||null, transmissie:f.transmissie||null,
    opgeslagenOp:new Date().toISOString().slice(0,10),
    gezieneIds:bestaand?(bestaand.gezieneIds||[]):[],
    nieuwOngezien:0
  };
  if(bestaand&&bestaand._cloudId)agent._cloudId=bestaand._cloudId;
  var isBewerken=bewerkIdx!=null&&bestaand;
  var schrijfIndex;
  if(isBewerken){list[bewerkIdx]=agent;schrijfIndex=bewerkIdx;}else{list.push(agent);schrijfIndex=list.length-1;}
  localStorage.setItem("zoekagenten",JSON.stringify(list));
  window._laatstOpgeslagenAgentIndex=schrijfIndex;
  annuleerAgentBewerken();
  renderAgentList();
  var msg=document.getElementById("agentMsg");
  if(msg){msg.textContent=isBewerken?"Wijzigingen opgeslagen!":"Zoekagent opgeslagen!";setTimeout(function(){msg.textContent="";},2500);}
}
function _bijwerkAgentNavBadge(){
  var btn=document.getElementById('agentNavBtn');
  if(!btn)return;
  var totaal=_agenten().reduce(function(s,a){return s+(a.nieuwOngezien||0);},0);
  btn.innerHTML=totaal>0?('&#128276;('+totaal+')<span class="nav-txt"> Zoekagent</span>'):'&#128276;<span class="nav-txt"> Zoekagent</span>';
}
// Meteen bij laden al een eventueel vanuit een vorige sessie opgebouwde
// "nieuwOngezien"-badge tonen, zonder te wachten op de 3s-vertraagde eerste
// controleerZoekagenten()-check (die pas draait zodra window._alleAutos er is).
_bijwerkAgentNavBadge();
// Zelfde matchlogica als zoekNu() hierboven, hier los herhaald omdat
// controleerZoekagenten() buiten de DOM-context van de zoekpagina matcht
// (elke agent kan andere criteria hebben dan de filters die nu op het scherm
// staan) -- bewust op dezelfde manier geïmplementeerd (substring-matching bij
// brandstof/carrosserie/transmissie) zodat een agent precies dezelfde auto's
// oplevert als wanneer je die filters zelf zou instellen.
function _matchtAgentFilters(a,agent){
  if(agent.merk){
    var merkLower=String(agent.merk).toLowerCase();
    if((a.merk||'').toLowerCase()!==merkLower&&!((a.titel||'').toLowerCase().includes(merkLower)))return false;
  }
  if(agent.model&&!((a.titel||'').toLowerCase().includes(String(agent.model).toLowerCase())))return false;
  if(agent.q){
    var q=String(agent.q).toLowerCase();
    if(!((a.titel||'').toLowerCase().includes(q))&&!((a.locatie||'').toLowerCase().includes(q)))return false;
  }
  if(agent.jaarMin!=null&&(a.jaar||0)<agent.jaarMin)return false;
  if(agent.jaarMax!=null&&(a.jaar||9999)>agent.jaarMax)return false;
  if(agent.minPrijs!=null&&a.prijs!=null&&a.prijs<agent.minPrijs)return false;
  if(agent.maxPrijs!=null&&a.prijs!=null&&a.prijs>agent.maxPrijs)return false;
  if(agent.kmMin!=null&&(a.km||0)<agent.kmMin)return false;
  if(agent.kmMax!=null&&(a.km||0)>agent.kmMax)return false;
  if(agent.carrosserie&&!((a.carrosserie||'').toLowerCase().includes(String(agent.carrosserie).toLowerCase())))return false;
  if(agent.brandstof){
    var bf=(a.brandstof||'').toLowerCase();
    var bsVal=String(agent.brandstof).toLowerCase();
    var bsMatch=bsVal==='hybride'?bf.includes('hybride'):bsVal==='elektrisch'?bf.includes('elektr'):bf.includes(bsVal);
    if(!bsMatch)return false;
  }
  if(agent.transmissie){
    var tr=(a.transmissie||'').toLowerCase();
    var trMatch=agent.transmissie==='automaat'?(tr.includes('automat')||tr==='automaat'):agent.transmissie==='handgeschakeld'?(tr.includes('handm')||tr.includes('manueel')||tr.includes('handgesch')):tr.includes(agent.transmissie);
    if(!trMatch)return false;
  }
  return true;
}
function controleerZoekagenten(handmatig){
  if(!window._alleAutos||!window._alleAutos.length)return;
  var vandaag=new Date().toISOString().slice(0,10);
  var list=_agenten();
  var totaalNieuw=0;
  list=list.map(function(agent){
    var matches=window._alleAutos.filter(function(a){return _matchtAgentFilters(a,agent);});
    var nieuw=matches.filter(function(a){return a.eersteGezien===vandaag&&!(agent.gezieneIds||[]).includes(a.id);});
    if(nieuw.length){
      totaalNieuw+=nieuw.length;
      agent.gezieneIds=(agent.gezieneIds||[]).concat(nieuw.map(function(a){return a.id;}));
      agent.nieuwOngezien=(agent.nieuwOngezien||0)+nieuw.length;
      if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
        new Notification("Zoekagent: "+(agent.label||_agentLabel(agent)),{body:nieuw.length+" nieuwe auto's gevonden!",icon:"/icons/icon-192.png"});
      }
    }
    return agent;
  });
  localStorage.setItem("zoekagenten",JSON.stringify(list));
  _bijwerkAgentNavBadge();
  if(handmatig){
    var msg=document.getElementById("agentMsg");
    if(msg){msg.textContent=totaalNieuw?"Gevonden: "+totaalNieuw+" nieuwe auto('s)!":"Geen nieuwe auto's.";setTimeout(function(){if(msg)msg.textContent="";},3000);}
    renderAgentList();
  }
}
// Snelle eerste check, 3s na laden -- draait op dat moment meestal nog tegen de
// kleine top-300-subset (listings-top.json), dus kan nieuwe advertenties buiten
// die subset missen. window._laadVolledig() roept controleerZoekagenten() daarom
// hierboven nogmaals aan zodra de volledige dataset binnen is.
(function(){if(typeof Notification!=="undefined"&&Notification.permission==="default")Notification.requestPermission();setTimeout(function(){controleerZoekagenten(false);},3000);})();

function berekenTrending(){
  var autos=window._alleAutos;
  if(!autos||!autos.length)return;
  var teller={};
  // Gebruikt de al-schone a.merk/a.model velden i.p.v. _getMerk(a.titel) opnieuw te
  // parsen voor elke advertentie (tot 20.000x) — scheelt flink wat rekenwerk op het
  // kritieke laadpad, en is bovendien nauwkeuriger dan de titel-heuristiek.
  autos.forEach(function(a){
    var merk=(a.merk||"").trim();if(!merk||merk==='overig')return;
    var model=(a.model||"").trim();
    var key=merk+(model?" "+model:"");
    teller[key]=(teller[key]||0)+1;
  });
  var sorted=Object.keys(teller).sort(function(a,b){return teller[b]-teller[a];}).slice(0,6);
  if(!sorted.length)return;
  var el=document.getElementById("trendingRij");if(!el)return;
  var html='<span class="trend-label">&#128293; Trending:</span>';
  sorted.forEach(function(key){
    var n=teller[key];
    html+='<button class="trend-pill" data-trend="'+key.replace(/"/g,"&quot;")+'">'+key+' <small style="opacity:.6">('+n+')</small></button>';
  });
  el.innerHTML=html;el.style.display="flex";
  el.addEventListener("click",function(e){
    var btn=e.target.closest(".trend-pill");
    if(btn)filterOpTrend(btn.getAttribute("data-trend"));
  },{once:false});
}
function filterOpTrend(key){
  if(!key)return;
  var delen=key.split(" ");var merk=delen[0];var model=delen.slice(1).join(" ");
  var mf=document.getElementById("merkFilter");
  if(mf){for(var i=0;i<mf.options.length;i++){if(mf.options[i].value.toLowerCase()===merk.toLowerCase()){mf.value=mf.options[i].value;if(typeof updateModelDropdown==="function")updateModelDropdown();break;}}}
  if(model){var zv=document.getElementById("zoekveld");if(zv)zv.value=model;}
  zoekNu();window.scrollTo({top:0,behavior:"smooth"});
}


  // Vult een <select> met alle bekende merken (behalve "overig"). Herbruikt door
  // de Marktanalyse-modal (#mMerk) en de inruil-widget op de detailpagina
  // (#dInruilMerk). skipIfGevuld=true laat 'm met rust als er al opties in staan
  // (nodig voor #mMerk, die als DOM-element blijft bestaan tussen modal-opens).
  function _populeerMerkSelect(selEl, skipIfGevuld) {
    if (!selEl || (skipIfGevuld && selEl.options.length > 1)) return;
    var seen = {};
    (window._alleAutos||[]).forEach(function(a){ var m=a.merk; if(m&&m!=='overig'&&!seen[m]){seen[m]=1;} });
    Object.keys(seen).sort().forEach(function(m){ var o=document.createElement('option'); o.value=m; o.textContent=m; selEl.appendChild(o); });
  }
  function _populeerModelSelect(selEl, merk, placeholder) {
    if (!selEl) return;
    selEl.innerHTML = '<option value="">' + placeholder + '</option>';
    if (!merk) return;
    var seen = {};
    (window._alleAutos||[]).forEach(function(a){
      if (a.merk===merk && a.model && !seen[a.model]) { seen[a.model]=1; }
    });
    Object.keys(seen).sort().forEach(function(m){ var o=document.createElement('option'); o.value=m; o.textContent=m; selEl.appendChild(o); });
  }

  // ===== MARKTANALYSE =====
  function openMarkt() {
    var ol = document.getElementById('marktOverlay');
    ol.style.display = 'block';
    document.body.style.overflow = 'hidden';
    _populeerMerkSelect(document.getElementById('mMerk'), true);
    berekenMarkt();
    // Markthistorie laadt async (los JSON-bestand) -- na het eerste, snellere
    // berekenMarkt()-render (zonder trend) opnieuw verversen zodra 'm binnen is.
    _laadMarktHistorie().then(function(){ berekenMarkt(); });
  }

  function _getMerk(t){if(!t)return '';var lo=t.toLowerCase();var tw=['land rover','alfa romeo','aston martin','rolls royce','ds automobiles','great wall'];var tc=['Land Rover','Alfa Romeo','Aston Martin','Rolls-Royce','DS Automobiles','Great Wall'];for(var i=0;i<tw.length;i++){if(lo.startsWith(tw[i]))return tc[i];}var ix=t.indexOf(' ');var w=ix>0?t.slice(0,ix):t;while(w.length>0&&'.,!?'.indexOf(w[w.length-1])>=0)w=w.slice(0,-1);if(w.length<2)return '';var c=w.charCodeAt(0);if(!((c>=65&&c<=90)||(c>=97&&c<=122)||c>191))return '';var bl=['auto','automaat','occasion','gebruikt','verkoop','inruil','opties'];if(bl.indexOf(w.toLowerCase())>=0)return '';var up=w.toUpperCase();return(up===w&&w.length<=5)?w:w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();}
function _getModel(t){if(!t)return '';var m=_getMerk(t);var r=t.slice(m.length).trim();if(!r)return '';var ix=r.indexOf(' ');return ix>0?r.slice(0,ix):r;}
function sluitMarkt() {
    document.getElementById('marktOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  // Diepe link vanaf de statische /occasions/*-pagina's: ?markt=<merk> opent de
  // Marktanalyse-modal direct met dat merk voorgeselecteerd (?markt= zonder
  // waarde opent 'm gewoon op "Alle merken"). Direct bij scriptstart vastleggen
  // (niet pas in urlNaarMarkt() zelf): zoekNu() herschrijft de URL via _toURL()
  // en zou een ?markt= die geen erkend filter is er anders al uit gesloopt
  // hebben tegen de tijd dat urlNaarMarkt() draait.
  var _marktDeeplink = new URLSearchParams(location.search).has('markt')
    ? (new URLSearchParams(location.search).get('markt') || '')
    : undefined;
  function urlNaarMarkt() {
    if (_marktDeeplink === undefined) return;
    openMarkt();
    var merkParam = _marktDeeplink;
    if (!merkParam) return;
    var mSel = document.getElementById('mMerk');
    if (!mSel) return;
    var target = Array.from(mSel.options).find(function(o){ return o.value.toLowerCase() === merkParam.toLowerCase(); });
    if (target) {
      mSel.value = target.value;
      updateMarktModellen(target.value);
      berekenMarkt();
      // ?model= hergebruikt hetzelfde param als de normale zoekfilters (die
      // vullen ondertussen ook gewoon modelInput) -- hiermee kan een gedeelde
      // "kopieer link naar deze analyse" ook het model voorselecteren, niet
      // alleen het merk.
      var modelParam = new URLSearchParams(location.search).get('model');
      if (modelParam) {
        var modelSel = document.getElementById('mModel');
        var modelTarget = modelSel && Array.from(modelSel.options).find(function(o){ return o.value.toLowerCase() === modelParam.toLowerCase(); });
        if (modelTarget) {
          modelSel.value = modelTarget.value;
          berekenMarkt();
        }
      }
    }
  }

  function updateMarktModellen(merk) {
    _populeerModelSelect(document.getElementById('mModel'), merk, 'Alle modellen');
    berekenInruilwaarde();
  }

  // ===== INRUIL-WIDGET OP DE AUTO-DETAILPAGINA =====
  // Zelfde regressie als Marktanalyse (_schatInruilwaarde), maar vergeleken met
  // de vraagprijs van de advertentie die je op dat moment bekijkt i.p.v. een los
  // budget-bereik -- direct relevant voor de auto die je aan het bekijken bent.
  function updateDetailModellen(merk) {
    _populeerModelSelect(document.getElementById('dInruilModel'), merk, 'Model');
    berekenDetailInruil();
  }
  function berekenDetailInruil() {
    var leeg = document.getElementById('dInruilLeeg');
    var uitkomst = document.getElementById('dInruilUitkomst');
    var kmInput = document.getElementById('dInruilKm');
    var jaarInput = document.getElementById('dInruilJaar');
    if (!leeg || !uitkomst) return;
    var merk = document.getElementById('dInruilMerk').value;
    var model = document.getElementById('dInruilModel').value;
    if (kmInput) kmInput.disabled = !(merk && model);
    if (jaarInput) jaarInput.disabled = !(merk && model);

    function toon(msg) { leeg.textContent = msg; leeg.style.display = ''; uitkomst.style.display = 'none'; }

    var km = parseInt(kmInput.value) || 0;
    var jaar = parseInt(jaarInput.value) || 0;
    var r = _schatInruilwaarde(merk, model, km, jaar);
    if (r.fout) return toon(r.fout);

    var auto = (alleResultaten||[]).find(function(x){ return x.id === huidigDetailId; });
    var prijs = auto ? auto.prijs : null;
    if (typeof prijs !== 'number') return toon('Vraagprijs van deze advertentie onbekend.');

    var bijMin = prijs - r.inruilMax, bijMax = prijs - r.inruilMin;
    var inruilTekst = fmtEuro(r.inruilMin) + ' – ' + fmtEuro(r.inruilMax);
    var html;
    if (bijMax <= 0) {
      html = '<p>Je indicatieve inruilwaarde (<strong>' + inruilTekst + '</strong>) dekt de vraagprijs van ' + fmtEuro(prijs) + ' ruimschoots — mogelijk houd je zelfs geld over.</p>';
    } else if (bijMin <= 0) {
      html = '<p>Met een inruilwaarde van <strong>' + inruilTekst + '</strong> leg je hooguit ongeveer <strong>' + fmtEuro(bijMax) + '</strong> bij voor deze auto (' + fmtEuro(prijs) + ') — mogelijk zelfs niets.</p>';
    } else {
      html = '<p>Met een inruilwaarde van <strong>' + inruilTekst + '</strong> leg je ongeveer <strong>' + fmtEuro(bijMin) + ' – ' + fmtEuro(bijMax) + '</strong> bij voor deze auto (' + fmtEuro(prijs) + ').</p>';
    }
    uitkomst.innerHTML = html;
    leeg.style.display = 'none'; uitkomst.style.display = '';
  }

  function berekenMarkt() {
    var merk = document.getElementById('mMerk').value;
    var model = document.getElementById('mModel').value;
    var jaarMin = parseInt(document.getElementById('mJaar').value)||0;
    var brandstof = document.getElementById('mBrandstof').value;
    var trans = document.getElementById('mTrans').value;

    var data = (window._alleAutos||[]).filter(function(a){
      if (!a.prijs || a.prijs < 500) return false;
      if (merk && a.merk !== merk) return false;
      if (model && a.model !== model) return false;
      if (jaarMin && (!a.jaar || a.jaar < jaarMin)) return false;
      if (brandstof && a.brandstof !== brandstof) return false;
      if (trans && a.transmissie !== trans) return false;
      return true;
    });

    // Los van de data-check hieronder aanroepen: de inruilcalculator, prijstrend
    // en merken-ranglijst gebruiken bewust geen van alle de jaar/brandstof/
    // transmissie-filters, dus moeten ook verversen als de bredere
    // marktfilter-combinatie 0 resultaten oplevert -- anders blijven ze hangen
    // op een oude melding (zoals eerder al gebeurde met de inruilcalculator).
    berekenInruilwaarde();
    _renderPrijstrend(merk, model);
    _renderRegionaal(merk, model);
    _renderMerkenRanglijst(merk);
    var vglSectie = document.getElementById('mVglSectie');
    if (vglSectie) vglSectie.style.display = (merk && model) ? '' : 'none';
    _renderModelVergelijk();
    _renderMarktToolbar(merk, model);

    var leeg = document.getElementById('mLeeg');
    var res = document.getElementById('mResultaat');
    // Zonder merk-selectie zijn de statistieken/histogram/topdeals hieronder
    // zelf misleidend (ze mengen compleet verschillende prijsklassen -- een
    // Sandero "dealscore" t.o.v. de mediaan van de HELE markt zegt niets zinnigs).
    // Dan alleen de ranglijst tonen i.p.v. deze sectie.
    var subEl = document.getElementById('mTopbarSub');
    if (!merk) { leeg.style.display='none'; res.style.display='none'; if (subEl) subEl.textContent = 'Vind de actuele marktprijs voor elk merk en model'; return; }
    if (!data.length) { leeg.style.display=''; res.style.display='none'; if (subEl) subEl.textContent = merk + (model?' '+model:'') + ' — geen advertenties'; return; }
    leeg.style.display='none'; res.style.display='';

    var prijzen = data.map(function(a){return a.prijs;}).sort(function(a,b){return a-b;});
    var n = prijzen.length;
    if (subEl) subEl.textContent = merk + (model?' '+model:'') + ' — ' + n + ' advertentie' + (n===1?'':'s');
    var avg = Math.round(prijzen.reduce(function(s,p){return s+p;},0)/n);
    var mediaan = n%2===0 ? Math.round((prijzen[n/2-1]+prijzen[n/2])/2) : prijzen[Math.floor(n/2)];
    var minP = prijzen[0], maxP = prijzen[n-1];
    var metKm = data.filter(function(a){return a.km>0;});
    var avgKm = metKm.length ? Math.round(metKm.reduce(function(s,a){return s+a.km;},0)/metKm.length) : null;
    var metPrijsKm = data.filter(function(a){return a.km>1000&&a.km<300000;});
    var prijsPerKm = metPrijsKm.length ? Math.round(metPrijsKm.reduce(function(s,a){return s+a.prijs/a.km*100;},0)/metPrijsKm.length)/100 : null;

    var fmt = function(p){ return '€'+Math.round(p).toLocaleString('nl-NL'); };

    // Aanbod-schaarste: bewust op de segment-grootte van merk(+model) alléén, los
    // van de jaar/brandstof/transmissie-filters -- geeft aan hoeveel algemene keuze
    // (en dus onderhandelingsruimte) er is, ongeacht de smallere subfilter-combinatie.
    var segSize = (window._alleAutos||[]).filter(function(a){
      return (!merk || a.merk===merk) && (!model || a.model===model) && a.prijs>=500;
    }).length;
    var schaarsteHtml = '';
    if (merk) {
      var schaarsteCls = segSize>=150 ? 'markt-schaarste-ruim' : segSize>=40 ? 'markt-schaarste-normaal' : 'markt-schaarste-beperkt';
      var schaarsteLbl = segSize>=150 ? 'Ruim aanbod' : segSize>=40 ? 'Normaal aanbod' : 'Beperkt aanbod';
      schaarsteHtml = '<div class="markt-schaarste-badge '+schaarsteCls+'">'+schaarsteLbl+'</div>';
    }

    var cards = [['Gemiddeld',fmt(avg)],['Mediaan',fmt(mediaan)],['Laagste',fmt(minP)],['Hoogste',fmt(maxP)],['Advertenties',n+schaarsteHtml]];
    if (avgKm) cards.push(['Gem. km', Math.round(avgKm/1000)+'k km']);
    if (prijsPerKm) cards.push(['€/km', '€'+prijsPerKm.toFixed(2)]);
    document.getElementById('mStats').innerHTML = cards.map(function(c){
      return '<div class="markt-stat"><div class="markt-stat-val">'+c[1]+'</div><div class="markt-stat-lbl">'+c[0]+'</div></div>';
    }).join('');

    // Histogram-bereik robuust tegen uitschieters maken: één extreme advertentie
    // (bv. een exoot voor €400k tussen occasions van €20k) trok anders bijna de
    // hele balkenreeks samen in de eerste 1-2 balken. IQR-hekken (Q1-1,5×IQR /
    // Q3+1,5×IQR, dezelfde methode als een boxplot) i.p.v. vaste percentielen --
    // die laatste kunnen bij kleine n een enkele uitschieter niet uitsluiten
    // (1 op de 26 is al bijna "de bovenste 2%"), IQR-hekken werken ongeacht n.
    var histMin = minP, histMax = maxP, buitenBereik = 0;
    var q1 = prijzen[Math.floor(n*0.25)];
    var q3 = prijzen[Math.min(n-1, Math.floor(n*0.75))];
    var iqr = q3 - q1;
    if (iqr > 0) {
      histMin = Math.max(minP, q1 - 1.5*iqr);
      histMax = Math.min(maxP, q3 + 1.5*iqr);
      if (histMax <= histMin) { histMin = minP; histMax = maxP; }
    }
    var buckets=12, range=histMax-histMin||1, step=range/buckets;
    var counts=new Array(buckets).fill(0);
    prijzen.forEach(function(p){
      if (p < histMin || p > histMax) buitenBereik++;
      var clamped = Math.min(Math.max(p, histMin), histMax);
      var i=Math.min(Math.floor((clamped-histMin)/step),buckets-1);
      counts[i]++;
    });
    var maxCount=Math.max.apply(null,counts);
    var svg=document.getElementById('mHistSvg');
    var W=svg.parentElement.clientWidth-24; if(W<10)W=600;
    var bw=Math.floor((W-(buckets-1)*2)/buckets);
    svg.setAttribute('viewBox','0 0 '+W+' 80');
    var mi=Math.min(Math.floor((mediaan-histMin)/step),buckets-1);
    svg.innerHTML=counts.map(function(c,i){
      var h=maxCount?Math.max(4,Math.round(c/maxCount*66)):4;
      return '<rect x="'+(i*(bw+2))+'" y="'+(74-h)+'" width="'+bw+'" height="'+h+'" rx="2" fill="'+(i===mi?'#e8632a':'#f59d72')+'" opacity="0.85"/>';
    }).join('');
    document.getElementById('mHistLabels').innerHTML=
      '<span>'+fmt(histMin)+'</span><span>'+fmt(histMin+range*0.33)+'</span><span>Mediaan: '+fmt(mediaan)+'</span><span>'+fmt(histMin+range*0.67)+'</span><span>'+fmt(histMax)+'</span>';
    var outlierNote = document.getElementById('mHistOutlierNote');
    if (outlierNote) {
      if (buitenBereik > 0) {
        outlierNote.textContent = buitenBereik + ' uitschieter' + (buitenBereik===1?'':'s') + ' buiten dit bereik meegeteld in de buitenste balk (niet los weergegeven).';
        outlierNote.style.display = '';
      } else {
        outlierNote.style.display = 'none';
      }
    }

    var scEl=document.getElementById('mScatterSvg');
    var sW=scEl.parentElement.clientWidth-24; if(sW<10)sW=600;
    var sH=130; scEl.setAttribute('viewBox','0 0 '+sW+' '+sH);
    // Zelfde IQR-uitschieters ook hier buiten de as-schaal houden -- anders trekt
    // diezelfde exoot de y-as (en daarmee alle "normale" punten) plat naar de
    // onderkant van de grafiek.
    var metPrijsKmRobust = metPrijsKm.filter(function(a){ return a.prijs>=histMin && a.prijs<=histMax; });
    if (metPrijsKmRobust.length < 2) metPrijsKmRobust = metPrijsKm;
    var scData=metPrijsKmRobust.length>300?metPrijsKmRobust.filter(function(_,i){return i%Math.ceil(metPrijsKmRobust.length/300)===0;}):metPrijsKmRobust;
    if(scData.length>1){
      var kms=scData.map(function(a){return a.km;}),prs=scData.map(function(a){return a.prijs;});
      var minKm=Math.min.apply(null,kms),maxKm=Math.max.apply(null,kms),minPr=Math.min.apply(null,prs),maxPr=Math.max.apply(null,prs);
      var kR=maxKm-minKm||1,pR=maxPr-minPr||1;
      var sX=0,sY=0,sXY=0,sX2=0,sN=scData.length;
      scData.forEach(function(a){sX+=a.km;sY+=a.prijs;sXY+=a.km*a.prijs;sX2+=a.km*a.km;});
      var sl=(sN*sXY-sX*sY)/(sN*sX2-sX*sX)||0,ic=(sY-sl*sX)/sN;
      var toX=function(k){return 14+(k-minKm)/kR*(sW-28);},toY=function(p){return sH-10-(p-minPr)/pR*(sH-20);};
      var out='<line x1="'+toX(minKm)+'" y1="'+toY(ic+sl*minKm)+'" x2="'+toX(maxKm)+'" y2="'+toY(ic+sl*maxKm)+'" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4"/>';
      scData.forEach(function(a){
        var exp=ic+sl*a.km,pct=(a.prijs-exp)/exp;
        out+='<circle cx="'+toX(a.km)+'" cy="'+toY(a.prijs)+'" r="3.5" fill="'+(pct<-0.18?'#22c55e':pct>0.18?'#ef4444':'#e8632a')+'" opacity="0.5"/>';
      });
      out+='<text x="14" y="'+(sH-2)+'" font-size="9" fill="#94a3b8">'+Math.round(minKm/1000)+'k km</text>';
      out+='<text x="'+(sW-14)+'" y="'+(sH-2)+'" font-size="9" fill="#94a3b8" text-anchor="end">'+Math.round(maxKm/1000)+'k km</text>';
      scEl.innerHTML=out;
    } else {
      scEl.innerHTML='<text x="50%" y="50%" font-size="12" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">Te weinig data met km</text>';
    }

    var dealsData=data.filter(function(a){return a.prijs>5000&&a.prijs<mediaan*0.95&&a.jaar>=2008&&a.km>10000&&a.km<220000;})
       .map(function(a){
         var hj=new Date().getFullYear();
         var pct=Math.round((a.prijs-mediaan)/mediaan*100);
         var prijsScore=Math.max(0,(mediaan-a.prijs)/mediaan);
         var leeftijd=Math.max(1,hj-a.jaar);
         var kmRatio=a.km/(leeftijd*15000);
         var kmScore=Math.max(0,1-kmRatio);
         var jaarScore=Math.max(0,Math.min(1,(a.jaar-2005)/(hj-2005)));
         var dealScore=0.40*prijsScore+0.40*kmScore+0.20*jaarScore;
         return {a:a,pct:pct,dealScore:dealScore};
       })
       .sort(function(x,y){return y.dealScore-x.dealScore;}).slice(0,5);
    document.getElementById('mDealsBody').innerHTML=dealsData.length?dealsData.map(function(d){
      var cls=d.pct<-20?'markt-deal-hot':'markt-deal-ok';
      var naam=escHtml((d.a.titel||'').slice(0,32)+(d.a.titel&&d.a.titel.length>32?'…':''));
      var link=d.a.url?'<a href="'+escHtml(outUrl(d.a.url,d.a.bron))+'" target="_blank" style="color:inherit;text-decoration:none" data-out data-bron="'+escHtml(d.a.bron||'')+'" data-merk="'+escHtml(d.a.merk||'')+'" data-prijs="'+(d.a.prijs||'')+'">'+naam+'</a>':naam;
      return '<tr><td style="color:var(--subtekst);font-size:12px">'+link+'</td><td>'+fmt(d.a.prijs)+'</td><td><span class="markt-deal-badge '+cls+'">'+d.pct+'%</span></td></tr>';
    }).join(''):'<tr><td colspan="3" style="color:var(--subtekst);padding:10px 8px">Geen opvallende deals</td></tr>';

    var jaarData={};
    data.forEach(function(a){if(a.jaar>=2008&&a.jaar<=2026){jaarData[a.jaar]=(jaarData[a.jaar]||0)+1;}});
    var jaren=Object.keys(jaarData).map(Number).sort(function(a,b){return a-b;});
    if(jaren.length){
      var jC=jaren.map(function(j){return jaarData[j];}),jMax=Math.max.apply(null,jC);
      var jSvg=document.getElementById('mJaarSvg'),jW=jSvg.parentElement.clientWidth-24;
      if(jW<10)jW=280;
      var jBw=Math.max(3,Math.floor((jW-(jaren.length-1)*2)/jaren.length));
      jSvg.setAttribute('viewBox','0 0 '+jW+' 80');
      jSvg.innerHTML=jC.map(function(c,i){
        var h=jMax?Math.max(4,Math.round(c/jMax*66)):4;
        return '<rect x="'+(i*(jBw+2))+'" y="'+(74-h)+'" width="'+jBw+'" height="'+h+'" rx="2" fill="#a78bfa" opacity="0.8"/>';
      }).join('');
      document.getElementById('mJaarLabels').innerHTML=
        '<span>'+jaren[0]+'</span>'+(jaren.length>2?'<span>'+jaren[Math.floor(jaren.length/2)]+'</span>':'')+'<span>'+jaren[jaren.length-1]+'</span>';
    }
  }

  // ===== PRIJSTREND (data/markt-history.json) =====
  // De scraper legt sinds kort dagelijks per merk(+model) een marktsnapshot vast
  // (n/avg/mediaan/p25/p75). Hier lazy geladen zodra Marktanalyse opengaat, en
  // hergebruikt voor een trendlijn -- groeit vanzelf waardevoller naarmate er
  // meer dagen bijkomen.
  function _marktSegmentKey(merk, model) {
    return (merk + (model ? '_' + model : '')).toLowerCase().replace(/\s+/g, '_');
  }
  function _laadMarktHistorie() {
    if (window._marktHistorie) return Promise.resolve(window._marktHistorie);
    if (window._marktHistoriePromise) return window._marktHistoriePromise;
    window._marktHistoriePromise = fetch('data/markt-history.json')
      .then(function(r){ return r.ok ? r.json() : []; })
      .catch(function(){ return []; })
      .then(function(d){ window._marktHistorie = Array.isArray(d) ? d : []; return window._marktHistorie; });
    return window._marktHistoriePromise;
  }
  // Trend vereist zowel merk als model: voor merk-alleen bevat de historie geen
  // betrouwbaar merk-breed segment (elke dag wordt per merk+model bijgehouden,
  // niet als apart merk-totaal), dus dan bewust niets tonen i.p.v. een misleidend
  // gewogen gemiddelde over ongelijksoortige modellen.
  function _renderPrijstrend(merk, model) {
    var sectie = document.getElementById('mTrendSectie');
    var inhoud = document.getElementById('mTrendInhoud');
    if (!sectie || !inhoud) return;
    if (!merk || !model || !window._marktHistorie) { sectie.style.display = 'none'; return; }
    var key = _marktSegmentKey(merk, model);
    var reeks = window._marktHistorie
      .map(function(d){ return { datum: d.datum, seg: d.segmenten && d.segmenten[key] }; })
      .filter(function(x){ return x.seg && x.seg.n >= 3; })
      .sort(function(a,b){ return a.datum < b.datum ? -1 : (a.datum > b.datum ? 1 : 0); });
    if (reeks.length < 2) { sectie.style.display = 'none'; return; }
    sectie.style.display = '';

    var prices = reeks.map(function(x){ return x.seg.med; });
    var minP = Math.min.apply(null, prices), maxP = Math.max.apply(null, prices), range = (maxP-minP)||1;
    var nPt = prices.length;
    var pts = prices.map(function(p,i){ return ((i/(nPt-1))*198+1).toFixed(1)+","+(47-((p-minP)/range)*44).toFixed(1); }).join(' ');
    var dots = prices.map(function(p,i){
      var x=((i/(nPt-1))*198+1).toFixed(1), y=(47-((p-minP)/range)*44).toFixed(1);
      return '<circle cx="'+x+'" cy="'+y+'" r="2.5" fill="var(--oranje)"/>';
    }).join('');
    var eerste = prices[0], laatste = prices[nPt-1];
    var delta = laatste - eerste;
    var deltaPct = eerste ? (delta/eerste*100) : 0;
    var dCol = delta<0 ? '#16a34a' : delta>0 ? '#dc2626' : 'var(--subtekst)';
    var dSym = delta<0 ? '▼' : delta>0 ? '▲' : '—';
    var dStr = delta!==0 ? dSym+' '+fmtEuro(Math.abs(delta))+' ('+(deltaPct>=0?'+':'')+deltaPct.toFixed(1)+'%)' : 'Stabiel';
    inhoud.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:12px;color:var(--subtekst)">Mediaan-vraagprijs, laatste '+nPt+' dagen</div><div style="font-size:12px;font-weight:700;color:'+dCol+'">'+dStr+'</div></div>' +
      '<svg width="100%" height="44" viewBox="0 0 200 50" preserveAspectRatio="none" style="display:block"><polyline points="'+pts+'" fill="none" stroke="var(--oranje)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--subtekst);margin-top:4px"><span>'+reeks[0].datum+': '+fmtEuro(eerste)+'</span><span>Nu: '+fmtEuro(laatste)+'</span></div>';

    // Prognose: lineaire regressie op dagindex->mediaanprijs doortrekken. Pas
    // tonen vanaf 14 dagen historie (te weinig punten = extrapolatie die
    // statistisch niet te verantwoorden is), en de horizon nooit verder
    // vooruit kijken dan de lengte van de al geobserveerde periode -- een
    // gangbare vuistregel om wilde extrapolatie te vermijden.
    var progWrap = document.getElementById('mTrendPrognose');
    if (progWrap) {
      if (nPt >= 14) {
        var sX=0,sY=0,sXY=0,sX2=0;
        prices.forEach(function(p,i){ sX+=i; sY+=p; sXY+=i*p; sX2+=i*i; });
        var denom = nPt*sX2-sX*sX;
        var slope = denom ? (nPt*sXY-sX*sY)/denom : 0;
        var intercept = (sY-slope*sX)/nPt;
        var horizon = Math.min(90, nPt);
        var prognosePrijs = Math.max(500, Math.round(intercept + slope*(nPt-1+horizon)));
        var progDelta = prognosePrijs - laatste;
        var progPct = laatste ? (progDelta/laatste*100) : 0;
        progWrap.innerHTML = '<p style="font-size:12px;color:var(--subtekst);margin:8px 0 0;padding-top:8px;border-top:1px dashed var(--rand)">' +
          'Bij ongewijzigde trend: over ' + horizon + ' dagen naar verwachting <strong style="color:var(--tekst)">' + fmtEuro(prognosePrijs) + '</strong> (' + (progPct>=0?'+':'') + progPct.toFixed(1) + '%). ' +
          '<span class="markt-info-ic" title="Simpele lineaire doortrekking van de laatste ' + nPt + ' dagen -- geen garantie, alleen een indicatie bij een gelijkblijvende trend.">i</span></p>';
      } else {
        progWrap.innerHTML = '<p style="font-size:11px;color:var(--subtekst);margin:8px 0 0">Prognose verschijnt zodra er minstens 14 dagen prijshistorie is (nu ' + nPt + ').</p>';
      }
    }
    var betrouwbNote = document.getElementById('mTrendBetrouwbaarheid');
    if (betrouwbNote) {
      var laatsteN = reeks[nPt-1].seg.n;
      var bTekst = _betrouwbaarheidsTekst(laatsteN);
      betrouwbNote.textContent = bTekst || '';
    }
  }

  // ===== "ALLE MERKEN"-RANGLIJST =====
  // Bij geen merk-selectie was hier voorheen alleen één grote, weinig zeggende
  // samengevoegde statistiek te zien (Golf naast Ferrari). In plaats daarvan een
  // ranglijst tonen: welke merken het meest aangeboden worden en welke het
  // goedkoopst zijn -- direct bruikbaar zonder eerst zelf te hoeven filteren.
  function _renderMerkenRanglijst(merk) {
    var wrap = document.getElementById('mMerkenRanglijst');
    if (!wrap) return;
    if (merk) { wrap.style.display = 'none'; return; }
    var fmt = function(p){ return '€'+Math.round(p).toLocaleString('nl-NL'); };
    var groepen = {};
    (window._alleAutos||[]).forEach(function(a){
      if (!a.merk || a.merk==='overig' || !a.prijs || a.prijs<500) return;
      if (!groepen[a.merk]) groepen[a.merk] = [];
      groepen[a.merk].push(a.prijs);
    });
    var merken = Object.keys(groepen).map(function(m){
      var pp = groepen[m].sort(function(a,b){return a-b;});
      var n = pp.length;
      return { merk: m, n: n, mediaan: n%2===0 ? Math.round((pp[n/2-1]+pp[n/2])/2) : pp[Math.floor(n/2)] };
    });
    var topVolume = merken.slice().sort(function(a,b){ return b.n-a.n; }).slice(0,8);
    var topGoedkoop = merken.filter(function(m){ return m.n>=20; }).sort(function(a,b){ return a.mediaan-b.mediaan; }).slice(0,8);
    var rijVolume = function(m){ return '<tr onclick="_kiesMerkUitRanglijst(\''+escHtml(m.merk).replace(/'/g,"\\'")+'\')" style="cursor:pointer"><td>'+escHtml(m.merk)+'</td><td style="text-align:right;color:var(--subtekst)">'+m.n+' adv.</td></tr>'; };
    var rijGoedkoop = function(m){ return '<tr onclick="_kiesMerkUitRanglijst(\''+escHtml(m.merk).replace(/'/g,"\\'")+'\')" style="cursor:pointer"><td>'+escHtml(m.merk)+'</td><td style="text-align:right;color:var(--subtekst)">'+fmt(m.mediaan)+'</td></tr>'; };
    document.getElementById('mRanglijstVolume').innerHTML = topVolume.map(rijVolume).join('') || '<tr><td colspan="2" style="color:var(--subtekst)">Geen data</td></tr>';
    document.getElementById('mRanglijstGoedkoop').innerHTML = topGoedkoop.map(rijGoedkoop).join('') || '<tr><td colspan="2" style="color:var(--subtekst)">Geen data</td></tr>';
    wrap.style.display = '';
  }
  function _kiesMerkUitRanglijst(merk) {
    var mSel = document.getElementById('mMerk');
    if (!mSel) return;
    var target = Array.from(mSel.options).find(function(o){ return o.value === merk; });
    if (!target) return;
    mSel.value = merk;
    updateMarktModellen(merk);
    berekenMarkt();
  }

  // Kleine steekproeven leiden tot ruizige mediaan/trend/afschrijvingscijfers --
  // die onzekerheid expliciet benoemen i.p.v. een precies ogend getal zonder
  // context te tonen (bv. "€13.125 mediaan" terwijl dat op 4 advertenties rust).
  function _betrouwbaarheidsTekst(n) {
    if (n >= 100) return null;
    if (n >= 30) return 'Gebaseerd op ' + n + ' advertenties — redelijk betrouwbaar.';
    return 'Gebaseerd op slechts ' + n + ' advertenties — kleine steekproef, interpreteer met voorzichtigheid.';
  }

  // ===== TOOLBAR: volgen + delen =====
  function _renderMarktToolbar(merk, model) {
    var bar = document.getElementById('mToolbar');
    if (!bar) return;
    if (!merk || !model) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    var btn = document.getElementById('mVolgBtn');
    if (btn) {
      var lijst = _agenten();
      var gevolgd = lijst.some(function(a){ return a.merk===merk && a.q===model; });
      btn.textContent = gevolgd ? '✓ Wordt gevolgd' : '🔔 Volg dit model';
      btn.disabled = gevolgd;
    }
    var deelBtn = document.getElementById('mDeelBtn');
    if (deelBtn) deelBtn.textContent = '🔗 Kopieer link naar deze analyse';
  }
  function _volgModelVanuitMarkt() {
    var merk = document.getElementById('mMerk').value, model = document.getElementById('mModel').value;
    if (!merk || !model) return;
    var lijst = _agenten();
    if (lijst.some(function(a){ return a.merk===merk && a.q===model; })) return;
    lijst.push({ label: merk+' '+model, merk: merk, q: model, minPrijs: null, maxPrijs: null, opgeslagenOp: new Date().toISOString().slice(0,10), gezieneIds: [] });
    localStorage.setItem('zoekagenten', JSON.stringify(lijst));
    _renderMarktToolbar(merk, model);
  }
  function _deelMarktLink() {
    var merk = document.getElementById('mMerk').value, model = document.getElementById('mModel').value;
    if (!merk || !model) return;
    var url = location.origin + '/?markt=' + encodeURIComponent(merk) + '&model=' + encodeURIComponent(model);
    var btn = document.getElementById('mDeelBtn');
    var toon = function(msg){ if (btn) { var origineel = '🔗 Kopieer link naar deze analyse'; btn.textContent = msg; setTimeout(function(){ btn.textContent = origineel; }, 2000); } };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function(){ toon('✓ Link gekopieerd!'); }).catch(function(){ toon(url); });
    } else {
      toon(url);
    }
  }

  // ===== REGIONALE PRIJSVERGELIJKING =====
  // Hergebruikt de bestaande NL_CITIES-lijst en window._locCoord (dezelfde
  // locatie-state als het afstandsfilter op de zoekpagina) i.p.v. een eigen
  // stad->provincie-mapping op te tuigen -- die zou voor het merendeel van de
  // (vaak kleinere) plaatsnamen in de advertenties toch geen dekking hebben.
  function _vindStadCoord(locatie) {
    if (!locatie) return null;
    var lk = locatie.toLowerCase().trim();
    if (NL_CITIES[lk]) return NL_CITIES[lk];
    for (var ck in NL_CITIES) { if (lk.includes(ck)) return NL_CITIES[ck]; }
    return null;
  }
  function _haversineKm(a, b) {
    var dlat=(b[0]-a[0])*Math.PI/180, dlon=(b[1]-a[1])*Math.PI/180;
    var h = Math.sin(dlat/2)*Math.sin(dlat/2) + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dlon/2)*Math.sin(dlon/2);
    return 6371*2*Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }
  function _wijzigMarktRegio() {
    window._locCoord = null;
    var merk = document.getElementById('mMerk').value, model = document.getElementById('mModel').value;
    _renderRegionaal(merk, model);
    var inp = document.getElementById('mRegioPlaats');
    if (inp) inp.focus();
  }
  function _inputMarktRegio(v) {
    _geoLoc(v);
    // _geoLoc() is soms async (Nominatim-fallback voor plaatsen buiten
    // NL_CITIES, met een debounce van 600ms) -- meteen én na die debounce
    // opnieuw renderen zodat beide gevallen (bekende stad / onbekende plaats)
    // de regio-vergelijking bijwerken.
    var merk = document.getElementById('mMerk').value, model = document.getElementById('mModel').value;
    _renderRegionaal(merk, model);
    clearTimeout(window._marktRegioTimer);
    window._marktRegioTimer = setTimeout(function(){ _renderRegionaal(merk, model); }, 700);
  }
  function _renderRegionaal(merk, model) {
    var sectie = document.getElementById('mRegioSectie');
    var inhoud = document.getElementById('mRegioInhoud');
    if (!sectie || !inhoud) return;
    if (!merk || !model) { sectie.style.display = 'none'; return; }
    sectie.style.display = '';
    var fmt = function(p){ return '€'+Math.round(p).toLocaleString('nl-NL'); };
    var mediaanVan = function(pp){ pp = pp.slice().sort(function(a,b){return a-b;}); var n=pp.length; return n%2===0 ? Math.round((pp[n/2-1]+pp[n/2])/2) : pp[Math.floor(n/2)]; };

    var lc = window._locCoord;
    if (!lc) {
      var huidigeInvoer = (document.getElementById('locInput')||{}).value || '';
      inhoud.innerHTML =
        '<div class="markt-regio-invoer"><input type="text" id="mRegioPlaats" value="'+escHtml(huidigeInvoer)+'" placeholder="Plaatsnaam, bv. Utrecht" autocomplete="off" oninput="_inputMarktRegio(this.value)" aria-label="Plaatsnaam voor regionale prijsvergelijking">' +
        '<p style="font-size:12px;color:var(--subtekst);margin:8px 0 0">Vul een plaats in om de prijs in jouw regio te vergelijken met de rest van Nederland.</p></div>';
      return;
    }
    var wijzigLink = '<p style="margin:8px 0 0"><a href="#" onclick="_wijzigMarktRegio();return false" style="font-size:12px;color:var(--oranje)">Andere plaats? &rarr;</a></p>';
    var subset = (window._alleAutos||[]).filter(function(a){ return a.merk===merk && a.model===model && a.prijs>=500; });
    if (subset.length < 5) { inhoud.innerHTML = '<p style="font-size:13px;color:var(--subtekst);margin:0">Onvoldoende advertenties van dit merk en model voor een regionale vergelijking.</p>'+wijzigLink; return; }
    var radiusSel = document.getElementById('radiusSelect');
    var radius = (radiusSel && parseInt(radiusSel.value)) || 75;
    var regionaal = subset.filter(function(a){
      var ac = _vindStadCoord(a.locatie);
      return ac && _haversineKm(lc, ac) <= radius;
    });
    if (regionaal.length < 3) {
      inhoud.innerHTML = '<p style="font-size:13px;color:var(--subtekst);margin:0">Nog geen '+radius+' km met voldoende '+escHtml(merk)+' '+escHtml(model)+'-advertenties om regionaal te vergelijken (nu '+regionaal.length+').</p>'+wijzigLink;
      return;
    }
    var medLandelijk = mediaanVan(subset.map(function(a){return a.prijs;}));
    var medRegio = mediaanVan(regionaal.map(function(a){return a.prijs;}));
    var verschilPct = medLandelijk ? Math.round((medRegio-medLandelijk)/medLandelijk*100) : 0;
    var vCol = verschilPct<-3 ? '#16a34a' : verschilPct>3 ? '#dc2626' : 'var(--subtekst)';
    var vTekst = verschilPct<-3 ? (Math.abs(verschilPct)+'% goedkoper dan landelijk') : verschilPct>3 ? (verschilPct+'% duurder dan landelijk') : 'vergelijkbaar met landelijk';
    var bTekstRegio = _betrouwbaarheidsTekst(regionaal.length);
    inhoud.innerHTML =
      '<div class="markt-regio-vergelijk"><div class="markt-inruil-card"><div class="lbl">Binnen '+radius+' km ('+regionaal.length+' adv.)</div><div class="val">'+fmt(medRegio)+'</div></div>' +
      '<div class="markt-inruil-card hoofd"><div class="lbl">Landelijk ('+subset.length+' adv.)</div><div class="val">'+fmt(medLandelijk)+'</div></div></div>' +
      '<p style="font-size:13px;margin:10px 0 0;color:'+vCol+';font-weight:600">'+vTekst+'</p>' +
      (bTekstRegio ? '<p class="markt-betrouwbaarheid">'+bTekstRegio+'</p>' : '') + wijzigLink;
  }

  // ===== MODEL-VERGELIJKING (marktniveau) =====
  // Bewust géén kopie van de bestaande advertentie-vergelijker (die zet 2-3
  // concrete auto's met exacte specs naast elkaar). Dit vergelijkt twee hele
  // modellen statistisch -- prijsspreiding, afschrijving per km, aanbodgrootte
  // -- om te helpen kiezen ẂELK model je gaat zoeken, vóórdat je specifieke
  // advertenties hebt om in de bestaande vergelijker te zetten. Linkt aan het
  // eind door naar het normale zoekresultaat i.p.v. dat te dupliceren.
  function _regressieSlope(items) {
    var metKm = items.filter(function(a){ return a.km>1000 && a.km<300000; });
    if (metKm.length < 5) return null;
    var n=metKm.length, sX=0,sY=0,sXY=0,sX2=0;
    metKm.forEach(function(a){ sX+=a.km; sY+=a.prijs; sXY+=a.km*a.prijs; sX2+=a.km*a.km; });
    var denom = n*sX2-sX*sX;
    return denom ? (n*sXY-sX*sY)/denom : 0;
  }
  function _toggleModelVergelijk() {
    var body = document.getElementById('mVglBody');
    if (!body) return;
    var open = body.style.display !== 'none';
    body.style.display = open ? 'none' : '';
    if (!open) _populeerMerkSelect(document.getElementById('mVglMerk'), true);
  }
  function _updateVglModellen(merk) {
    _populeerModelSelect(document.getElementById('mVglModel'), merk, 'Model');
    _renderModelVergelijk();
  }
  function _modelStats(merk, model) {
    var subset = (window._alleAutos||[]).filter(function(a){ return a.merk===merk && a.model===model && a.prijs>=500; });
    if (subset.length < 5) return null;
    var pp = subset.map(function(a){return a.prijs;}).sort(function(a,b){return a-b;});
    var n = pp.length;
    var mediaan = n%2===0 ? Math.round((pp[n/2-1]+pp[n/2])/2) : pp[Math.floor(n/2)];
    var slope = _regressieSlope(subset);
    return {
      merk: merk, model: model, n: n, mediaan: mediaan,
      p25: pp[Math.floor(n*0.25)], p75: pp[Math.min(n-1, Math.floor(n*0.75))],
      afschrKm: slope==null ? null : slope*1000
    };
  }
  function _renderModelVergelijk() {
    var wrap = document.getElementById('mVglInhoud');
    if (!wrap) return;
    var merk1 = document.getElementById('mMerk').value, model1 = document.getElementById('mModel').value;
    var merk2 = document.getElementById('mVglMerk').value, model2 = document.getElementById('mVglModel').value;
    if (!merk1 || !model1) { wrap.innerHTML = '<p style="font-size:13px;color:var(--subtekst);margin:0">Selecteer eerst hierboven een merk en model.</p>'; return; }
    if (!merk2 || !model2) { wrap.innerHTML = ''; return; }
    var s1 = _modelStats(merk1, model1), s2 = _modelStats(merk2, model2);
    if (!s1 || !s2) { wrap.innerHTML = '<p style="font-size:13px;color:var(--subtekst);margin:0">Onvoldoende advertenties van één van beide modellen voor een betrouwbare vergelijking.</p>'; return; }
    var fmt = function(p){ return '€'+Math.round(p).toLocaleString('nl-NL'); };
    var naam1 = merk1+' '+model1, naam2 = merk2+' '+model2;
    var rij = function(label, v1, v2, beter1, beter2) {
      return '<tr><td>'+label+'</td><td'+(beter1?' class="markt-vgl-beter"':'')+'>'+v1+'</td><td'+(beter2?' class="markt-vgl-beter"':'')+'>'+v2+'</td></tr>';
    };
    var rijen = '';
    rijen += rij('Mediaan prijs', fmt(s1.mediaan), fmt(s2.mediaan), s1.mediaan<s2.mediaan, s2.mediaan<s1.mediaan);
    rijen += rij('Prijsspreiding (p25–p75)', fmt(s1.p25)+' – '+fmt(s1.p75), fmt(s2.p25)+' – '+fmt(s2.p75), false, false);
    rijen += rij('Aanbod', s1.n+' adv.', s2.n+' adv.', s1.n>s2.n, s2.n>s1.n);
    if (s1.afschrKm!=null && s2.afschrKm!=null) {
      var a1 = Math.abs(s1.afschrKm), a2 = Math.abs(s2.afschrKm);
      rijen += rij('Afschrijving per 1.000 km', '−'+fmt(a1), '−'+fmt(a2), a1<a2, a2<a1);
    }
    var kleinsteN = Math.min(s1.n, s2.n);
    var bTekst = _betrouwbaarheidsTekst(kleinsteN);
    wrap.innerHTML =
      '<table class="markt-vgl-tabel"><thead><tr><th></th><th>'+escHtml(naam1)+'</th><th>'+escHtml(naam2)+'</th></tr></thead><tbody>'+rijen+'</tbody></table>' +
      (bTekst ? '<p class="markt-betrouwbaarheid">'+bTekst+'</p>' : '') +
      // rel="nofollow": deze CTA's genereren een ?merk=&model=-URL per gekozen
      // merk/model-paar in deze vergelijker -- bij tientallen merken x modellen
      // een combinatorische explosie aan dunne, homepage-duplicerende query-
      // string-URL's. GSC "Page indexing" meldde 14+ van zulke URL's als
      // "Discovered - currently not indexed" (sep '26) -- Google vindt ze via
      // deze links, maar kruipt ze (terecht) niet. nofollow voorkomt dat
      // crawl-budget hieraan wordt besteed; de link blijft gewoon klikbaar
      // voor bezoekers. De écht indexeerbare, canonieke pagina voor een merk/
      // model is /occasions/<merk>/<model>/ (zie generate-occasions.js) -- die
      // wordt al apart gelinkt via _renderMerkenLinks() e.d.
      '<div class="markt-vgl-cta"><a href="/?merk='+encodeURIComponent(merk1)+'&model='+encodeURIComponent(model1)+'" rel="nofollow">Bekijk '+escHtml(naam1)+'-aanbod &rarr;</a>' +
      '<a href="/?merk='+encodeURIComponent(merk2)+'&model='+encodeURIComponent(model2)+'" rel="nofollow">Bekijk '+escHtml(naam2)+'-aanbod &rarr;</a></div>';
  }

  // Vaste prijsstappen van de #prijsMin/#prijsMax select-filters op de homepage --
  // de upgrade-suggestie rondt hierop af zodat de ?prijsMin=/?prijsMax=-deep-link
  // (via urlNaarFilters()) altijd op een bestaande <option> aanslaat.
  var PRIJS_STAPPEN_MIN = [1000,2500,5000,7500,10000,15000,20000,25000,30000,40000,50000,75000];
  var PRIJS_STAPPEN_MAX = [2500,5000,7500,10000,15000,20000,25000,30000,40000,50000,75000,100000];
  function _naarPrijsstap(bedrag, stappen) {
    return stappen.reduce(function(beste, s){ return Math.abs(s-bedrag) < Math.abs(beste-bedrag) ? s : beste; });
  }

  var fmtEuro = function(p){ return '€' + Math.round(p).toLocaleString('nl-NL'); };

  // Marge-presets voor de upgrade-budgetsuggestie: hoeveel iemand naar
  // verwachting bovenop de eigen inruilwaarde wil/kan besteden aan de
  // volgende auto. Instelbaar i.p.v. één vaste marge, met "Gemiddeld" als
  // ongewijzigd standaardgedrag (was: altijd x1,5–x2,5).
  var INRUIL_MARGES = {
    krap:      { lo: 1.25, hi: 1.75, lbl: 'Krap' },
    gemiddeld: { lo: 1.5,  hi: 2.5,  lbl: 'Gemiddeld' },
    ruim:      { lo: 2.0,  hi: 3.0,  lbl: 'Ruim' },
    zeerruim:  { lo: 2.5,  hi: 4.0,  lbl: 'Zeer ruim' }
  };

  // Schat marktwaarde + indicatieve inruilwaarde op basis van een eigen prijs/km/bouwjaar-
  // regressie over alle advertenties van dit merk+model — bewust los van de jaar/brandstof/
  // transmissie-filters van de aanroeper, zodat de steekproef groot en stabiel blijft.
  // Retourneert {fout} of {marktwaarde, inruilMin, inruilMax, n}. Gedeeld door de
  // Marktanalyse-modal en de mini-widget op de auto-detailpagina.
  // Verplaatst naar lib/carkijker-core.js (schatInruilwaarde) zodat de
  // losse /inruilwaarde/-pagina exact dezelfde, geteste berekening gebruikt
  // i.p.v. een tweede kopie die uit de pas kan lopen. Kleine wrapper hier
  // vult 'm met window._alleAutos in, zoals de rest van deze modal al deed.
  function _schatInruilwaarde(merk, model, km, jaar) {
    return CarkijkerCore.schatInruilwaarde(window._alleAutos, merk, model, km, jaar);
  }

  function berekenInruilwaarde() {
    var leeg = document.getElementById('mInruilLeeg');
    var uitkomst = document.getElementById('mInruilUitkomst');
    var disclaimer = document.getElementById('mInruilDisclaimer');
    var kmInput = document.getElementById('mInruilKm');
    var jaarInput = document.getElementById('mInruilJaar');
    if (!leeg || !uitkomst) return;
    var merk = document.getElementById('mMerk').value;
    var model = document.getElementById('mModel').value;

    if (kmInput) kmInput.disabled = !(merk && model);
    if (jaarInput) jaarInput.disabled = !(merk && model);

    function toon(msg) {
      leeg.textContent = msg; leeg.style.display = '';
      uitkomst.style.display = 'none'; disclaimer.style.display = 'none';
      var s = document.getElementById('mInruilSuggestie'); if (s) s.style.display = 'none';
    }

    var km = parseInt(kmInput.value) || 0;
    var jaar = parseInt(jaarInput.value) || 0;
    var r = _schatInruilwaarde(merk, model, km, jaar);
    if (r.fout) return toon(r.fout);
    var marktwaarde = r.marktwaarde, inruilMin = r.inruilMin, inruilMax = r.inruilMax, n = r.n;

    uitkomst.innerHTML =
      '<div class="markt-inruil-card"><div class="lbl">Geschatte marktwaarde</div><div class="val">' + fmtEuro(marktwaarde) + '</div></div>' +
      '<div class="markt-inruil-card hoofd"><div class="lbl">Indicatieve inruilwaarde</div><div class="val">' + fmtEuro(inruilMin) + ' – ' + fmtEuro(inruilMax) + '</div></div>';
    disclaimer.textContent = 'Schatting op basis van ' + n + ' advertenties van ' + merk + ' ' + model + ' (vraagprijs, niet inruil), rekening houdend met km-stand en bouwjaar, los van de jaar/brandstof/transmissie-filters hierboven. Geen officiële taxatie — de werkelijke inruilwaarde hangt af van staat, onderhoudshistorie en dealer.';
    leeg.style.display = 'none'; uitkomst.style.display = ''; disclaimer.style.display = '';

    window._laatsteInruil = { inruilMin: inruilMin, inruilMax: inruilMax };
    _toonUpgradeSuggestie('mInruilSuggestie', 'mInruilMarge', inruilMin, inruilMax);
  }

  // Upgrade-suggestie: op basis van de indicatieve inruilwaarde (niet de losse
  // marktwaarde) een budget voor de volgende auto voorstellen. Marge instelbaar
  // via het bijbehorende <select id="margeSelId">; standaard "Gemiddeld"
  // (+50% tot +150%) i.p.v. een extra invoerveld, zodat de suggestie meteen
  // zichtbaar is. Afgerond op de vaste prijsstappen van het hoofd-zoekfilter,
  // zodat de link daar ook echt op aanslaat.
  function _toonUpgradeSuggestie(suggestieId, margeSelId, inruilMin, inruilMax) {
    var suggestie = document.getElementById(suggestieId);
    var content = document.getElementById(suggestieId + 'Content');
    if (!suggestie || !content) return;
    var margeSel = document.getElementById(margeSelId);
    var marge = INRUIL_MARGES[(margeSel && margeSel.value) || 'gemiddeld'] || INRUIL_MARGES.gemiddeld;
    var inruilMid = (inruilMin + inruilMax) / 2;
    var budgetMinRaw = inruilMid * marge.lo, budgetMaxRaw = inruilMid * marge.hi;
    var budgetMin = _naarPrijsstap(budgetMinRaw, PRIJS_STAPPEN_MIN);
    // Bij hoge inruilwaardes/marges valt budgetMaxRaw buiten de hoogste beschikbare
    // prijsstap (€100.000) -- dan een open-eind "vanaf"-suggestie i.p.v. het bereik
    // kunstmatig plat te slaan op diezelfde vaste bovengrens.
    var maxStap = PRIJS_STAPPEN_MAX[PRIJS_STAPPEN_MAX.length - 1];
    var openEinde = budgetMaxRaw >= maxStap;
    var budgetMax = openEinde ? null : _naarPrijsstap(budgetMaxRaw, PRIJS_STAPPEN_MAX);
    if (openEinde || budgetMax > budgetMin) {
      var budgetTekst = openEinde ? ('vanaf ' + fmtEuro(budgetMin)) : (fmtEuro(budgetMin) + ' – ' + fmtEuro(budgetMax));
      var link = '/?prijsMin=' + budgetMin + (openEinde ? '' : ('&prijsMax=' + budgetMax));
      content.innerHTML =
        '<p>Op basis van je inruilwaarde: met een budget van <strong>' + budgetTekst + '</strong> vind je hieronder passend aanbod voor je volgende auto.</p>' +
        '<a href="' + link + '" class="btn" style="background:var(--oranje);color:#fff;display:inline-flex;margin-top:10px">Bekijk aanbod in dit budget &rarr;</a>';
      suggestie.style.display = '';
    } else {
      suggestie.style.display = 'none';
    }
  }
