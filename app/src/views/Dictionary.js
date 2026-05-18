// app/src/views/Dictionary.js
import WordCard from '../components/WordCard.js'
import LucideIcon from '../components/LucideIcon.js'

export default {
  components: { WordCard, LucideIcon },
  props: ['words', 'query', 'favorites'],
  emits: ['navigate'],
  template: `
    <div class="view-dictionary">
      <div class="container">
        <div class="dictionary-layout-desktop">
          
          <!-- SIDEBAR -->
          <aside class="dict-sidebar">
            <div class="sidebar-box glass-card">
              <h4>Filtrer par Catégorie</h4>
              <nav class="filter-list">
                <button class="filter-btn active">Tout mélanger <span>{{ words.length }}</span></button>
                <button class="filter-btn">Noms <span>-</span></button>
                <button class="filter-btn">Verbes <span>-</span></button>
                <button class="filter-btn">Adjectifs <span>-</span></button>
                <button class="filter-btn">Expressions <span>-</span></button>
              </nav>
            </div>

            <div class="sidebar-box glass-card" style="margin-top: 20px;">
              <h4>Aide la communauté</h4>
              <p style="font-size: 0.85rem; opacity: 0.6; line-height: 1.5; margin-bottom: 20px;">
                Vous connaissez un mot qui ne figure pas encore dans notre base ? Ajoutez-le dès maintenant !
              </p>
              <button @click="$emit('navigate', 'add-word')" class="btn-premium mini wide">
                Suggérer un mot
              </button>
            </div>
          </aside>

          <!-- MAIN RESULTS -->
          <div class="dictionary-results-main">
            <div class="dictionary-header slide-down" style="padding: 0; margin-bottom: 40px;">
              <div class="header-content">
                <button @click="$emit('navigate', 'home')" class="btn-back" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 50%; margin-right: 20px; border: none; cursor: pointer; color: var(--primary);">
                  <lucide-icon name="arrow-left" />
                </button>
                <div class="header-titles">
                  <h2 v-if="query" style="font-size: 2.5rem;">Résultats pour "{{ query }}"</h2>
                  <h2 v-else style="font-size: 2.5rem;">Tous les mots du dictionnaire</h2>
                  <p class="results-count" style="opacity: 0.6; margin-top: 5px;">{{ words.length }} mot(s) trouvé(s) dans le dictionnaire</p>
                </div>
              </div>
            </div>

            <div class="dictionary-grid">
              <word-card 
                v-for="word in words" 
                :key="word.id" 
                :word="word" 
                :favorites="favorites"
                @navigate="$emit('navigate', $event)"
              />
            </div>

            <div v-if="words.length === 0" class="no-results zoom-in" style="text-align: center; padding: 100px 20px;">
              <div class="icon-wrap" style="font-size: 4rem; margin-bottom: 30px; opacity: 0.2;">
                <lucide-icon name="search-x" :size="64" />
              </div>
              <h3 style="font-size: 2rem; margin-bottom: 10px;">Aucun résultat exact</h3>
              <p style="opacity: 0.6; margin-bottom: 30px;">La langue Fon est vaste. Si ce mot manque, vous pouvez aider la communauté en l'ajoutant !</p>
              <button @click="$emit('navigate', 'add-word')" class="btn-premium">
                Suggérer ce mot
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
}
