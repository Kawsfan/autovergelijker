
(function(){
  window._toonPrijsDaling=false;
  var _origTRpd=window.toonResultaten;
  window.toonResultaten=function(lijst){
    if(window._toonPrijsDaling&&lijst&&lijst.length){
      lijst=lijst.filter(function(a){return a.prijsHistorie&&a.prijsHistorie.length>0&&a.prijsHistorie.some(function(h){return h.prijs>a.prijs;});});
    }
    return _origTRpd.apply(this,[lijst]);
  };
  function _quickFilterWrap(){
    var wrap=document.getElementById("quickFilterWrap");
    if(wrap)return wrap;
    wrap=document.createElement("div");
    wrap.id="quickFilterWrap";
    wrap.className="filter-item filter-quick";
    wrap.innerHTML='<label>Snelfilters</label><div class="quick-btns"></div>';
    var kmItem=document.getElementById("kmMin")&&document.getElementById("kmMin").closest(".filter-range,.filter-item");
    if(kmItem&&kmItem.parentNode){kmItem.parentNode.insertBefore(wrap,kmItem.nextSibling);}
    else{var fbtn=document.getElementById("favToggleBtn");if(fbtn&&fbtn.parentNode)fbtn.parentNode.insertBefore(wrap,fbtn.nextSibling);}
    return wrap;
  }
  function _addPrijsdalingBtn(){
    var existing=document.getElementById("prijsdalingBtn");
    if(existing)return;
    var btn=document.createElement("button");
    btn.id="prijsdalingBtn";
    btn.innerHTML="&#128201; Prijsdaling";
    btn.addEventListener("click",function(){
      window._toonPrijsDaling=!window._toonPrijsDaling;
      btn.classList.toggle("aktief",window._toonPrijsDaling);
      window._pagina=1;window.zoekNu();
    });
    _quickFilterWrap().querySelector(".quick-btns").appendChild(btn);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",_addPrijsdalingBtn);
  else setTimeout(_addPrijsdalingBtn,300);
}());
