
// marked.min.js wordt hieronder pas dynamisch geladen zodra de info-modal
// voor het eerst opent (i.p.v. een blokkerend <script src> midden in de
// pagina) -- het is alleen nodig voor die ene modal, dus hoeft de rest van
// de pagina niet op te houden bij het laden/parsen.
function _laadMarked() {
  if (window.marked) return Promise.resolve();
  if (window._markedLaadPromise) return window._markedLaadPromise;
  window._markedLaadPromise = new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window._markedLaadPromise;
}
function openInfo() {
  var modal = document.getElementById('infoModal');
  modal.style.display = 'flex';
  if (!window._readmeLoaded) {
    Promise.all([
      _laadMarked(),
      fetch('/README.md').then(function(r){ return r.text(); })
    ]).then(function(resultaten){
        var md = resultaten[1];
        document.getElementById('markdownBody').innerHTML = marked.parse(md);
        window._readmeLoaded = true;
      });
  }
}
function closeInfo() { document.getElementById('infoModal').style.display = 'none'; }
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeInfo(); });
