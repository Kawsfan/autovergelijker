const CACHE = "autovergelijker-v3";
const STATIC = ["/autovergelijker/","/autovergelijker/index.html"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(STATIC);}));
  self.skipWaiting();
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});
self.addEventListener("fetch",function(e){
  var url=new URL(e.request.url);
  var isHTML=url.pathname.endsWith(".html")||url.pathname.endsWith("/");
  if(isHTML){
    e.respondWith(fetch(e.request).then(function(r){
      var c=r.clone();
      caches.open(CACHE).then(function(cache){cache.put(e.request,c);});
      return r;
    }).catch(function(){return caches.match(e.request);}));
  } else {
    e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request);}));
  }
});