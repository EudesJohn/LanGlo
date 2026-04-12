// app/src/views/AddWord.js
import AudioRecorder from '../components/AudioRecorder.js';

export default {
  components: { AudioRecorder },
  emits: ['addWord', 'navigate'],
  props: ['prefill'],
  data() {
    return {
      french: this.prefill || '',
      fon: '',
      category: 'salutations',
      example: '',
      phonetic: '',
      audioBlob: null
    }
  },
  template: `
    <div class="view-add-word">
      <div class="section-header">
        <button @click="$emit('navigate', 'home')" class="back-btn"><i data-lucide="arrow-left"></i> Retour</button>
        <h2>Suggérer un nouveau mot</h2>
      </div>

      <div class="add-card glass-card">
        <form @submit.prevent="$emit('addWord', {french, fon, category, example, phonetic})">
          <div class="form-grid">
            <div class="form-group">
              <label>Mot en Français</label>
              <input v-model="french" class="input-field" required placeholder="Ex: Maison" />
            </div>
            <div class="form-group">
              <label>Traduction en Fon</label>
              <input v-model="fon" class="input-field" required placeholder="Ex: Xwé" />
            </div>
            <div class="form-group">
              <label>Catégorie</label>
              <select v-model="category" class="input-field">
                <option value="salutations">Salutations</option>
                <option value="nature">Nature</option>
                <option value="nourriture">Nourriture</option>
                <option value="vie-quotidienne">Vie quotidienne</option>
                <option value="animaux">Animaux</option>
              </select>
            </div>
            <div class="form-group">
              <label>Phonétique</label>
              <input v-model="phonetic" class="input-field" placeholder="Ex: Khwé" />
            </div>
            <div class="form-group">
               <label>Audio</label>
               <audio-recorder @recorded="audioBlob = $event" />
            </div>
          </div>
          <div class="form-group full-width">
            <label>Exemple d'utilisation</label>
            <textarea v-model="example" class="input-field" rows="4" placeholder="Une phrase d'exemple..."></textarea>
          </div>
          <button type="submit" class="btn-premium wide">Envoyer pour validation</button>
        </form>
      </div>
    </div>
  `
}
