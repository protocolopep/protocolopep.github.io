const CACHE = 'protocolo-v2'; // bumped: força limpar qualquer cache antigo guardado sob o nome anterior
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
