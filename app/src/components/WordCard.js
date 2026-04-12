// app/src/components/WordCard.js

export default {
  props: ['word', 'isFavorite'],
  emits: ['toggleFavorite', 'playAudio'],
  template: `
    <div class="word-card glass-card">
      <div class="card-top">
        <span class="category-badge">{{ word.category }}</span>
        <button @click="$emit('toggleFavorite', word.id)" :class="['fav-btn', {active: isFavorite}]">
          <i data-lucide="heart" style="width:20px; height:20px;"></i>
        </button>
      </div>
      <h2 class="fon-text">{{ word.fon }}</h2>
      <p class="phonetic">/{{ word.phonetic }}/</p>
      <p class="french-text">{{ word.french }}</p>
      <p class="example">"{{ word.example }}"</p>
      <div class="card-footer">
        <button class="audio-btn" @click="$emit('playAudio', word.audio_url)">
          <i data-lucide="volume-2"></i> Prononciation
        </button>
      </div>
    </div>
  `
}
