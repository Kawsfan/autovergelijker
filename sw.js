// v2->v3 / data-v1->v2 (19 aug 2026): cache-busting na de scraper-storing
// (#89) + de cutoff-verlaging van 30 naar 2 dagen, die in één klap het
// aanbod van ~42k naar ~12k opschoonde. listings.json wordt hieronder
// cache-first (stale-while-revalidate) bediend -- "cached||fetchPromise"
// geeft een bestaande cache-entry altijd meteen terug, de netwerkfetch
// ververst 'm alleen voor de VOLGENDE keer. Terugkerende bezoekers met een
// cache van vóór deze opschoning zagen daardoor nog dagenlang de inmiddels
// verwijderde/verlopen advertenties. Nieuwe cache-namen forceren een verse
// fetch bij iedereen op het eerstvolgende bezoek.
const CACHE = "carkijker-v3";
const CACHE_DATA = "carkijker-data-v2";
const STATIC = ["/","/index.html"];

self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(STATIC);}));
  self.skipWaiting();
});

self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE&&k!==CACHE_DATA;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});

self.addEventListener("fetch",function(e){
  var url=new URL(e.request.url);
  var path=url.pathname;

  // Data files: stale-while-revalidate
  // "/data/listings-lean.json" (zonder chunk-index) matchte hier nooit een
  // echt bestand -- de site laadt sinds de chunk-opsplitsing altijd
  // listings-lean-0.json t/m -3.json (zie window._laadVolledig in
  // index.html), dus deze regel cachete in de praktijk niets. Gevonden
  // terwijl dit bestand toch al open stond voor de pushmeldingen hieronder.
  if(path.includes("/data/listings-top.json")||/\/data\/listings-lean(-\d+)?\.json$/.test(path)||path.includes("/data/listings.json")||path.includes("/data/merken/")){
    e.respondWith(caches.open(CACHE_DATA).then(function(cache){
      return cache.match(e.request).then(function(cached){
        var fetchPromise=fetch(e.request).then(function(r){
          if(r.ok) cache.put(e.request,r.clone());
          return r;
        });
        return cached||fetchPromise;
      });
    }));
    return;
  }

  // HTML: network-first, cache fallback
  if(path.endsWith(".html")||path.endsWith("/")){
    e.respondWith(fetch(e.request).then(function(r){
      var c=r.clone();
      caches.open(CACHE).then(function(cache){cache.put(e.request,c);});
      return r;
    }).catch(function(){
      // caches.match(e.request) resolveert naar undefined als deze exacte
      // URL (incl. querystring, bv. ?merk=Tesla) nooit eerder gecached is --
      // e.respondWith(undefined) gooit dan "TypeError: Failed to convert
      // value to 'Response'" i.p.v. gewoon de pagina offline te tonen (Sep
      // '26, gevonden tijdens live debuggen van de favorieten-sync). "/"
      // staat via STATIC altijd gegarandeerd in de cache (zie install()
      // hierboven), dus dat is de laatste geldige fallback vóór een
      // synthetische Response -- e.respondWith() moet linksom of rechtsom
      // altijd een echt Response-object krijgen.
      return caches.match(e.request).then(function(cached){
        return cached || caches.match("/") || new Response("Offline en geen cache beschikbaar.", {status: 503, headers: {"Content-Type": "text/plain"}});
      });
    }));
    return;
  }
});

// ===== PUSH-MELDINGEN =====
// Payload komt van scripts/send-notifications.js (via lib/webpush.js) als
// JSON {title, body, url}. Geen inhoud in de push zelf laten staan die niet
// ook als JSON leesbaar is -- e.data.json() gooit anders stil een fout en
// laat de melding helemaal weg.
self.addEventListener("push",function(e){
  var data={};
  try{ data=e.data?e.data.json():{}; }catch(err){}
  var titel=data.title||"Carkijker";
  var opties={
    body:data.body||"",
    icon:"/icons/icon-192.png",
    badge:"/icons/icon-192.png",
    data:{url:data.url||"/"},
  };
  e.waitUntil(self.registration.showNotification(titel,opties));
});

// Focust een al open Carkijker-tab op de doel-URL i.p.v. altijd een nieuwe
// tab te openen -- de meeste bezoekers hebben de site al in een tab staan.
self.addEventListener("notificationclick",function(e){
  e.notification.close();
  var url=(e.notification.data&&e.notification.data.url)||"/";
  e.waitUntil(self.clients.matchAll({type:"window"}).then(function(list){
    for(var i=0;i<list.length;i++){
      if(list[i].url===url&&"focus" in list[i]) return list[i].focus();
    }
    if(self.clients.openWindow) return self.clients.openWindow(url);
  }));
});