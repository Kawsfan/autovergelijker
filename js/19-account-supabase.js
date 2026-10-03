
// ===== ACCOUNTS: favorieten + zoekagenten synchroniseren (Supabase) =====
// Volledig additief: zolang SUPABASE_URL/ANON_KEY niet zijn ingevuld (zie
// <head>) doet dit blok he­lemaal niets -- geen login-knop, geen requests,
// de site werkt precies zoals voorheen met lokale (per-browser) opslag.
// Eenmaal ingelogd blijft localStorage de directe, razendsnelle bron voor de
// UI (favorieten/zoekagenten lezen/schrijven zoals altijd), en synct deze
// laag er in de achtergrond mee met Supabase -- nooit blokkerend, nooit
// destructief (nieuwe cloud-data wordt toegevoegd, nooit stilzwijgend
// verwijderd).
(function(){
  function _sbGeconfigureerd(){
    return typeof window.SUPABASE_URL === 'string' && window.SUPABASE_URL.indexOf('VUL_HIER') !== 0
      && typeof window.supabase !== 'undefined';
  }
  if (!_sbGeconfigureerd()) {
    // URL/key zijn wel ingevuld maar de SDK is niet geladen (CDN-request
    // mislukt, geblokkeerd, of nog bezig) -- dat mag niet stilzwijgend de
    // login-knop verbergen zonder enig spoor, anders lijkt de accounts-laag
    // gewoon niet te bestaan i.p.v. kapot.
    if (typeof window.SUPABASE_URL === 'string' && window.SUPABASE_URL.indexOf('VUL_HIER') !== 0 && typeof window.supabase === 'undefined') {
      console.warn('Carkijker-accounts: SUPABASE_URL is ingesteld maar de Supabase-SDK (cdn.jsdelivr.net) is niet geladen -- login blijft verborgen. Check of het script-tag in <head> laadt (netwerktabblad/adblocker).');
    }
    return;
  }

  var _sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  var _gebruiker = null;

  function _accountMsg(tekst){ var el = document.getElementById('accountMsg'); if (el) el.textContent = tekst || ''; }

  // Welk sub-formulier zichtbaar is binnen de modal (login/registreren/
  // wachtwoordVergeten/nieuwWachtwoord/ingelogd) -- los van of Supabase zelf
  // een sessie heeft, want "wachtwoord vergeten" en "registreren" moeten ook
  // te zien zijn terwijl er nog niemand is ingelogd.
  window.accountToonModus = function(modus){
    ['accountLogin','accountRegistreren','accountWachtwoordVergeten','accountNieuwWachtwoord','accountIngelogd'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var target = document.getElementById('account' + modus.charAt(0).toUpperCase() + modus.slice(1));
    if (target) target.style.display = '';
    _accountMsg('');
    // Funnel-zichtbaarheid (was volledig blind): alleen 'registreren' is
    // hier interessant -- dat wordt uitsluitend vanuit de expliciete "Account
    // aanmaken"-link aangeroepen (niet vanuit _updAccountUI's automatische
    // login/ingelogd-switches), dus dit meet echte gebruikersintentie.
    if (modus === 'registreren') gtag('event', 'signup_view');
  };

  function _updAccountUI(){
    var navBtn = document.getElementById('accountNavBtn');
    var navTxt = document.getElementById('accountNavTxt');
    if (navBtn) navBtn.style.display = '';
    if (_gebruiker) {
      if (navTxt) navTxt.textContent = ' ' + _gebruiker.email.split('@')[0];
      var emailEl = document.getElementById('accountEmailWeergave');
      if (emailEl) emailEl.textContent = _gebruiker.email;
      window.accountToonModus('ingelogd');
      _updPushBtn();
    } else {
      if (navTxt) navTxt.textContent = ' Inloggen';
      window.accountToonModus('login');
    }
  }

  // ── Pushmeldingen (favorieten-prijsdalingen, nieuwe zoekagent-matches) ──
  // Volledig additief, net als de rest van deze accounts-laag: browsers
  // zonder Push API (bv. Safari op iOS buiten een geïnstalleerde PWA) tonen
  // gewoon geen werkende knop i.p.v. een fout. VAPID_PUBLIC_KEY (zie <head>)
  // moet Uint8Array zijn voor pushManager.subscribe() -- de browser accepteert
  // geen base64url-string rechtstreeks.
  function _urlBase64ToUint8Array(base64String){
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function _pushOndersteund(){
    return 'serviceWorker' in navigator && 'PushManager' in window
      && typeof window.VAPID_PUBLIC_KEY === 'string' && window.VAPID_PUBLIC_KEY.length > 0;
  }
  function _updPushBtn(sub){
    var btn = document.getElementById('accountPushBtn');
    if (!btn) return;
    if (!_pushOndersteund()) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    if (sub !== undefined) { _huidigeSub = sub; }
    btn.textContent = _huidigeSub ? '🔕 Pushmeldingen uitschakelen' : '🔔 Pushmeldingen inschakelen';
  }
  var _huidigeSub = null;
  function _pushHuidigAbonnement(){
    return navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); });
  }
  // Ververst de knoptekst bij het openen van de modal (bv. na inschakelen op
  // een ander apparaat) i.p.v. te vertrouwen op de state van dít bezoek alleen.
  function _verversPushBtn(){
    if (!_gebruiker || !_pushOndersteund()) return;
    _pushHuidigAbonnement().then(_updPushBtn).catch(function(){});
  }
  window.accountPushStatusVerversen = _verversPushBtn;
  window.accountPushToggle = function(){
    if (!_gebruiker || !_pushOndersteund()) return;
    var btn = document.getElementById('accountPushBtn');
    if (btn) btn.disabled = true;
    _pushHuidigAbonnement().then(function(sub){
      if (sub) {
        // Uitschakelen: eerst de cloud-rij verwijderen (endpoint is de sleutel,
        // niet afhankelijk van of unsubscribe() lokaal slaagt), dan pas lokaal
        // unsubscriben -- zo blijft er nooit een dode rij achter als de laatste
        // stap om wat voor reden dan ook faalt.
        return _sb.from('push_subscriptions').delete().eq('user_id', _gebruiker.id).eq('endpoint', sub.endpoint)
          .then(function(){ return sub.unsubscribe(); })
          .then(function(){ _updPushBtn(null); gtag('event', 'push_uitgeschakeld'); });
      }
      if (Notification.permission === 'denied') {
        _accountMsg('Meldingen staan uitgeschakeld voor deze site in je browserinstellingen.');
        return;
      }
      return Notification.requestPermission().then(function(permissie){
        if (permissie !== 'granted') { gtag('event', 'push_toestemming_geweigerd'); return; }
        return navigator.serviceWorker.ready.then(function(reg){
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: _urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY) });
        }).then(function(nieuweSub){
          var json = nieuweSub.toJSON();
          return _sb.from('push_subscriptions').upsert({
            user_id: _gebruiker.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
          }, { onConflict: 'user_id,endpoint' }).then(function(){ _updPushBtn(nieuweSub); gtag('event', 'push_ingeschakeld'); });
        });
      });
    }).catch(function(e){ console.warn('Pushmeldingen in-/uitschakelen mislukt:', e.message); _accountMsg('Pushmeldingen aanpassen is niet gelukt: ' + e.message); })
      .then(function(){ if (btn) btn.disabled = false; });
  };

  // ── Favorieten synchroniseren ──
  // Upload eerst wat lokaal staat maar nog niet in de cloud, haal daarna de
  // (nu complete) lijst op en maak dat de lokale waarheid -- zo gaat er nooit
  // een favoriet verloren, ook niet bij inloggen op een tweede apparaat.
  function _syncFavorieten(){
    var lokaal = (window._favs instanceof Set) ? Array.from(window._favs) : [];
    var upload = lokaal.length
      ? _sb.from('favorites').upsert(lokaal.map(function(id){ return { user_id: _gebruiker.id, listing_id: id }; }), { onConflict: 'user_id,listing_id' })
      : Promise.resolve();
    return Promise.resolve(upload).then(function(){
      return _sb.from('favorites').select('listing_id').eq('user_id', _gebruiker.id);
    }).then(function(res){
      if (!res || !res.data) return;
      window._favs = new Set(res.data.map(function(r){ return r.listing_id; }));
      localStorage.setItem('_av_favs', JSON.stringify(Array.from(window._favs)));
      if (typeof _updFavBtn === 'function') _updFavBtn();
      var c = document.getElementById('navFavCount');
      if (c) { c.textContent = window._favs.size || ''; c.style.display = window._favs.size ? 'inline' : 'none'; }
    }).catch(function(e){ console.warn('Favorieten synchroniseren mislukt:', e.message); });
  }

  // ── Zoekagenten synchroniseren ──
  // Elk lokaal agent-object krijgt een _cloudId zodra het een keer met
  // Supabase is gesynct, zodat een latere verwijdering ook de juiste rij in
  // de database raakt.
  function _syncZoekagenten(){
    var lokaal = _agenten();
    var lokaalPerCloudId = {};
    lokaal.forEach(function(a){ if (a._cloudId) lokaalPerCloudId[a._cloudId] = a; });
    var nieuwe = lokaal.filter(function(a){ return !a._cloudId; });
    var inserts = nieuwe.map(function(a){
      return _sb.from('zoekagenten').insert({
        user_id: _gebruiker.id, label: a.label, merk: a.merk || null, model: a.model || null, q: a.q || null,
        jaar_min: a.jaarMin || null, jaar_max: a.jaarMax || null,
        min_prijs: a.minPrijs, max_prijs: a.maxPrijs,
        km_min: a.kmMin || null, km_max: a.kmMax || null,
        brandstof: a.brandstof || null, carrosserie: a.carrosserie || null, transmissie: a.transmissie || null,
        opgeslagen_op: a.opgeslagenOp || null
      }).select().then(function(res){
        if (res && res.data && res.data[0]) a._cloudId = res.data[0].id;
      });
    });
    return Promise.all(inserts).then(function(){
      return _sb.from('zoekagenten').select('*').eq('user_id', _gebruiker.id).order('created_at');
    }).then(function(res){
      if (!res || !res.data) return;
      var lijst = res.data.map(function(r){
        // De cloud-rij draagt sinds de zoekagenten-kolommenmigratie (okt '26,
        // zie supabase/schema.sql) ook model/jaar/km/brandstof/carrosserie/
        // transmissie -- cloud is hierna de bron van waarheid voor alle
        // filtercriteria, net als merk/q/prijzen dat al waren. nieuwOngezien
        // blijft bewust lokaal/afgeleid (badge-teller, geen filtercriterium);
        // Object.assign hieronder behoudt 'm gewoon als die al lokaal stond.
        var basis = lokaalPerCloudId[r.id] ? Object.assign({}, lokaalPerCloudId[r.id]) : {};
        basis.label = r.label; basis.merk = r.merk; basis.model = r.model; basis.q = r.q;
        basis.jaarMin = r.jaar_min; basis.jaarMax = r.jaar_max;
        basis.minPrijs = r.min_prijs; basis.maxPrijs = r.max_prijs;
        basis.kmMin = r.km_min; basis.kmMax = r.km_max;
        basis.brandstof = r.brandstof; basis.carrosserie = r.carrosserie; basis.transmissie = r.transmissie;
        basis.opgeslagenOp = r.opgeslagen_op; basis.gezieneIds = r.gezien_ids || [];
        basis._cloudId = r.id;
        return basis;
      });
      localStorage.setItem('zoekagenten', JSON.stringify(lijst));
      if (typeof renderAgentList === 'function') renderAgentList();
    }).catch(function(e){ console.warn('Zoekagenten synchroniseren mislukt:', e.message); });
  }

  function _syncAlles(){
    if (!_gebruiker) return;
    _syncFavorieten();
    _syncZoekagenten();
  }

  // ── Inloggen / registreren / wachtwoord vergeten / uitloggen ──
  window.accountInloggen = function(){
    var email = (document.getElementById('accountLoginEmail')||{}).value.trim();
    var ww = (document.getElementById('accountLoginWw')||{}).value;
    if (!email || !ww) { _accountMsg('Vul e-mailadres en wachtwoord in.'); return; }
    _accountMsg('Bezig met inloggen...');
    gtag('event', 'login_attempt');
    _sb.auth.signInWithPassword({ email: email, password: ww }).then(function(res){
      // error.message van Supabase is een generieke tekst (bv. "Invalid login
      // credentials") -- geen e-mailadres of andere PII, dus veilig als
      // event-parameter. Dit is de enige plek waar we nu kunnen zíen dat
      // bezoekers hier vastlopen i.p.v. het pas te horen via een screenshot.
      if (res.error) { _accountMsg('Inloggen mislukt: ' + res.error.message); gtag('event', 'login_error', { error_message: res.error.message }); return; }
    }).catch(function(e){ _accountMsg('Inloggen mislukt: ' + e.message); gtag('event', 'login_error', { error_message: e.message }); });
  };

  window.accountRegistrerenVerstuur = function(){
    var email = (document.getElementById('accountRegEmail')||{}).value.trim();
    var ww = (document.getElementById('accountRegWw')||{}).value;
    if (!email || !ww) { _accountMsg('Vul e-mailadres en wachtwoord in.'); return; }
    if (ww.length < 6) { _accountMsg('Wachtwoord moet minstens 6 tekens zijn.'); return; }
    _accountMsg('Account aanmaken...');
    gtag('event', 'signup_attempt');
    _sb.auth.signUp({ email: email, password: ww, options: { emailRedirectTo: location.origin + location.pathname } }).then(function(res){
      if (res.error) { _accountMsg('Aanmaken mislukt: ' + res.error.message); gtag('event', 'signup_error', { error_message: res.error.message }); return; }
      // Als e-mailbevestiging aanstaat in het Supabase-project levert signUp()
      // nog geen sessie op -- dan moet de gebruiker eerst de bevestigingsmail
      // openen. Staat het uit, dan is res.data.session meteen gevuld en pikt
      // onAuthStateChange (SIGNED_IN) de rest vanzelf op.
      if (!(res.data && res.data.session)) {
        _accountMsg('Check je e-mail (' + email + ') om je account te bevestigen.');
        gtag('event', 'signup_pending_confirmation');
      } else {
        gtag('event', 'signup_success');
      }
    }).catch(function(e){ _accountMsg('Aanmaken mislukt: ' + e.message); gtag('event', 'signup_error', { error_message: e.message }); });
  };

  window.accountResetVerstuur = function(){
    var email = (document.getElementById('accountResetEmail')||{}).value.trim();
    if (!email) { _accountMsg('Vul een e-mailadres in.'); return; }
    _accountMsg('Bezig met versturen...');
    _sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function(res){
      if (res.error) { _accountMsg('Kon geen resetlink versturen: ' + res.error.message); return; }
      _accountMsg('Check je e-mail (' + email + ') voor de resetlink!');
    }).catch(function(e){ _accountMsg('Kon geen resetlink versturen: ' + e.message); });
  };

  window.accountNieuwWachtwoordVerstuur = function(){
    var ww = (document.getElementById('accountNieuwWw')||{}).value;
    if (!ww || ww.length < 6) { _accountMsg('Wachtwoord moet minstens 6 tekens zijn.'); return; }
    _accountMsg('Bezig met opslaan...');
    _sb.auth.updateUser({ password: ww }).then(function(res){
      if (res.error) { _accountMsg('Opslaan mislukt: ' + res.error.message); return; }
      _accountMsg('Wachtwoord ingesteld!');
      window.accountToonModus('ingelogd');
    }).catch(function(e){ _accountMsg('Opslaan mislukt: ' + e.message); });
  };

  window.accountUitloggen = function(){
    _sb.auth.signOut().then(function(){
      document.getElementById('accountModal').style.display = 'none';
    });
  };

  _sb.auth.onAuthStateChange(function(event, session){
    _gebruiker = session ? session.user : null;
    if (event === 'PASSWORD_RECOVERY') {
      // Gebruiker kwam net van de reset-wachtwoord-link in de mail -- forceer
      // het "nieuw wachtwoord instellen"-formulier open, ongeacht wat er
      // daarvoor in de modal stond, en open de modal zelf ook meteen (die
      // staat na een verse pagina-load standaard dicht).
      _updAccountUI();
      window.accountToonModus('nieuwWachtwoord');
      var modal = document.getElementById('accountModal');
      if (modal) modal.style.display = 'flex';
      return;
    }
    _updAccountUI();
    if (event === 'SIGNED_IN') { _syncAlles(); }
  });
  _sb.auth.getSession().then(function(res){
    _gebruiker = res.data && res.data.session ? res.data.session.user : null;
    _updAccountUI();
    if (_gebruiker) _syncAlles();
  });

  // ── Bestaande favorieten/zoekagenten-functies aanhaken zodra Supabase
  // klaar is, zodat elke wijziging ook meteen (niet-blokkerend) naar de
  // cloud gaat. Volgt hetzelfde monkey-patch-patroon als de rest van de
  // site (zie de favorieten-/prijsdaling-IIFE's hierboven). ──
  var _origToggleFav = window.toggleFav;
  window.toggleFav = function(event, id){
    var r = _origToggleFav.apply(this, arguments);
    if (_gebruiker) {
      var actief = window._favs instanceof Set && window._favs.has(id);
      var q = actief
        ? _sb.from('favorites').upsert({ user_id: _gebruiker.id, listing_id: id }, { onConflict: 'user_id,listing_id' })
        : _sb.from('favorites').delete().eq('user_id', _gebruiker.id).eq('listing_id', id);
      Promise.resolve(q).catch(function(e){ console.warn('Favoriet synchroniseren mislukt:', e.message); });
    }
    return r;
  };

  var _origSlaZoekagentOp = window.slaZoekagentOp;
  window.slaZoekagentOp = function(){
    var r = _origSlaZoekagentOp.apply(this, arguments);
    if (_gebruiker) {
      var lijst = _agenten();
      // slaZoekagentOp() kan nu ook een bestaande agent OP DE PLEK overschrijven
      // (bewerken), niet alleen aan het eind toevoegen -- window._laatstOpgeslagenAgentIndex
      // wijst naar de daadwerkelijk geschreven rij i.p.v. altijd lijst[lijst.length-1]
      // aan te nemen (dat zou bij het bewerken van een oudere agent de verkeerde,
      // laatste agent in de cloud bijwerken).
      var idx = (typeof window._laatstOpgeslagenAgentIndex === 'number') ? window._laatstOpgeslagenAgentIndex : lijst.length - 1;
      var target = lijst[idx];
      if (target) {
        var payload = {
          label: target.label, merk: target.merk || null, model: target.model || null, q: target.q || null,
          jaar_min: target.jaarMin || null, jaar_max: target.jaarMax || null,
          min_prijs: target.minPrijs, max_prijs: target.maxPrijs,
          km_min: target.kmMin || null, km_max: target.kmMax || null,
          brandstof: target.brandstof || null, carrosserie: target.carrosserie || null, transmissie: target.transmissie || null,
          opgeslagen_op: target.opgeslagenOp || null
        };
        if (target._cloudId) {
          _sb.from('zoekagenten').update(payload).eq('id', target._cloudId).catch(function(e){ console.warn('Zoekagent bijwerken mislukt in cloud:', e.message); });
        } else {
          _sb.from('zoekagenten').insert(Object.assign({ user_id: _gebruiker.id }, payload)).select().then(function(res){
            if (res && res.data && res.data[0]) { target._cloudId = res.data[0].id; localStorage.setItem('zoekagenten', JSON.stringify(lijst)); }
          }).catch(function(e){ console.warn('Zoekagent synchroniseren mislukt:', e.message); });
        }
      }
    }
    return r;
  };

  var _origVerwijderAgent = window.verwijderAgent;
  window.verwijderAgent = function(i){
    var lijst = _agenten();
    var target = lijst[i];
    var r = _origVerwijderAgent.apply(this, arguments);
    if (_gebruiker && target && target._cloudId) {
      _sb.from('zoekagenten').delete().eq('id', target._cloudId).catch(function(e){ console.warn('Zoekagent verwijderen mislukt in cloud:', e.message); });
    }
    return r;
  };
})();
