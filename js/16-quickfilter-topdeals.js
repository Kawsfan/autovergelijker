
(function(){
  window._toonTopDeals=false;
  var _otd=window.toonResultaten;
  window.toonResultaten=function(lijst){
    if(window._toonTopDeals&&lijst&&lijst.length){
      var _pr=lijst.map(function(a){return a.prijs;}).filter(Boolean).sort(function(a,b){return a-b;});
      var _med=_pr[Math.floor(_pr.length/2)]||25000;
      var _hj=new Date().getFullYear();
      lijst=lijst.filter(function(a){return a.prijs>5000&&a.prijs<_med*0.95&&a.jaar>=2008&&a.km>10000&&a.km<220000;}).map(function(a){var _p=Math.max(0,(_med-a.prijs)/_med),_l=Math.max(1,_hj-a.jaar),_k=Math.max(0,1-a.km/(_l*15000)),_j=Math.max(0,Math.min(1,(a.jaar-2005)/(_hj-2005)));a._ds2=0.4*_p+0.4*_k+0.2*_j;return a;}).sort(function(a,b){return b._ds2-a._ds2;});
    }
    return _otd.apply(this,[lijst]);
  };
  function _addTDBtn(){
    if(document.getElementById('topDealsBtn'))return;
    var btn=document.createElement('button');
    btn.id='topDealsBtn';btn.innerHTML='🏆 Top Deals';
    btn.addEventListener('click',function(){window._toonTopDeals=!window._toonTopDeals;btn.classList.toggle('aktief',window._toonTopDeals);window._pagina=1;window.zoekNu();});
    // Zelfde .quick-btns-vak als Prijsdaling (zie _quickFilterWrap hierboven) --
    // val terug op de oude losse-knop-plaatsing als die functie om wat voor
    // reden dan ook nog niet gedraaid heeft.
    var qb=document.querySelector('#quickFilterWrap .quick-btns');
    if(qb){qb.appendChild(btn);return;}
    var pd=document.getElementById('prijsdalingBtn');
    if(pd&&pd.parentNode){pd.parentNode.insertBefore(btn,pd.nextSibling);}
    else{var _k=document.getElementById('kmMin'),_ki=_k&&_k.closest('.filter-range,.filter-item');if(_ki&&_ki.parentNode)_ki.parentNode.insertBefore(btn,_ki.nextSibling);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_addTDBtn);
  else setTimeout(_addTDBtn,300);
}());
