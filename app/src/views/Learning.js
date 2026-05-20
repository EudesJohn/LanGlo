// app/src/views/Learning.js
import LucideIcon from '../components/LucideIcon.js';

export default {
  components: { LucideIcon },
  emits: ['navigate'],
  data() {
    return {
      // User Learning Stats (synchronized with localStorage)
      xp: 0,
      hearts: 5,
      streak: 0,
      completedLessons: [], // list of unit-lesson keys like "1-1", "1-2"
      lastActivityDate: null,

      // View state
      currentLesson: null, // null if on path view, else active lesson object
      loadingAudio: false,

      // Active Quiz State
      quizQuestions: [],
      currentQuestionIndex: 0,
      isLessonFinished: false,
      userAnswer: null, // can be string for QCM, array of strings for Chips, or pairing selections
      pairingSelectedFon: null,
      pairingSelectedFr: null,
      pairingMatched: [], // matched indices/pairs
      pairingErrors: [], // mismatched temporarily red pairs
      isAnswerChecked: false,
      isCorrect: false,
      incorrectAttempts: 0,

      // Mascot State
      mascotMood: 'happy', // happy, cheer, sad, celebrate
      mascotText: 'Prêt pour ta leçon quotidienne ? Apprenons le Fon ensemble !',

      // Audio cache
      audioCache: {}, // fonWord: audioUrl

      // Custom confetti canvas
      confettiParticles: [],
      confettiActive: false,
      canvasContext: null,

      // Static Course Definition
      units: [
        {
          id: 1,
          title: "Unité 1 : Bases & Salutations",
          desc: "Apprends à dire bonjour, bonsoir, bienvenue et merci en Fon.",
          color: "#ff6b35",
          lessons: [
            {
              id: "1-1",
              name: "Les salutations",
              desc: "Dire bonjour, bienvenue et prendre des nouvelles",
              xp: 10,
              questions: [
                {
                  type: "qcm",
                  question: "Comment dit-on 'Bonjour' en Fon ?",
                  options: ["bo kudo zanzan", "ɖokpó", "nù", "tɔ́"],
                  answer: "bo kudo zanzan",
                  hint: "Dans le dictionnaire, Bonjour se traduit par 'bo kudo zanzan'."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Bienvenue' en Fon ?",
                  options: ["ku abɔ", "éɖabɔ", "wè", "nɔ̂"],
                  answer: "ku abɔ",
                  hint: "Dans le dictionnaire, Bienvenue se traduit par 'ku abɔ'."
                },
                {
                  type: "qcm",
                  question: "Comment demande-t-on 'Comment vas-tu ?' en Fon ?",
                  options: ["a ɖò ganjí à", "bo kudo zanzan", "un ɖo ganji", "éɖabɔ"],
                  answer: "a ɖò ganjí à",
                  hint: "Dans le dictionnaire, Comment vas-tu ? se dit 'a ɖò ganjí à'."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Bonjour' :",
                  word: "bo kudo zanzan",
                  options: ["bo kudo zanzan", "ɖokpó", "nù", "tɔ́"],
                  answer: "bo kudo zanzan",
                  hint: "Écoute bien la prononciation de bo kudo zanzan (Bonjour)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque expression avec sa traduction :",
                  pairs: [
                    { fon: "bo kudo zanzan", fr: "Bonjour" },
                    { fon: "ku abɔ", fr: "Bienvenue" },
                    { fon: "a ɖò ganjí à", fr: "Comment vas-tu ?" }
                  ]
                }
              ]
            },
            {
              id: "1-2",
              name: "Prendre congé & remerciements",
              desc: "Dire bonsoir, merci et au revoir",
              xp: 10,
              questions: [
                {
                  type: "qcm",
                  question: "Comment dit-on 'Bonsoir' en Fon ?",
                  options: ["kúdo gbáda", "a wà nŭ", "éɖabɔ", "wè"],
                  answer: "kúdo gbáda",
                  hint: "Dans le dictionnaire, Bonsoir se traduit par 'kúdo gbáda'."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Merci' en Fon ?",
                  options: ["a wà nŭ", "kúdo gbáda", "un ɖo ganji", "atɔn"],
                  answer: "a wà nŭ",
                  hint: "Dans le dictionnaire, Merci se traduit par 'a wà nŭ'."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Au revoir' en Fon ?",
                  options: ["éɖabɔ", "ku abɔ", "a ɖò ganjí à", "ɖokpó"],
                  answer: "éɖabɔ",
                  hint: "Dans le dictionnaire, Au revoir se traduit par 'éɖabɔ'."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Merci' :",
                  word: "a wà nŭ",
                  options: ["a wà nŭ", "kúdo gbáda", "un ɖo ganji", "éɖabɔ"],
                  answer: "a wà nŭ",
                  hint: "Écoute bien la prononciation de a wà nŭ (Merci)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque mot avec sa traduction :",
                  pairs: [
                    { fon: "kúdo gbáda", fr: "Bonsoir" },
                    { fon: "a wà nŭ", fr: "Merci" },
                    { fon: "éɖabɔ", fr: "Au revoir" }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 2,
          title: "Unité 2 : Les Nombres",
          desc: "Maîtrise le comptage de base de 1 à 5 en Fon.",
          color: "#4cc9f0",
          lessons: [
            {
              id: "2-1",
              name: "Les chiffres 1, 2 et 3",
              desc: "Compter les premiers objets",
              xp: 15,
              questions: [
                {
                  type: "qcm",
                  question: "Quel nombre correspond à 'ɖokpó' ?",
                  options: ["Deux", "Un", "Trois", "Cinq"],
                  answer: "Un",
                  hint: "C'est le chiffre Un (1) dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Que signifie le mot 'wè' en Fon ?",
                  options: ["Deux", "Quatre", "Trois", "Un"],
                  answer: "Deux",
                  hint: "C'est le chiffre Deux (2) dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Quel nombre se dit 'atɔn' ?",
                  options: ["Cinq", "Quatre", "Trois", "Deux"],
                  answer: "Trois",
                  hint: "Ce mot désigne le chiffre Trois (3) dans le dictionnaire."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Un' :",
                  word: "ɖokpó",
                  options: ["ɖokpó", "wè", "atɔn", "ɛnɛ"],
                  answer: "ɖokpó",
                  hint: "Écoute bien la prononciation de ɖokpó (Un)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque nombre avec sa traduction :",
                  pairs: [
                    { fon: "ɖokpó", fr: "Un" },
                    { fon: "wè", fr: "Deux" },
                    { fon: "atɔn", fr: "Trois" }
                  ]
                }
              ]
            },
            {
              id: "2-2",
              name: "Les chiffres 4 et 5",
              desc: "Terminer la première main",
              xp: 15,
              questions: [
                {
                  type: "qcm",
                  question: "Comment dit-on le chiffre 4 ?",
                  options: ["ɛnɛ", "atɔ́ɔ́n", "atɔn", "wè"],
                  answer: "ɛnɛ",
                  hint: "Dans le dictionnaire, Quatre (4) se dit 'ɛnɛ'."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on le chiffre 5 ?",
                  options: ["ɖokpó", "atɔ́ɔ́n", "ɛnɛ", "wè"],
                  answer: "atɔ́ɔ́n",
                  hint: "Dans le dictionnaire, Cinq (5) se dit 'atɔ́ɔ́n'."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Cinq' :",
                  word: "atɔ́ɔ́n",
                  options: ["atɔ́ɔ́n", "ɖokpó", "ɛnɛ", "wè"],
                  answer: "atɔ́ɔ́n",
                  hint: "Écoute bien la prononciation de atɔ́ɔ́n (Cinq)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque nombre avec sa traduction :",
                  pairs: [
                    { fon: "ɛnɛ", fr: "Quatre" },
                    { fon: "atɔ́ɔ́n", fr: "Cinq" },
                    { fon: "atɔn", fr: "Trois" },
                    { fon: "wè", fr: "Deux" }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 3,
          title: "Unité 3 : Alimentation & Vie Quotidienne",
          desc: "Apprends à nommer l'eau, le pain et à exprimer la faim et la soif.",
          color: "#7209b7",
          lessons: [
            {
              id: "3-1",
              name: "Boire de l'eau",
              desc: "Le vocabulaire lié à l'eau et aux boissons",
              xp: 20,
              questions: [
                {
                  type: "qcm",
                  question: "Comment dit-on 'Eau' en Fon ?",
                  options: ["lan", "wɔ̌xúxú", "sin", "ɖu"],
                  answer: "sin",
                  hint: "L'eau se dit 'sin' dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Que signifie le verbe 'nù' ?",
                  options: ["Manger", "Boire", "Dormir", "Parler"],
                  answer: "Boire",
                  hint: "Dans le dictionnaire, le verbe Boire se traduit par 'nù'."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Eau' :",
                  word: "sin",
                  options: ["sin", "nù", "lan", "ɖu"],
                  answer: "sin",
                  hint: "Ce mot désigne l'Eau."
                },
                {
                  type: "pairs",
                  question: "Associe chaque élément avec sa traduction :",
                  pairs: [
                    { fon: "sin", fr: "Eau" },
                    { fon: "nù", fr: "Boire" }
                  ]
                }
              ]
            },
            {
              id: "3-2",
              name: "Nourriture de base",
              desc: "Parler du pain, de la viande et du fait de manger",
              xp: 20,
              questions: [
                {
                  type: "qcm",
                  question: "Quelle est la traduction de 'wɔ̌xúxú' ?",
                  options: ["Viande", "Pain", "Eau", "Riz"],
                  answer: "Pain",
                  hint: "Le pain est désigné par le mot 'wɔ̌xúxú' dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Quelle est la traduction de 'lan' ?",
                  options: ["Poisson", "Pain", "Viande", "Légume"],
                  answer: "Viande",
                  hint: "Dans le dictionnaire, Viande se dit 'lan'."
                },
                {
                  type: "qcm",
                  question: "Quel verbe signifie 'Manger' ?",
                  options: ["nù", "ɖu", "yì", "wá"],
                  answer: "ɖu",
                  hint: "Dans le dictionnaire, Manger se traduit par 'ɖu'."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Pain' :",
                  word: "wɔ̌xúxú",
                  options: ["wɔ̌xúxú", "lan", "ɖu", "nù"],
                  answer: "wɔ̌xúxú",
                  hint: "Écoute bien la prononciation de wɔ̌xúxú (Pain)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque élément alimentaire :",
                  pairs: [
                    { fon: "wɔ̌xúxú", fr: "Pain" },
                    { fon: "lan", fr: "Viande" },
                    { fon: "ɖu", fr: "Manger" }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 4,
          title: "Unité 4 : La Famille",
          desc: "Identifie les membres de ta famille et tes proches.",
          color: "#f72585",
          lessons: [
            {
              id: "4-1",
              name: "Les parents",
              desc: "Désigner le père, la mère et les enfants",
              xp: 25,
              questions: [
                {
                  type: "qcm",
                  question: "Comment dit-on 'Mère' en Fon ?",
                  options: ["tɔ́", "nɔ̂", "vǐ", "nyɔnu"],
                  answer: "nɔ̂",
                  hint: "Mère se dit 'nɔ̂' dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Père' ?",
                  options: ["tɔ́", "nɔ̂", "vǐ", "nyɔnu"],
                  answer: "tɔ́",
                  hint: "Père se dit 'tɔ́' dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Que signifie le mot 'vǐ' ?",
                  options: ["Père", "Enfant", "Frère", "Mère"],
                  answer: "Enfant",
                  hint: "vǐ désigne l'Enfant dans le dictionnaire."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Mère' :",
                  word: "nɔ̂",
                  options: ["nɔ̂", "tɔ́", "vǐ", "nɔví"],
                  answer: "nɔ̂",
                  hint: "Écoute bien la prononciation de nɔ̂ (Mère)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque parent avec sa traduction :",
                  pairs: [
                    { fon: "nɔ̂", fr: "Mère" },
                    { fon: "tɔ́", fr: "Père" },
                    { fon: "vǐ", fr: "Enfant" }
                  ]
                }
              ]
            },
            {
              id: "4-2",
              name: "La fratrie",
              desc: "Parler de ses frères et sœurs",
              xp: 25,
              questions: [
                {
                  type: "qcm",
                  question: "Que signifie 'nɔví' ?",
                  options: ["Frère/Sœur (en général)", "Père", "Grand-mère", "Ami"],
                  answer: "Frère/Sœur (en général)",
                  hint: "nɔví désigne un frère ou une sœur dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Frère' (homme) ?",
                  options: ["nɔví nyɔnu", "nɔví súnnu", "vǐ súnnu", "tɔ́"],
                  answer: "nɔví súnnu",
                  hint: "Frère se dit 'nɔví súnnu' dans le dictionnaire."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Sœur' (femme) ?",
                  options: ["nɔví súnnu", "nyɔnu", "vǐ nyɔnu", "nɔ̂"],
                  answer: "nyɔnu",
                  hint: "Sœur se dit 'nyɔnu' dans le dictionnaire."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Frère' :",
                  word: "nɔví súnnu",
                  options: ["nɔví súnnu", "nyɔnu", "nɔví", "vǐ"],
                  answer: "nɔví súnnu",
                  hint: "Écoute bien la prononciation de nɔví súnnu (Frère)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque membre de la fratrie :",
                  pairs: [
                    { fon: "nɔví súnnu", fr: "Frère" },
                    { fon: "nyɔnu", fr: "Sœur" },
                    { fon: "nɔví", fr: "Frère/Sœur" }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
  },
  computed: {
    activeQuestion() {
      if (!this.currentLesson || this.isLessonFinished) return null;
      return this.quizQuestions[this.currentQuestionIndex] || null;
    },
    lessonProgress() {
      if (!this.currentLesson || this.quizQuestions.length === 0) return 0;
      return (this.currentQuestionIndex / this.quizQuestions.length) * 100;
    }
  },
  methods: {
    loadLearningData() {
      this.xp = parseInt(localStorage.getItem('learning_xp')) || 0;
      this.hearts = parseInt(localStorage.getItem('learning_hearts')) || 5;
      this.streak = parseInt(localStorage.getItem('learning_streak')) || 0;
      this.completedLessons = JSON.parse(localStorage.getItem('learning_completed')) || [];
      this.lastActivityDate = localStorage.getItem('learning_last_date') || null;

      // Heart recovery check: If less than 5 hearts, recover 1 heart per 24 hours
      if (this.hearts < 5 && this.lastActivityDate) {
        const last = new Date(this.lastActivityDate);
        const now = new Date();
        const diffHours = Math.floor((now - last) / (1000 * 60 * 60));
        if (diffHours >= 24) {
          const heartsToAdd = Math.floor(diffHours / 24);
          this.hearts = Math.min(5, this.hearts + heartsToAdd);
          this.saveLearningData();
        }
      }
    },
    saveLearningData() {
      localStorage.setItem('learning_xp', this.xp);
      localStorage.setItem('learning_hearts', this.hearts);
      localStorage.setItem('learning_streak', this.streak);
      localStorage.setItem('learning_completed', JSON.stringify(this.completedLessons));
      
      const todayStr = new Date().toDateString();
      localStorage.setItem('learning_last_date', new Date().toISOString());

      // If user logged in, try to sync to profile properties (rank and contributions are database, but we can set XP in localStorage safely)
      window.dispatchEvent(new CustomEvent('learning-data-updated', { detail: { xp: this.xp } }));
    },
    isLessonCompleted(lessonId) {
      return this.completedLessons.includes(lessonId);
    },
    isLessonUnlocked(lessonId) {
      // Find position of this lesson in flattened list
      const flatLessons = [];
      this.units.forEach(u => {
        u.lessons.forEach(l => {
          flatLessons.push(l.id);
        });
      });
      const index = flatLessons.indexOf(lessonId);
      if (index <= 0) return true; // First lesson always unlocked
      const previousLessonId = flatLessons[index - 1];
      return this.completedLessons.includes(previousLessonId);
    },
    async startLesson(lesson) {
      if (!this.isLessonUnlocked(lesson.id)) return;
      if (this.hearts <= 0) {
        alert("Tu n'as plus de cœurs ❤️ ! Attends demain ou gagne de l'XP pour te restaurer.");
        return;
      }

      this.currentLesson = lesson;
      this.isLessonFinished = false;
      // Copy and randomize questions to keep it fresh
      this.quizQuestions = JSON.parse(JSON.stringify(lesson.questions));
      this.currentQuestionIndex = 0;
      this.resetQuestionState();
      this.mascotMood = 'cheer';
      this.mascotText = `Super ! Commençons la leçon "${lesson.name}". Fais de ton mieux !`;

      // Pre-fetch audio if any questions need it
      this.loadingAudio = true;
      try {
        for (let q of this.quizQuestions) {
          if (q.type === 'audio' && q.word) {
            await this.fetchAudioForWord(q.word);
          }
        }
      } catch (err) {
        console.error("Audio pre-fetch warning:", err);
      } finally {
        this.loadingAudio = false;
      }
    },
    async fetchAudioForWord(word) {
      if (this.audioCache[word]) return;
      try {
        const res = await axios.get(`/api/dictionary/search?q=${word}`);
        if (res.data && res.data.exactMatches && res.data.exactMatches.length > 0) {
          const match = res.data.exactMatches.find(m => m.audio_url);
          if (match) {
            this.audioCache[word] = match.audio_url;
          }
        }
      } catch (e) {
        console.warn(`Could not fetch audio from DB for ${word}, using TTS fallback.`);
      }
    },
    resetQuestionState() {
      this.userAnswer = null;
      this.pairingSelectedFon = null;
      this.pairingSelectedFr = null;
      this.pairingMatched = [];
      this.pairingErrors = [];
      this.isAnswerChecked = false;
      this.isCorrect = false;
      this.incorrectAttempts = 0;
      
      const q = this.activeQuestion;
      if (!q) return;

      if (q.type === 'chips') {
        this.userAnswer = []; // list of selected chip strings
      } else if (q.type === 'pairs') {
        // Randomize the left/right columns
        const left = q.pairs.map((p, idx) => ({ word: p.fon, index: idx })).sort(() => Math.random() - 0.5);
        const right = q.pairs.map((p, idx) => ({ word: p.fr, index: idx })).sort(() => Math.random() - 0.5);
        q.scrambledLeft = left;
        q.scrambledRight = right;
      }

      // Read audio immediately if audio type question
      if (q.type === 'audio') {
        this.playAudioHint(q.word);
      }
    },
    playAudioHint(word) {
      if (this.audioCache[word]) {
        const audio = new Audio(this.audioCache[word]);
        audio.play();
      } else {
        // Fallback TTS
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        let cleaned = word.replace(/ɖ/g, 'd').replace(/ɔ/g, 'o').replace(/ɛ/g, 'e');
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.75;
        window.speechSynthesis.speak(utterance);
      }
    },
    selectQcmOption(option) {
      if (this.isAnswerChecked) return;
      this.userAnswer = option;
      this.mascotMood = 'happy';
      this.mascotText = "Choix intéressant ! Voyons si c'est correct...";
    },
    toggleChip(chip) {
      if (this.isAnswerChecked) return;
      const idx = this.userAnswer.indexOf(chip);
      if (idx > -1) {
        this.userAnswer.splice(idx, 1);
      } else {
        this.userAnswer.push(chip);
      }
    },
    isChipSelected(chip) {
      return this.userAnswer && this.userAnswer.includes(chip);
    },
    selectPairItem(item, type) {
      if (this.isAnswerChecked) return;
      
      // Prevent selecting already matched items
      if (this.pairingMatched.includes(item.index)) return;

      if (type === 'fon') {
        this.pairingSelectedFon = item;
      } else {
        this.pairingSelectedFr = item;
      }

      // Check pairing immediately when both selected
      if (this.pairingSelectedFon !== null && this.pairingSelectedFr !== null) {
        if (this.pairingSelectedFon.index === this.pairingSelectedFr.index) {
          // Success match
          this.pairingMatched.push(this.pairingSelectedFon.index);
          this.pairingSelectedFon = null;
          this.pairingSelectedFr = null;

          // Check if all matched
          if (this.pairingMatched.length === this.activeQuestion.pairs.length) {
            this.userAnswer = true; // satisfies check
          }
          this.playChime(true);
        } else {
          // Mismatch
          const fIdx = this.pairingSelectedFon.index;
          const rIdx = this.pairingSelectedFr.index;
          this.pairingErrors = [fIdx, rIdx];
          this.playChime(false);

          setTimeout(() => {
            this.pairingErrors = [];
            this.pairingSelectedFon = null;
            this.pairingSelectedFr = null;
          }, 1000);
        }
      }
    },
    playChime(success) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        if (success) {
          // Happy high double beep
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.25);
        } else {
          // Sad buzz down
          osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
          osc.frequency.linearRampToValueAtTime(147, audioCtx.currentTime + 0.2); // D3
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.25);
        }
      } catch (e) {
        // Fallback quiet
      }
    },
    checkAnswer() {
      if (this.isAnswerChecked) return;
      const q = this.activeQuestion;
      if (!q) return;

      let correct = false;

      if (q.type === 'qcm' || q.type === 'audio') {
        correct = (this.userAnswer === q.answer);
      } else if (q.type === 'chips') {
        correct = (JSON.stringify(this.userAnswer) === JSON.stringify(q.answer));
      } else if (q.type === 'pairs') {
        correct = (this.pairingMatched.length === q.pairs.length);
      }

      this.isCorrect = correct;
      this.isAnswerChecked = true;

      if (correct) {
        this.mascotMood = 'cheer';
        this.mascotText = this.getRandomEncouragement();
        this.playChime(true);
      } else {
        this.mascotMood = 'sad';
        this.mascotText = `Mince alors ! Mais ce n'est pas grave, regarde la bonne réponse ci-dessous.`;
        this.hearts--;
        this.playChime(false);
        this.saveLearningData();
      }
    },
    getRandomEncouragement() {
      const phrases = [
        "Fantastique ! Tu es génial !",
        "Excellent travail ! Continue comme ça !",
        "C'est tout à fait ça ! Impressionnant !",
        "Magnifique ! Le Gbé n'a plus de secrets !",
        "Impressionnant ! Tu apprends si vite !"
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    },
    nextQuestion() {
      if (this.hearts <= 0) {
        this.currentLesson = null; // Exit
        this.resetQuestionState();
        return;
      }

      if (this.currentQuestionIndex + 1 < this.quizQuestions.length) {
        this.currentQuestionIndex++;
        this.resetQuestionState();
        this.mascotMood = 'happy';
        this.mascotText = "Passons à la question suivante. Reste concentré !";
      } else {
        // Lesson Finished!
        this.finishLesson();
      }
    },
    finishLesson() {
      // Award XP
      const xpEarned = this.currentLesson.xp;
      this.xp += xpEarned;

      // Save streak calculation
      const todayStr = new Date().toDateString();
      if (this.lastActivityDate) {
        const last = new Date(this.lastActivityDate).toDateString();
        if (last !== todayStr) {
          const lastDate = new Date(this.lastActivityDate);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (lastDate.toDateString() === yesterday.toDateString()) {
            this.streak++;
          } else {
            this.streak = 1; // broken, restart
          }
        }
      } else {
        this.streak = 1;
      }

      if (!this.completedLessons.includes(this.currentLesson.id)) {
        this.completedLessons.push(this.currentLesson.id);
      }

      this.saveLearningData();
      this.isLessonFinished = true;
      this.mascotMood = 'celebrate';
      this.mascotText = `Félicitations ! Tu as complété la leçon "${this.currentLesson.name}" avec succès ! Tu remportes +${xpEarned} XP ! ✨`;
      this.startConfetti();
    },
    closeLesson() {
      this.currentLesson = null;
      this.isLessonFinished = false;
      this.stopConfetti();
    },
    startConfetti() {
      this.confettiActive = true;
      this.$nextTick(() => {
        const canvas = this.$refs.confettiCanvas;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasContext = canvas.getContext('2d');
        
        // Spawn particles
        this.confettiParticles = [];
        for (let i = 0; i < 150; i++) {
          this.confettiParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * canvas.height,
            color: `hsl(${Math.random() * 360}, 90%, 60%)`,
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0
          });
        }
        
        this.updateConfetti();
      });
    },
    updateConfetti() {
      if (!this.confettiActive) return;
      const ctx = this.canvasContext;
      const canvas = this.$refs.confettiCanvas;
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.confettiParticles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        // Draw particle
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Recycle particles
        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }
      });

      requestAnimationFrame(this.updateConfetti);
    },
    stopConfetti() {
      this.confettiActive = false;
    },
    refillHearts() {
      if (this.xp >= 50) {
        this.xp -= 50;
        this.hearts = 5;
        this.saveLearningData();
        alert("Tes cœurs ont été entièrement restaurés ! ❤️");
      } else {
        alert("Il te faut au moins 50 XP pour recharger tes cœurs !");
      }
    }
  },
  mounted() {
    this.loadLearningData();
  },
  template: `
    <div class="view-learning">
      <!-- BACKGROUND CONFETTI CANVAS -->
      <canvas v-if="confettiActive" ref="confettiCanvas" class="confetti-canvas"></canvas>

      <!-- TOP LEARNING SUBNAV / STATS -->
      <div v-if="!currentLesson" class="container" style="max-width: 800px; margin-top: 10px;">
        <div class="learning-stats-bar glass-card">
          <div class="stat-bubble clickable" @click="handleNav('profile')" title="Vos points XP accumulés">
            <span class="stat-icon">✨</span>
            <span class="stat-val font-fon">{{ xp }} XP</span>
          </div>
          
          <div class="stat-bubble clickable" @click="refillHearts" :title="hearts < 5 ? 'Recharger vos coeurs pour 50 XP' : 'Vos vies sont pleines !'">
            <span class="stat-icon" :style="hearts === 0 ? 'filter: grayscale(1);' : ''">❤️</span>
            <span class="stat-val font-fon">{{ hearts }}/5</span>
            <span v-if="hearts < 5 && xp >= 50" class="refill-btn">Recharger (50 XP)</span>
          </div>

          <div class="stat-bubble" title="Jours consécutifs d'apprentissage">
            <span class="stat-icon">🔥</span>
            <span class="stat-val font-fon">{{ streak }} jours</span>
          </div>
        </div>
      </div>

      <!-- MAIN ROADMAP PATH VIEW -->
      <div v-if="!currentLesson" class="container" style="max-width: 800px; padding: 20px 10px;">
        
        <!-- MASCOT DIALOG -->
        <div class="learning-mascot-row glass-card">
          <div class="mascot-img-wrap">
            <img src="./src/assets/gbebe_mascot.png" class="mascot-avatar" />
          </div>
          <div class="speech-bubble">
            <p>{{ mascotText }}</p>
          </div>
        </div>

        <!-- ROADMAP GRID -->
        <div class="learning-roadmap">
          <div v-for="unit in units" :key="unit.id" class="unit-section">
            <div class="unit-header-card" :style="{ '--unit-color': unit.color }">
              <h3>{{ unit.title }}</h3>
              <p>{{ unit.desc }}</p>
            </div>

            <div class="unit-nodes-flow">
              <div 
                v-for="(lesson, index) in unit.lessons" 
                :key="lesson.id" 
                class="node-wrapper"
                :class="'pos-' + (index % 3)"
              >
                <!-- Connective dotted SVG paths could go here, but a simplified zigzag flow is responsive -->
                <button 
                  @click="startLesson(lesson)" 
                  class="path-node"
                  :class="{ 
                    'locked': !isLessonUnlocked(lesson.id), 
                    'completed': isLessonCompleted(lesson.id),
                    'active': isLessonUnlocked(lesson.id) && !isLessonCompleted(lesson.id)
                  }"
                  :style="isLessonUnlocked(lesson.id) ? { '--node-color': unit.color } : {}"
                  :title="lesson.name"
                >
                  <lucide-icon v-if="isLessonCompleted(lesson.id)" name="award" :size="28" />
                  <lucide-icon v-else-if="!isLessonUnlocked(lesson.id)" name="lock" :size="24" />
                  <lucide-icon v-else name="play" :size="24" />
                  
                  <!-- Circular progress boundary for active nodes -->
                  <div v-if="isLessonUnlocked(lesson.id) && !isLessonCompleted(lesson.id)" class="active-node-ring"></div>
                </button>
                
                <div class="node-label">
                  <span class="node-name">{{ lesson.name }}</span>
                  <span class="node-desc">{{ lesson.desc }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIVE LESSON QUIZ INTERFACE -->
      <div v-else class="fullscreen-lesson-overlay">
        <!-- LESSON HEADER -->
        <div class="lesson-header container">
          <button @click="closeLesson" class="lesson-close-btn" title="Quitter la leçon">
            <lucide-icon name="x" :size="24" />
          </button>
          
          <div class="lesson-progress-bar-container">
            <div class="lesson-progress-bar-fill" :style="{ width: lessonProgress + '%' }"></div>
          </div>

          <div class="lesson-hearts">
            <lucide-icon name="heart" class="heart-icon-red animate-pulse" />
            <span class="hearts-count">{{ hearts }}</span>
          </div>
        </div>

        <!-- LESSON CONTENT -->
        <div class="lesson-content-container container">
          
          <!-- MASCOT FEEDBACK AREA -->
          <div class="quiz-mascot-bubble-area">
            <img src="./src/assets/gbebe_mascot.png" class="quiz-mascot-img" :class="'mood-' + mascotMood" />
            <div class="quiz-speech-bubble">
              <p>{{ mascotText }}</p>
            </div>
          </div>

          <!-- QUESTION INTERFACE -->
          <div v-if="activeQuestion" class="quiz-card glass-card">
            
            <div class="quiz-question-title">{{ activeQuestion.question }}</div>

            <!-- 1. QCM / MULTIPLE CHOICE -->
            <div v-if="activeQuestion.type === 'qcm'" class="options-grid">
              <button 
                v-for="opt in activeQuestion.options" 
                :key="opt"
                @click="selectQcmOption(opt)"
                class="qcm-option-btn"
                :class="{ 
                  'selected': userAnswer === opt,
                  'correct': isAnswerChecked && opt === activeQuestion.answer,
                  'incorrect': isAnswerChecked && userAnswer === opt && opt !== activeQuestion.answer,
                  'disabled': isAnswerChecked
                }"
                :disabled="isAnswerChecked"
              >
                {{ opt }}
              </button>
            </div>

            <!-- 2. WORD CHIPS SENTENCE BUILDER -->
            <div v-else-if="activeQuestion.type === 'chips'" class="chips-builder-area">
              <!-- Selected area -->
              <div class="chips-selected-slots">
                <span v-if="userAnswer.length === 0" class="chips-placeholder">
                  Clique sur les mots ci-dessous pour assembler la phrase...
                </span>
                <button 
                  v-for="chip in userAnswer" 
                  :key="'sel-' + chip"
                  @click="toggleChip(chip)"
                  class="word-chip selected animate-pop"
                  :disabled="isAnswerChecked"
                >
                  {{ chip }}
                </button>
              </div>

              <!-- Available bank -->
              <div class="chips-bank-slots">
                <button 
                  v-for="chip in activeQuestion.chips" 
                  :key="'bank-' + chip"
                  @click="toggleChip(chip)"
                  class="word-chip"
                  :class="{ 'dimmed': isChipSelected(chip) }"
                  :disabled="isChipSelected(chip) || isAnswerChecked"
                >
                  {{ chip }}
                </button>
              </div>
            </div>

            <!-- 3. COMPREHENSION AUDIO -->
            <div v-else-if="activeQuestion.type === 'audio'" class="audio-comprehension-area">
              <div class="audio-play-box">
                <button @click="playAudioHint(activeQuestion.word)" class="btn-play-quiz-audio" title="Écouter le mot">
                  <lucide-icon name="volume-2" :size="48" />
                </button>
                <span class="audio-play-label">Écouter la prononciation</span>
              </div>

              <div class="options-grid" style="margin-top: 30px;">
                <button 
                  v-for="opt in activeQuestion.options" 
                  :key="opt"
                  @click="selectQcmOption(opt)"
                  class="qcm-option-btn"
                  :class="{ 
                    'selected': userAnswer === opt,
                    'correct': isAnswerChecked && opt === activeQuestion.answer,
                    'incorrect': isAnswerChecked && userAnswer === opt && opt !== activeQuestion.answer,
                    'disabled': isAnswerChecked
                  }"
                  :disabled="isAnswerChecked"
                >
                  {{ opt }}
                </button>
              </div>
            </div>

            <!-- 4. MATCHING PAIRS -->
            <div v-else-if="activeQuestion.type === 'pairs'" class="matching-pairs-area">
              <div class="pairs-grid">
                <!-- Left: Fon -->
                <div class="pairs-column">
                  <button 
                    v-for="item in activeQuestion.scrambledLeft" 
                    :key="'l-' + item.word"
                    @click="selectPairItem(item, 'fon')"
                    class="pair-btn"
                    :class="{
                      'selected': pairingSelectedFon && pairingSelectedFon.word === item.word,
                      'matched': pairingMatched.includes(item.index),
                      'error animate-shake': pairingErrors.includes(item.index)
                    }"
                    :disabled="pairingMatched.includes(item.index) || isAnswerChecked"
                  >
                    {{ item.word }}
                  </button>
                </div>

                <!-- Right: French -->
                <div class="pairs-column">
                  <button 
                    v-for="item in activeQuestion.scrambledRight" 
                    :key="'r-' + item.word"
                    @click="selectPairItem(item, 'fr')"
                    class="pair-btn"
                    :class="{
                      'selected': pairingSelectedFr && pairingSelectedFr.word === item.word,
                      'matched': pairingMatched.includes(item.index),
                      'error animate-shake': pairingErrors.includes(item.index)
                    }"
                    :disabled="pairingMatched.includes(item.index) || isAnswerChecked"
                  >
                    {{ item.word }}
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- END CELEBRATION (VICTORY) CARD -->
          <div v-else class="victory-card glass-card text-center scale-in">
            <div class="trophy-wrap">✨🏆✨</div>
            <h2>Félicitations !</h2>
            <p>Tu as complété la leçon avec brio.</p>
            
            <div class="victory-stats-row">
              <div class="v-stat-box">
                <span class="v-val font-fon">+{{ currentLesson.xp }}</span>
                <span class="v-lbl">XP Gagnés</span>
              </div>
              <div class="v-stat-box">
                <span class="v-val">❤️ {{ hearts }}</span>
                <span class="v-lbl">Vies Restantes</span>
              </div>
            </div>

            <button @click="closeLesson" class="btn-save-next" style="margin: 30px auto 0;">
              Continuer le parcours <lucide-icon name="arrow-right" />
            </button>
          </div>

        </div>

        <!-- VALIDATION BOTTOM BAR -->
        <div 
          v-if="activeQuestion && !isAnswerChecked" 
          class="quiz-validation-footer"
          :class="{ 'has-selection': userAnswer !== null && (!Array.isArray(userAnswer) || userAnswer.length > 0) }"
        >
          <div class="container footer-inner">
            <button 
              @click="checkAnswer" 
              class="btn-verify-quiz"
              :disabled="userAnswer === null || (Array.isArray(userAnswer) && userAnswer.length === 0)"
            >
              Vérifier la réponse
            </button>
          </div>
        </div>

        <!-- RESULTS BOTTOM BAR -->
        <div 
          v-else-if="activeQuestion && isAnswerChecked" 
          class="quiz-validation-footer checked"
          :class="isCorrect ? 'success' : 'error'"
        >
          <div class="container footer-inner">
            <div class="validation-msg">
              <div class="v-icon">
                <lucide-icon v-if="isCorrect" name="check-circle" :size="32" />
                <lucide-icon v-else name="alert-circle" :size="32" />
              </div>
              <div class="v-text-wrap">
                <h4 v-if="isCorrect" style="color: #2ec4b6;">Excellent ! C'est tout à fait ça.</h4>
                <h4 v-else style="color: #e71d36;">Oups, ce n'est pas correct !</h4>
                
                <p v-if="!isCorrect && activeQuestion.answer" class="correct-answer-display">
                  La bonne réponse était : <strong>{{ Array.isArray(activeQuestion.answer) ? activeQuestion.answer.join(' ') : activeQuestion.answer }}</strong>
                </p>
                <p v-if="activeQuestion.hint" class="hint-display">
                  💡 {{ activeQuestion.hint }}
                </p>
              </div>
            </div>

            <button 
              @click="nextQuestion" 
              class="btn-verify-quiz next"
              :class="isCorrect ? 'success' : 'error'"
            >
              {{ hearts <= 0 ? 'Quitter la leçon' : 'Continuer' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `
};
