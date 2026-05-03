// d:/Dico Fon/app/src/components/AudioRecorder.js
import LucideIcon from './LucideIcon.js'

export default {
  emits: ['recorded'],
  components: { LucideIcon },
  data() {
    return {
      isRecording: false,
      timer: 0,
      timerInterval: null,
      mediaRecorder: null,
      audioChunks: [],
      audioUrl: null
    }
  },
  template: `
    <div class="audio-recorder">
      <button v-if="!isRecording" type="button" @click="startRecording" class="btn-record">
        <lucide-icon name="mic" /> Enregistrer la prononciation
      </button>
      <button v-else type="button" @click="stopRecording" class="btn-record recording">
        <lucide-icon name="square" /> Arrêter ({{ timer }}s)
      </button>
      
      <div v-if="audioUrl" class="audio-preview slide-up">
        <audio :src="audioUrl" controls></audio>
        <button type="button" @click="resetAudio" class="btn-x" title="Supprimer">
          <lucide-icon name="trash-2" />
        </button>
      </div>
    </div>
  `,
  methods: {
    resetAudio() {
      this.audioUrl = null;
      this.$emit('recorded', null);
    },
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Pick supported mime type
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/ogg';
          
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.audioChunks = [];
        this.audioUrl = null; // Clear previous

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: mimeType });
          this.audioUrl = URL.createObjectURL(blob);
          this.$emit('recorded', blob);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.timer = 0;
        this.timerInterval = setInterval(() => {
          this.timer++;
        }, 1000);
      } catch (err) {
        console.error("Mic error:", err);
        alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès dans votre navigateur.");
      }
    },
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
        clearInterval(this.timerInterval);
        
        // Release tracks
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  }
}
