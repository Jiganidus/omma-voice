// Offline cache. Pages load from the network first (so updates show up straight away) and fall back to the cache.
var VERSION='omma-v4';
var FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==VERSION; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin) return;
  // Always fetch fresh; if the network is slow, show the saved copy but keep downloading so the next open is up to date.
  var net=fetch(req,{cache:'no-cache'}).then(function(r){
    if(r&&r.ok){ var c=r.clone(); return caches.open(VERSION).then(function(cache){ return cache.put(req,c); }).then(function(){ return r; }); }
    return r;
  });
  e.waitUntil(net.catch(function(){}));
  e.respondWith((async function(){
    try{
      return await Promise.race([net,new Promise(function(_,rej){ setTimeout(function(){ rej(new Error('timeout')); },8000); })]);
    }catch(err){
      var cache=await caches.open(VERSION);
      var hit=await cache.match(req,{ignoreSearch:true});
      if(!hit) hit=await cache.match('./index.html');
      return hit||net;
    }
  })());
});
