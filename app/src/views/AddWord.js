// app/src/views/AddWord.js
import AudioRecorder from '../components/AudioRecorder.js';
import LucideIcon from '../components/LucideIcon.js'

export default {
  components: { AudioRecorder, LucideIcon },
  emits: ['addWord', 'navigate'],
  props: ['prefill'],
  data() {
    return {
      french: this.prefill || '',
      fon: '',
      category: 'salutations',
      example: '',
      phonetic: '',
      wordAudioBlob: null,
      phraseAudioBlob: null
    }
  },
  methods: {
    async handleFormSubmit() {
      const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
          if (!blob) return resolve(null);
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      try {
        const audio_base64 = await blobToBase64(this.wordAudioBlob);
        const example_audio_base64 = await blobToBase64(this.phraseAudioBlob);

        this.$emit('addWord', {
          french: this.french,
          fon: this.fon,
          category: this.category,
          example: this.example,
          phonetic: this.phonetic,
          audio_base64,
          example_audio_base64
        });
      } catch (err) {
        console.error("Conversion error:", err);
      }
    }
  },
  template: `
    <div class="view-add-word">
      <div class="container">
        <div class="section-header">
          <button @click="$emit('navigate', 'home')" class="back-btn"><lucide-icon name="arrow-left" /> Retour</button>
          <h2 style="font-size: 2.5rem;">Suggérer un nouveau mot</h2>
        </div>

        <div class="add-card glass-card">
          <form @submit.prevent="handleFormSubmit">
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
                  <option value="famille">Famille</option>
                  <option value="nature">Nature</option>
                  <option value="nourriture">Nourriture</option>
                  <option value="maison">Maison</option>
                  <option value="corps-humain">Corps Humain</option>
                  <option value="actions">Actions (Verbes)</option>
                  <option value="chiffres">Chiffres</option>
                  <option value="temps">Temps</option>
                  <option value="lieux">Lieux</option>
                  <option value="objets">Objets</option>
                  <option value="sentiments">Sentiments</option>
                  <option value="commerce">Commerce</option>
                  <option value="sante">Santé</option>
                  <option value="vie-quotidienne">Vie quotidienne</option>
                  <option value="animaux">Animaux</option>
                </select>
              </div>
            </div>

            <div class="form-divider"><span>Prononciation & Audios (Fon)</span></div>

            <div class="form-grid">
              <div class="form-group">
                <label>Phonétique en Fon</label>
                <input v-model="phonetic" class="input-field" placeholder="Ex: Khwé" />
              </div>
              <div class="form-group">
                 <label>Audio du Mot</label>
                 <audio-recorder @recorded="wordAudioBlob = $event" />
              </div>
              <div class="form-group">
                 <label>Audio de la Phrase</label>
                 <audio-recorder @recorded="phraseAudioBlob = $event" />
              </div>
            </div>

            <div class="form-group full-width">
              <label>Exemple d'utilisation (Phrase complète)</label>
              <textarea v-model="example" class="input-field" rows="3" placeholder="Une phrase d'exemple pour illustrer le sens..."></textarea>
            </div>
            <button type="submit" class="btn-premium wide" style="padding: 20px; font-size: 1.2rem;">
              <lucide-icon name="send" /> Envoyer pour validation
            </button>
          </form>
        </div>
      </div>
    </div>
  `
}
