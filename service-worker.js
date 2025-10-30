
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET
  if (request.method !== 'GET') return;

  // Navegaciones: servir index.html (para offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(`${APP_BASE}index.html`, net.clone());
          return net;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(`${APP_BASE}index.html`);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Static-first para assets del mismo origen
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const net = await fetch(request);
          cache.put(request, net.clone());
          return net;
        } catch {
          // Si falla red y no está en caché, error
          return Response.error();
        }
      })()
    );
  }
});
