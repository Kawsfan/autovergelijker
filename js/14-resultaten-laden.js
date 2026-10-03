
(function(){
"use strict";

window._paginaControls=function(tot,pg,pp){
  if(tot<=pp)return'';
  return'<div id="is-sentinel"></div>';
};
var _isApp=false,_origTR=window.toonResultaten;
window.toonResultaten=function(lijst){
  _origTR.apply(this,arguments);
  if(_isApp)return;
  setTimeout(function(){
    var s=document.getElementById('is-sentinel');
    if(!s)return;
    if(window._scObs)window._scObs.disconnect();
    window._scObs=new IntersectionObserver(function(e){
      if(!e[0].isIntersecting)return;
      _meerLaden();
    },{rootMargin:'50px'});
    window._scObs.observe(s);
  },80);
};
function _meerLaden(){
  var g=document.getElementById('autoGrid');
  if(!g)return;
  if(window._scObs)window._scObs.disconnect();
  var saved='';
  Array.from(g.children).forEach(function(c){if(c.id!=='is-sentinel')saved+=c.outerHTML;});
  _isApp=true;
  window['gaan'+'Pagina']((window._pagina||1)+1);
  _isApp=false;
  var nc='';
  Array.from(g.children).forEach(function(c){if(c.id!=='is-sentinel')nc+=c.outerHTML;});
  var more=!!document.getElementById('is-sentinel');
  var sntnl='<div id=\'is-sentinel\'></div>';
  var _sy=window.scrollY||window.pageYOffset;
  var _sy=window.scrollY||window.pageYOffset;
  g.innerHTML=saved+nc+(more?sntnl:'');
  window.scrollTo(0,_sy);
  window.scrollTo(0,_sy);
  if(more){
    var ns=document.getElementById('is-sentinel');
    window._scObs=new IntersectionObserver(function(e){
      if(!e[0].isIntersecting)return; _meerLaden();
    },{rootMargin:'50px'});
    window._scObs.observe(ns);
  }
}

function _buildSlider(loId,hiId,fmt){
  var loS=document.getElementById(loId),hiS=document.getElementById(hiId);
  if(!loS||!hiS)return;
  var opts=Array.from(loS.options).map(function(o){return o.value;}).filter(function(v){return v!=='';});
  if(!opts.length)return;
  var mx=opts.length-1;
  // Als de select al een waarde heeft (bv. gezet via urlNaarFilters() vanuit een
  // ?prijsMin=/?prijsMax=-deep-link), de slider daarop initialiseren -- anders
  // reset upd() hieronder 'm meteen weer naar "geen min/max" en gaat de
  // deep-link-waarde alsnog verloren.
  var loIdx=loS.value&&opts.indexOf(loS.value)>=0?opts.indexOf(loS.value):0;
  var hiIdx=hiS.value&&opts.indexOf(hiS.value)>=0?opts.indexOf(hiS.value):mx;
  var wrap=document.createElement('div');wrap.className='rs-wrap';
  var loLbl=escHtml(loS.getAttribute('aria-label')||loId),hiLbl=escHtml(hiS.getAttribute('aria-label')||hiId);
  wrap.innerHTML='<div class="rs-box"><div class="rs-track"><div class="rs-fill" id="rsf-'+loId+'"></div></div>'
    +'<input type="range" class="rs-in" id="rsi-'+loId+'" aria-label="'+loLbl+'" min="0" max="'+mx+'" value="'+loIdx+'" step="1">'
    +'<input type="range" class="rs-in" id="rsi-'+hiId+'" aria-label="'+hiLbl+'" min="0" max="'+mx+'" value="'+hiIdx+'" step="1"></div>'
    +'<div class="rs-label"><span id="rsl-'+loId+'">Geen min</span><span id="rsl-'+hiId+'">Geen max</span></div>';
  loS.style.display='none';hiS.style.display='none';
  loS.parentNode.appendChild(wrap);
  var rLo=document.getElementById('rsi-'+loId),rHi=document.getElementById('rsi-'+hiId);
  var fill=document.getElementById('rsf-'+loId);
  var lblLo=document.getElementById('rsl-'+loId),lblHi=document.getElementById('rsl-'+hiId);
  function upd(fire){
    var lo=+rLo.value,hi=+rHi.value;
    if(lo>hi){rLo.value=hi;rHi.value=lo;lo=+rLo.value;hi=+rHi.value;}
    fill.style.left=(lo/mx*100)+'%';fill.style.width=((hi-lo)/mx*100)+'%';
    lblLo.textContent=lo===0?'Geen min':fmt(opts[lo]);
    lblHi.textContent=hi===mx?'Geen max':fmt(opts[hi]);
    loS.value=lo===0?'':opts[lo];hiS.value=hi===mx?'':opts[hi];
    if(fire&&typeof zoekNu==='function')zoekNu();
  }
  rLo.addEventListener('input',function(){upd(false);});
  rLo.addEventListener('change',function(){upd(true);});
  rHi.addEventListener('input',function(){upd(false);});
  rHi.addEventListener('change',function(){upd(true);});
  upd(false);
  loS._rsSync=function(){var i=opts.indexOf(loS.value);if(i>=0){rLo.value=i;upd(false);}};
  hiS._rsSync=function(){var i=opts.indexOf(hiS.value);if(i>=0){rHi.value=i;upd(false);}};
}
window.addEventListener('load',function(){
  _buildSlider('prijsMin','prijsMax',function(v){return '€ '+Number(v).toLocaleString('nl-NL');});
  _buildSlider('kmMin','kmMax',function(v){return Number(v).toLocaleString('nl-NL')+' km';});
});

var _uf=['merkFilter','modelInput','brandstofFilter','carrosserieFilter','jaarMin','jaarMax','prijsMin','prijsMax','kmMin','kmMax'];
// _toURL schreef hier voorheen de URL terug met de DOM-id zelf als
// parameternaam (bv. "merkFilter"), terwijl elke binnenkomende/gedeelde link
// (marktanalyse-CTA's, generate-occasions.js z'n marktHref, en alles wat
// Google ooit heeft geïndexeerd) de kortere naam gebruikt die
// urlNaarFilters() hierboven leest ("merk"). Gevolg: bij het laden van
// bijvoorbeeld /?merk=audi zette urlNaarFilters() de select correct, maar
// riep daarna zoekNu() aan -- en de zoekNu-wrapper hieronder roept altijd
// eerst _toURL() aan, die de adresbalk meteen herschreef naar
// /?merkFilter=audi. Googlebot's renderer ziet dat als de "uiteindelijke"
// URL na het uitvoeren van JS en rapporteerde daardoor ALLE ?merk=<merk>-
// links in Search Console als "Page with redirect" (65 stuks, ontdekt 13
// sep) -- geen echte HTTP-redirect, maar een JS-URL-mismatch met exact
// hetzelfde effect voor de crawler. _fromURL() blijft bewust ongemoeid: die
// matcht toch al nergens op deze 4 keys (dus geen regressie), en aanpassen
// zou een timing-risico introduceren als merkFilter/carrosserieFilter hun
// <option>-lijst pas later dynamisch vullen.
// De param-naam-mapping komt uit CarkijkerCore.resolveUrlParamNaam() (lib/
// carkijker-core.js) -- dat is de code die eerder de "Page with redirect"-
// bug (#131) veroorzaakte, nu met tests in test/carkijker-core.test.js.
function _toURL(){
  try{
    var p=new URLSearchParams();
    _uf.forEach(function(id){var e=document.getElementById(id);if(e&&e.value)p.set(CarkijkerCore.resolveUrlParamNaam(id),e.value);});
    var zi=document.getElementById('zoekInput');if(zi&&zi.value)p.set('q',zi.value);
    var qs=p.toString();
    history.replaceState(null,'',qs?'?'+qs:location.pathname);
  }catch(ex){}
}
function _fromURL(){
  try{
    var p=new URLSearchParams(location.search);
    ['bust','v','nocache'].forEach(function(k){p.delete(k);});
    if(!p.toString())return;
    _uf.forEach(function(id){
      var v=p.get(id);if(!v)return;
      var e=document.getElementById(id);if(!e)return;
      e.value=v;if(e._rsSync)e._rsSync();
    });
    var q=p.get('q');
    if(q){var zi=document.getElementById('zoekInput');var si=document.getElementById('stickyZoekInput');
      if(zi)zi.value=q;if(si)si.value=q;}
  }catch(ex){}
}
var _origZNu=window.zoekNu;
window.zoekNu=function(){_toURL();return _origZNu.apply(this,arguments);};
_fromURL();

window._toonFavs=false;
function _favN(){return window._favs instanceof Set?window._favs.size:0;}
function _updFavBtn(){
  var b=document.getElementById('favToggleBtn');if(!b)return;
  var n=_favN();
  if(n===0)window._toonFavs=false;
  b.style.display=n>0?'inline-flex':'none';
  b.textContent=(window._toonFavs?'♥':'♡')+' Favorieten'+(n?' ('+n+')':'');
  b.classList.toggle('aktief',window._toonFavs);
}
var _origTF=window.toggleFav;
window.toggleFav=function(e,id){
  var r=_origTF?_origTF.apply(this,arguments):undefined;
  _updFavBtn();
  if(window._toonFavs&&typeof zoekNu==='function')zoekNu();
  return r;
};
var _origZNf=window.zoekNu;
window.zoekNu=function(){
  if(window._toonFavs&&window._favs instanceof Set&&window._favs.size>0){
    var orig=window._alleAutos;
    window._alleAutos=(orig||[]).filter(function(a){return window._favs.has(a.id);});
    var r=_origZNf.apply(this,arguments);
    window._alleAutos=orig;return r;
  }
  return _origZNf.apply(this,arguments);
};
}());
