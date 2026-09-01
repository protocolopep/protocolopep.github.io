const CACHE = 'protocolo-v1';
const SHELL = ['./', './index.html', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Não interceptar chamadas ao Firebase/Google (precisam de rede sempre)
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

/* =========================================================
   PUSH NOTIFICATION (FCM)
   dispara quando chega um push do servidor e o app NÃO está aberto
   (com o app aberto, quem mostra é o onMessage() dentro do index.html)
   ========================================================= */
self.addEventListener('push', function(event){
  var dados = {};
  try{ dados = event.data ? event.data.json() : {}; }catch(e){}
  var n = dados.notification || {};
  var title = n.title || 'Protocolo';
  var body  = n.body  || '';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: 'icon-192.png',
      tag: title
    })
  );
});

// ao tocar na notificação, abre (ou foca) o app
self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        if('focus' in list[i]) return list[i].focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
