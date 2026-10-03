
// === Bottom sheet ===
function openSheet(){
  var fc=document.querySelector('.filter-kaart');
  var bd=document.getElementById('sheetBackdrop');
  if(!fc)return;
  fc.classList.add('sheet-open');
  if(bd)bd.classList.add('aktief');
  document.body.style.overflow='hidden';
}
function closeSheet(){
  var fc=document.querySelector('.filter-kaart');
  var bd=document.getElementById('sheetBackdrop');
  if(!fc)return;
  fc.classList.remove('sheet-open');
  if(bd)bd.classList.remove('aktief');
  document.body.style.overflow='';
}
// === Active filter chips ===
var _chipDefs=[
  {id:'merkFilter',fn:function(v){return v;}},
  {id:'modelInput',fn:function(v){return v;}},
  {id:'brandstofFilter',fn:function(v){return v;}},
  {id:'carrosserieFilter',fn:function(v){return v;}},
  {id:'jaarMin',fn:function(v){return 'Vanaf '+v;}},
  {id:'jaarMax',fn:function(v){return 't/m '+v;}},
  {id:'prijsMin',fn:function(v){return '\u2265 \u20ac'+Number(v).toLocaleString('nl-NL');}},
  {id:'prijsMax',fn:function(v){return '\u2264 \u20ac'+Number(v).toLocaleString('nl-NL');}},
  {id:'kmMin',fn:function(v){return '\u2265 '+Number(v).toLocaleString('nl-NL')+'km'+';'}},
  {id:'kmMax',fn:function(v){return '\u2264 '+Number(v).toLocaleString('nl-NL')+'km';}},
];
function _updateChips(){
  var c=document.getElementById('activeChips');
  if(!c)return;
  var active=[];
  _chipDefs.forEach(function(d){
    var el=document.getElementById(d.id);
    if(el&&el.value)active.push({id:d.id,lbl:d.fn(el.value)});
  });
  c.innerHTML=active.map(function(a){
    return '<button class="actief-chip"><span>'+a.lbl+'</span><button class="actief-chip-x" onclick="_clearChip(\''+ a.id +'\')">&times;</button></button>';
  }).join('');
  var badge=document.getElementById('mobileOpenBadge');
  if(badge){badge.textContent=active.length>0?' '+active.length:'';badge.className=active.length>0?'zichtbaar':''}
}
function _clearChip(fid){
  var el=document.getElementById(fid);
  if(el)el.value='';
  if(typeof zoekNu==='function')zoekNu();
}
// Observer: update chips on search results change
window.addEventListener('load',function(){
  var ag=document.getElementById('autoGrid');
  if(ag){new MutationObserver(function(){_updateChips();}).observe(ag,{childList:true});}
  // Also update chips on filter changes
  ['merkFilter','modelInput','brandstofFilter','carrosserieFilter','jaarMin','jaarMax','prijsMin','prijsMax','kmMin','kmMax'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('change',function(){setTimeout(_updateChips,50);});
  });
  var zi=document.getElementById('zoekInput');
  if(zi)zi.addEventListener('input',function(){
    var st=document.getElementById('stickySearchText');
    if(st)st.textContent=zi.value||'Zoek op merk, model of trefwoord';
  });
});
