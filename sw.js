// Service Worker for PhotoMosaic Generator
// Offline support and cache management

const CACHE_NAME = 'photomosaic-v1.0.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js',
  '/js/modules/image-processor.js',
  '/js/modules/tile-manager.js',
  '/js/modules/memory-monitor.js',
  '/js/modules/ui-controller.js',
  '/js/modules/progress-manager.js',
  '/js/modules/image-viewer.js',
  '/js/workers/mosaic-worker.js',
  '/js/lib/memory-utils.js',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell...');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        // Activate immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated successfully');
        // Control all clients
        return self.clients.claim();
      })
      .catch(error => {
        console.error('❌ Service Worker activation failed:', error);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // For HTML files
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }
  
  // For image files
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // For other resources
  event.respondWith(handleResourceRequest(request));
});

// Handle HTML documents
async function handleDocumentRequest(request) {
  try {
    // Network first
    const networkResponse = await fetch(request);
    
    // Cache response
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // Use cache on network error
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback
    return caches.match('/index.html');
  }
}

// Handle image requests
async function handleImageRequest(request) {
  try {
    // Cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache images for long period
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('Failed to fetch image:', request.url);
    
    // Return placeholder image
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="#666">Image not available</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle resource requests
async function handleResourceRequest(request) {
  try {
    // Cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Save to cache on success
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('Failed to fetch resource:', request.url);
    
    // Error handling for JS files
    if (request.url.endsWith('.js')) {
      return new Response(
        'console.error("Failed to load script:", "' + request.url + '");',
        {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
    
    // Error handling for CSS files
    if (request.url.endsWith('.css')) {
      return new Response(
        '/* Failed to load stylesheet: ' + request.url + ' */',
        {
          headers: {
            'Content-Type': 'text/css',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
    
    // Return network error for others
    return new Response('Network Error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    // Implement as needed
    console.log('📱 Performing background sync...');
    
    // Example: Send unsent data
    // await sendPendingData();
    
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('📢 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Notification from PhotoMosaic Generator',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'photomosaic-notification',
    renotify: false,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/assets/icons/action-open.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PhotoMosaic Generator', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          // Bring existing window to front if available
          for (const client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Message handling
self.addEventListener('message', event => {
  console.log('📨 Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: CACHE_NAME
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        })
        .then(() => {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
            success: true
          });
        })
        .catch(error => {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
            success: false,
            error: error.message
          });
        })
    );
  }
});

// Error handling
self.addEventListener('error', event => {
  console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// Periodic cache cleanup
setInterval(() => {
  cleanupOldCaches();
}, 24 * 60 * 60 * 1000); // Every 24 hours

async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
    
    if (oldCaches.length > 0) {
      console.log('🧹 Cleaning up old caches:', oldCaches);
      await Promise.all(oldCaches.map(name => caches.delete(name)));
    }
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
  }
}

// Monitor cache size
async function monitorCacheSize() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const totalSize = keys.length;
    
    console.log('📊 Cache size:', totalSize, 'entries');
    
    // Delete old entries if limit exceeded
    if (totalSize > 500) {
      const urlsToDelete = keys.slice(0, 50).map(request => request.url);
      await Promise.all(urlsToDelete.map(url => cache.delete(url)));
      console.log('🗑️ Deleted old cache entries:', urlsToDelete.length);
    }
  } catch (error) {
    console.error('❌ Cache size monitoring failed:', error);
  }
}

// Periodic cache size check
setInterval(monitorCacheSize, 60 * 60 * 1000); // Every hour

console.log('🔧 Service Worker script loaded');