// Offline cache. Pages load from the network first (so updates show up straight away) and fall back to the cache.
var VERSION='omma-v2';
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
  e.respondWith((async function(){
    var cache=await caches.open(VERSION);
    try{
      var net=await Promise.race([fetch(req,{cache:'no-cache'}),new Promise(function(_,rej){ setTimeout(function(){ rej(new Error('timeout')); },3000); })]);
      if(net&&net.ok) cache.put(req,net.clone());
      return net;
    }catch(err){
      var hit=await cache.match(req,{ignoreSearch:true});
      if(!hit) hit=await cache.match('./index.html');
      return hit||Response.error();
    }
  })());
});
