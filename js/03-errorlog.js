
  (function(){
    if (typeof window.SUPABASE_URL !== 'string' || window.SUPABASE_URL.indexOf('VUL_HIER') === 0) return;

    var _gezien = Object.create(null);
    var _teller = 0;
    var MAX_PER_PAGINA = 20;

    function _logFout(payload){
      if (_teller >= MAX_PER_PAGINA) return;
      var sleutel = payload.message + '|' + payload.filename + '|' + payload.lineno;
      if (_gezien[sleutel]) return;
      _gezien[sleutel] = true;
      _teller++;
      fetch(window.SUPABASE_URL + '/rest/v1/client_errors', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).catch(function(){});
    }

    window.addEventListener('error', function(e){
      // Cross-origin scripts (browserextensies, adblockers e.d.) geven een
      // contentloos "Script error." zonder bestand/regel -- daar is niets
      // aan te diagnosticeren, dus die loggen we bewust niet. Zonder
      // capture:true (default hier) vallen ook mislukte <img>/<script>-
      // resource-loads al buiten dit event, dat is gewenst: die worden al
      // netjes afgehandeld door de eigen onerror-handlers per element.
      if (!e || (e.message === 'Script error.' && !e.filename)) return;
      var bestand = e.filename || '';
      if (bestand.indexOf('extension://') !== -1) return;
      _logFout({
        message: String(e.message || 'onbekende fout').slice(0, 500),
        stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 2000) : null,
        filename: bestand.slice(0, 500) || null,
        lineno: typeof e.lineno === 'number' ? e.lineno : null,
        colno: typeof e.colno === 'number' ? e.colno : null,
        page_url: location.href,
        user_agent: navigator.userAgent
      });
    });

    window.addEventListener('unhandledrejection', function(e){
      var reden = e && e.reason;
      var bericht = reden instanceof Error ? reden.message : String(reden);
      _logFout({
        message: ('Unhandled promise rejection: ' + bericht).slice(0, 500),
        stack: reden instanceof Error && reden.stack ? String(reden.stack).slice(0, 2000) : null,
        filename: null,
        lineno: null,
        colno: null,
        page_url: location.href,
        user_agent: navigator.userAgent
      });
    });
  })();
  