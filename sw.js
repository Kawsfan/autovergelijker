const CACHE = "carkijker-v2";
const CACHE_DATA = "carkijker-data-v1";
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
  if(path.includes("/data/listings-top.json")||path.includes("/data/listings.json")||path.includes("/data/merken/")){
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
    }).catch(function(){return caches.match(e.request);}));
    return;
  }
});