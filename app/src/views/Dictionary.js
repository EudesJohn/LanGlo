// app/src/views/Dictionary.js
import WordCard from '../components/WordCard.js'
import LucideIcon from '../components/LucideIcon.js'

export default {
  components: { WordCard, LucideIcon },
  props: ['words', 'query', 'favorites', 'searchResult'],
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

            <!-- GLOSBE WORD-BY-WORD INTERLINEAR CARD -->
            <div v-if="searchResult?.isSentence && searchResult?.wordByWord?.length > 0" class="glass-card scale-in" style="border-radius: 30px; padding: 25px 30px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(135deg, rgba(255,215,0,0.03) 0%, rgba(255,255,255,0.03) 100%);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <lucide-icon name="sparkles" style="color: var(--primary);" />
                <span class="detail-label" style="margin: 0; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; color: var(--primary);">Analyse mot-à-mot (Style Glosbe)</span>
              </div>
              <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <div v-for="item in searchResult.wordByWord" :key="item.original" class="glass-card" style="border-radius: 18px; padding: 12px 18px; background: rgba(0,0,0,0.15); border: 1px solid var(--glass-border); min-width: 90px; text-align: center; transition: transform 0.2s;" :style="item.found ? 'border-color: rgba(255, 215, 0, 0.25);' : 'opacity: 0.6;'">
                  <div class="original-word" style="font-size: 1.15rem; font-weight: 700; color: white; margin-bottom: 4px; text-transform: capitalize;">
                    {{ item.original }}
                  </div>
                  <div class="translated-word font-fon" style="font-size: 0.95rem; font-weight: 600; color: var(--primary);" v-if="item.found">
                    {{ item.translation }}
                  </div>
                  <div class="not-found" style="font-size: 0.8rem; color: #ef4444; font-style: italic;" v-else>
                    non trouvé
                  </div>
                </div>
              </div>
            </div>

            <!-- EXACT MATCHES -->
            <div class="dictionary-grid" v-if="words.length > 0">
              <word-card 
                v-for="word in words" 
                :key="word.id" 
                :word="word" 
                :query="query"
                :favorites="favorites"
                @navigate="$emit('navigate', $event)"
              />
            </div>

            <!-- EXAMPLE SENTENCES CONCORDANCE (TRANSLATION MEMORY) -->
            <div v-if="searchResult?.isSentence && searchResult?.exampleSentences?.length > 0" style="margin-top: 40px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px;">
                <lucide-icon name="list" style="color: var(--primary);" />
                <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: white;">Phrases d'exemples associées</h3>
              </div>
              
              <div class="dictionary-grid">
                <word-card 
                  v-for="word in searchResult.exampleSentences" 
                  :key="word.id" 
                  :word="word" 
                  :query="query"
                  :favorites="favorites"
                  @navigate="$emit('navigate', $event)"
                />
              </div>
            </div>

            <!-- NO RESULTS CARD -->
            <div v-if="words.length === 0 && (!searchResult?.isSentence || (searchResult?.exampleSentences?.length === 0 && searchResult?.wordByWord?.length === 0))" class="no-results zoom-in" style="text-align: center; padding: 100px 20px;">
              <div class="icon-wrap" style="font-size: 4rem; margin-bottom: 30px; opacity: 0.2;">
                <lucide-icon name="search-x" :size="64" />
              </div>
              <h3 style="font-size: 2rem; margin-bottom: 10px;">Aucun résultat exact</h3>
              <p style="opacity: 0.6; margin-bottom: 30px;">La langue Fon est vaste. Si ce mot manque dans notre base de 31 000 phrases, aidez la communauté en le suggérant !</p>
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
