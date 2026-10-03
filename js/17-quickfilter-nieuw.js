
(function(){
  // Snelfilter-tegenhanger van het NIEUW-badge hierboven: alleen advertenties
  // die vandaag voor het eerst gescraped zijn (a.eersteGezien), niet "nog
  // steeds actief, net weer bevestigd" -- zelfde onderscheid als bij het
  // badge. Zelfde toggle-patroon als Prijsdaling/Top Deals hierboven.
  window._toonNieuw=false;
  var _origTRnw=window.toonResultaten;
  window.toonResultaten=function(lijst){
    if(window._toonNieuw&&lijst&&lijst.length){
      lijst=lijst.filter(function(a){return a.eersteGezien===VANDAAG;});
    }
    return _origTRnw.apply(this,[lijst]);
  };
  function _addNieuwBtn(){
    if(document.getElementById('nieuwFilterBtn'))return;
    var btn=document.createElement('button');
    btn.id='nieuwFilterBtn';btn.innerHTML='✨ Nieuw';
    btn.addEventListener('click',function(){window._toonNieuw=!window._toonNieuw;btn.classList.toggle('aktief',window._toonNieuw);window._pagina=1;window.zoekNu();});
    // Zelfde .quick-btns-vak als Prijsdaling/Top Deals hierboven.
    var qb=document.querySelector('#quickFilterWrap .quick-btns');
    if(qb){qb.appendChild(btn);return;}
    var td=document.getElementById('topDealsBtn');
    if(td&&td.parentNode){td.parentNode.insertBefore(btn,td.nextSibling);}
    else{var _k=document.getElementById('kmMin'),_ki=_k&&_k.closest('.filter-range,.filter-item');if(_ki&&_ki.parentNode)_ki.parentNode.insertBefore(btn,_ki.nextSibling);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_addNieuwBtn);
  else setTimeout(_addNieuwBtn,300);
}());
