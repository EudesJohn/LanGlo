// app/src/views/Dictionary.js
import WordCard from '../components/WordCard.js'

export default {
  components: { WordCard },
  props: ['words', 'query', 'favorites'],
  emits: ['navigate', 'toggleFavorite'],
  template: `
    <div class="view-dict">
      <div class="section-header">
        <button @click="$emit('navigate', 'home')" class="back-btn">
          <i data-lucide="arrow-left"></i> Retour
        </button>
        <h2>Résultats pour "{{ query || 'Tous les mots' }}"</h2>
      </div>

      <div v-if="words.length === 0" class="empty-state">
        <i data-lucide="search-x" style="width:64px; height:64px;"></i>
        <p>Aucun mot trouvé dans notre dictionnaire.</p>
        <button @click="$emit('navigate', 'add-word')" class="btn-premium">Suggérer ce mot</button>
      </div>

      <div v-else class="words-grid">
        <word-card 
          v-for="w in words" 
          :key="w.id" 
          :word="w" 
          :isFavorite="favorites.includes(w.id)"
          @toggleFavorite="$emit('toggleFavorite', $event)"
        />
      </div>
    </div>
  `
}
