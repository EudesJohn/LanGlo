// app/sw.js - Service Worker for offline PWA installation
const CACHE_NAME = 'gbe-tche-v1.2';
const ASSETS = [
  '/',
  '/index.html',
  '/src/assets/styles.css',
  '/src/App.js',
  '/src/components/Navbar.js',
  '/src/components/Footer.js',
  '/src/components/WordCard.js',
  '/src/components/LucideIcon.js',
  '/src/views/Home.js',
  '/src/views/Profile.js',
  '/src/views/Dictionary.js',
  '/src/views/AddWord.js',
  '/src/views/About.js',
  '/src/views/Admin.js',
  '/src/views/Ethnicities.js',
  '/src/views/Login.js',
  '/src/views/Register.js',
  '/src/views/ForgotPassword.js',
  '/src/views/ResetPassword.js',
  '/src/views/LinkInvalid.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use silent fallback if some assets fail to load or are dynamic
      return cache.addAll(ASSETS).catch(err => console.warn("Asset caching warning:", err));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http')) return;
  
  // Skip intercepting Supabase / Auth / External API dynamic requests
  if (e.request.url.includes('/api/') || e.request.url.includes('supabase.co')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Cache the updated version if it is a successful local resource
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline): return cached resource if available
        return caches.match(e.request);
      })
  );
});
