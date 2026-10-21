const CACHE = 'protocolo-v3'; // bumped: força limpar cache antigo
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
    // cache:'no-store' força ignorar o cache HTTP do navegador (não só o do service worker)
    // e buscar sempre a versão mais nova direto do servidor. Sem isso, o navegador podia
    // devolver uma resposta antiga guardada no cache HTTP comum sem nem chegar a rede —
    // foi isso que fez o app ficar preso no visual antigo mesmo depois de publicar o novo arquivo.
    fetch(req, { cache: 'no-store' }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

/* ---------- push (FCM) com o app fechado ----------
   Sem este handler o navegador recebe o push e não mostra nada. Aceita os dois formatos que o FCM
   entrega: mensagem com "notification" ({notification:{title,body}}) e só "data" ({data:{title,body}}).
   Sempre mostra a notificação (o iPhone cancela a assinatura se um push chegar sem exibir nada).
   O "tag" = título é o mesmo que o app usa quando está aberto, então não duplica: uma substitui a outra. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) { payload = { notification: { title: 'Lembrete', body: event.data ? event.data.text() : '' } }; }
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || 'Lembrete';
  const body = n.body || d.body || '';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: title,
    icon: n.icon || d.icon || 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: d.url || (payload.fcmOptions && payload.fcmOptions.link) || n.click_action || './' },
    vibrate: [200, 100, 200]
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const alvo = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(alvo);
    })
  );
});
