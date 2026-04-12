// d:/Dico Fon/app/src/components/AudioRecorder.js

export default {
  emits: ['recorded'],
  data() {
    return {
      isRecording: false,
      mediaRecorder: null,
      audioChunks: [],
      audioUrl: null
    }
  },
  template: `
    <div class="audio-recorder">
      <button v-if="!isRecording" @click="startRecording" class="btn-record">
        <i data-lucide="mic"></i> Enregistrer la prononciation
      </button>
      <button v-else @click="stopRecording" class="btn-record recording">
        <i data-lucide="square"></i> Arrêter ({{ timer }}s)
      </button>
      
      <div v-if="audioUrl" class="audio-preview">
        <audio :src="audioUrl" controls></audio>
        <button @click="audioUrl = null" class="btn-x"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `,
  methods: {
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
        this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: 'audio/ogg; codecs=opus' });
          this.audioUrl = URL.createObjectURL(blob);
          this.$emit('recorded', blob);
          // Re-init lucide icons for the trash button if needed
          setTimeout(() => lucide.createIcons(), 10);
        };
        this.mediaRecorder.start();
        this.isRecording = true;
        lucide.createIcons();
      } catch (err) {
        alert("Microphone non autorisé");
      }
    },
    stopRecording() {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
}
