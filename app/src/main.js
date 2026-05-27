// app/src/main.js
import App from './App.js';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered successfully!', reg.scope);
        reg.update();
      })
      .catch(err => console.warn('Service Worker registration failed:', err));
  });
}

const { createApp } = Vue;
const app = createApp(App);
app.mount('#app');
