// app/sw.js - Service Worker for offline PWA installation
const CACHE_NAME = 'gbe-tche-v1.1';
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
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request);
    }).catch(() => {
      // Fail gracefully
    })
  );
});
