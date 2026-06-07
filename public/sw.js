// Service Worker for "Tính tiền điện tháng" PWA
const CACHE_NAME = 'tien-dien-v1';
const STATIC_CACHE = 'tien-dien-static-v1';
const DATA_CACHE = 'tien-dien-data-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('tien-dien-') &&
                     name !== STATIC_CACHE &&
                     name !== DATA_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and devtools
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests (data cache)
  if (url.pathname.startsWith('/api') ||
      url.hostname.includes('neon.tech') ||
      url.hostname.includes('vercel')) {
    event.respondWith(
      fetchWithCache(request, DATA_CACHE)
    );
    return;
  }

  // Handle static assets (static cache)
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE)
    );
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithCache(request, STATIC_CACHE)
    );
    return;
  }

  // Default: try cache, fallback to network
  event.respondWith(
    cacheFirst(request, STATIC_CACHE)
  );
});

// Strategy: Cache First
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }

  console.log('[SW] Cache miss, fetching:', request.url);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return getOfflineResponse(request);
  }
}

// Strategy: Network First with Cache Fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return getOfflineResponse(request);
  }
}

// Strategy: Fetch with Cache (for API)
async function fetchWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] API fetch failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline JSON response
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Offline - Không có kết nối mạng',
        cached: false
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Get appropriate offline response
function getOfflineResponse(request) {
  if (request.mode === 'navigate') {
    return caches.match('/offline.html');
  }

  return new Response(
    'Offline',
    { status: 503, statusText: 'Service Unavailable' }
  );
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (!event.data) {
    console.log('[SW] No push data');
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body || 'Có hóa đơn mới',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      date: data.date || new Date().toISOString(),
    },
    actions: [
      { action: 'view', title: 'Xem ngay' },
      { action: 'dismiss', title: 'Bỏ qua' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tiền Điện', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Check if there's already a window open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if none exists
        return self.clients.openWindow(url);
      })
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-bills') {
    event.waitUntil(syncBills());
  }
});

// Sync bills when back online
async function syncBills() {
  console.log('[SW] Syncing bills...');
  // Implementation would go here to sync any offline-created bills
}

// Periodic background sync (for checking new bills)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-new-bills') {
    event.waitUntil(checkNewBills());
  }
});

async function checkNewBills() {
  console.log('[SW] Checking for new bills...');
  // Implementation for periodic check
}