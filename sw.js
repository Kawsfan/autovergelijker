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
  if(path.includes("/data/listings-top.json")||path.includes("/data/listings-lean.json")||path.includes("/data/listings.json")||path.includes("/data/merken/")){
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