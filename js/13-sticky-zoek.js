
// === Performance + UX helpers ===
var _dZoekTimer;
function _dZoek() {
  clearTimeout(_dZoekTimer);
  // Sync to sticky bar input
  var si = document.getElementById('stickyZoekInput');
  var zi = document.getElementById('zoekInput');
  if (si && zi) si.value = zi.value;
  _dZoekTimer = setTimeout(function(){ if(typeof zoekNu==='function') zoekNu(); }, 50);
}
function _syncStickyZoek(val) {
  var zi = document.getElementById('zoekInput');
  if (zi) zi.value = val;
  clearTimeout(_dZoekTimer);
  _dZoekTimer = setTimeout(function(){ if(typeof zoekNu==='function') zoekNu(); }, 50);
  // Update chips
  if (typeof _updateChips === 'function') _updateChips();
}
// Keep sticky input in sync when filters change
window.addEventListener('load', function() {
  var zi = document.getElementById('zoekInput');
  var si = document.getElementById('stickyZoekInput');
  if (zi && si) {
    // Sync sticky → main on focus (show current value)
    si.addEventListener('focus', function() { si.value = zi.value; });
    // Clicking sticky area: just focus the input
    document.getElementById('mobileStickySearch') && (document.getElementById('mobileStickySearch').onclick = null);
  }
  // Also debounce the filter selects that directly call zoekNu
  ['merkFilter','modelInput','brandstofFilter','carrosserieFilter','jaarMin','jaarMax','prijsMin','prijsMax','kmMin','kmMax'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function(){ clearTimeout(_dZoekTimer); _dZoekTimer = setTimeout(function(){ if(typeof zoekNu==='function')zoekNu(); },30); });
  });
});
