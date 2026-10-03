
// === Detail panel enhancements ===
(function() {
  // MutationObserver: fires when detailInhoud gets content (after galRender)
  var _obs = new MutationObserver(function() {
    var btn = document.querySelector('#detailInhoud .btn-mp');
    var footer = document.getElementById('detailFooter');
    if (!footer) return;
    if (btn && btn.href) {
      // Populate sticky footer
      footer.innerHTML = '<a class="btn-mp" href="' + btn.href + '" target="_blank" rel="noopener noreferrer">Bekijk op ' + (btn.textContent.includes('Markt') ? 'Marktplaats' : 'advertentie') + ' →</a><a href="/tco/" style="display:flex;align-items:center;justify-content:center;margin-top:8px;padding:10px;font-size:13px;font-weight:600;color:#e84c15;text-decoration:none;border:1.5px solid #e84c15;border-radius:10px;">⛽ Bereken TCO voor deze auto →</a>';
      footer.className = 'aktief';
      // Fix iOS: clear body overflow so panel can scroll
      document.body.style.overflow = '';
    } else if (!btn) {
      footer.className = '';
      footer.innerHTML = '';
    }
  });

  // Wrap sluitDetail to also reset body overflow
  window.addEventListener('load', function() {
    var di = document.getElementById('detailInhoud');
    if (di) _obs.observe(di, { childList: true, subtree: false });

    // Swipe-to-dismiss on detail panel
    var panel = document.getElementById('detailPanel');
    if (!panel) return;
    var sx, sy;
    panel.addEventListener('touchstart', function(e) {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    panel.addEventListener('touchmove', function(e) {
      var dx = e.touches[0].clientX - sx;
      if (dx > 0) panel.style.transform = 'translateX(' + Math.min(dx, 220) + 'px)';
    }, { passive: true });
    panel.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = Math.abs(e.changedTouches[0].clientY - sy);
      panel.style.transform = '';
      if (dx > 80 && dy < 80 && typeof sluitDetail === 'function') sluitDetail();
    }, { passive: true });

    // Patch sluitDetail to reset body overflow
    var _origSD = window.sluitDetail;
    if (typeof _origSD === 'function') {
      window.sluitDetail = function() {
        _origSD.apply(this, arguments);
        document.body.style.overflow = '';
      };
    }
  });
}());
function _initDetailSwipe() {}
