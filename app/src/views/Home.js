// app/src/views/Home.js

export default {
  emits: ['search'],
  data() { return { query: '' } },
  template: `
    <div class="view-home">
      <div class="hero-content">
        <h1 class="hero-title">Gbé <span class="gradient-text">Tché</span></h1>
        <p class="hero-subtitle">Redécouvrez la langue Fon à travers un dictionnaire moderne, rapide et élégant.</p>
        
        <div class="search-main glass-card">
          <i data-lucide="search" class="search-icon"></i>
          <input 
            v-model="query" 
            @keyup.enter="$emit('search', query)"
            placeholder="Rechercher un mot (ex: Bonjour, Eau...)" 
          />
        </div>
        
        <div class="stats-row">
          <div class="stat-item glass-card">
            <h3>500+</h3>
            <p>Mots approuvés</p>
          </div>
          <div class="stat-item glass-card">
            <h3>2k+</h3>
            <p>Utilisateurs</p>
          </div>
        </div>

        <div class="word-of-day glass-card">
          <span class="label">⭐ Mot du Jour</span>
          <h2>Aklúnɔ</h2>
          <p class="phonetic">/a-kloo-no/</p>
          <p class="meaning">Seigneur / Maître</p>
          <button class="btn-premium mini">En savoir plus</button>
        </div>
      </div>
    </div>
  `
}
