// app/src/views/Home.js
import LucideIcon from '../components/LucideIcon.js'
export default {
  props: ['stats'],
  emits: ['search'],
  components: { LucideIcon },
  data() {
    return {
      query: ''
    }
  },
  template: `
    <div class="view-home">
      <div class="container">
        <div class="hero-flex-desktop slide-up">
          
          <div class="hero-content-left">
            <h1 class="hero-title">Gbé Tché</h1>
            <p class="hero-subtitle">Le dictionnaire communautaire de la langue Fon. Apprenez, contribuez et préservez notre héritage culturel.</p>
            
            <form @submit.prevent="$emit('search', query)" class="search-elite-container" style="margin: 0; max-width: 600px;">
              <div class="search-elite-wrapper">
                <lucide-icon name="search" className="search-icon" />
                <input 
                  v-model="query" 
                  type="text" 
                  placeholder="Rechercher un mot, une expression..." 
                  class="search-elite-input"
                />
                <button type="submit" class="btn-search-premium premium-gradient glow-on-hover">
                  <lucide-icon name="arrow-right" />
                </button>
              </div>
            </form>

            <div class="quick-stats-centered fade-in" style="justify-content: flex-start; margin-top: 40px;">
              <div class="luxury-stat-box" style="align-items: flex-start; min-width: auto;">
                <span class="l-stat-value">{{ stats.words || 0 }}</span>
                <span class="l-stat-label">Mots Référencés</span>
              </div>
              <div class="stat-separator" style="margin: 0 30px;"></div>
              <div class="luxury-stat-box" style="align-items: flex-start; min-width: auto;">
                <span class="l-stat-value">{{ stats.contributors || 0 }}</span>
                <span class="l-stat-label">Contributeurs</span>
              </div>
            </div>
          </div>

          <div class="hero-visual-right glass-card" style="padding: 40px; border-radius: 40px;">
            <div class="word-of-day-pro">
              <span class="badge-luxury premium-gradient" style="margin-bottom: 20px; display: inline-block;">Mot du jour</span>
              <h2 class="fon-text" style="font-size: 3.5rem; margin-bottom: 10px;">Dahomè</h2>
              <p class="french-text" style="opacity: 0.8;">Ancien nom du Bénin, signifiant "Dans le ventre de Dan".</p>
              <div class="example" style="margin-top: 20px;">
                "Dahomè nyí tò ɖaxó ɖé." (Le Dahomey était un grand pays.)
              </div>
              <button @click="$emit('search', 'Dahomè')" class="btn-premium mini" style="margin-top: 30px;">
                En savoir plus <lucide-icon name="arrow-up-right" :size="16" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
}
