// app/src/views/Learning.js
import LucideIcon from '../components/LucideIcon.js';

export default {
  components: { LucideIcon },
  emits: ['navigate'],
  props: {
    user: {
      type: Object,
      default: null
    }
  },
  watch: {
    user: {
      handler(newVal) {
        if (newVal) {
          this.loadLearningData();
        }
      },
      deep: true
    }
  },
  data() {
    return {
      // User Learning Stats (synchronized with Supabase DB or managed in-memory)
      xp: 0,
      hearts: 5,
      streak: 0,
      completedLessons: [], // list of unit-lesson keys like "1-1", "1-2"
      lastActivityDate: null,

      // View state
      currentLesson: null, // null if on path view, else active lesson object
      loadingAudio: false,
      showGuides: false,
      activeGuideTab: 'alphabet', // alphabet | grammar | salutations | numbers | vocab

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
                  type: "qcm",
                  question: "Que signifie la réponse 'un ɖo ganji' en Français ?",
                  options: ["Je vais bien", "Bonjour", "Au revoir", "Merci"],
                  answer: "Je vais bien",
                  hint: "En Fon, 'un ɖo ganji' signifie 'Je vais bien'."
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Bienvenue' :",
                  word: "ku abɔ",
                  options: ["ku abɔ", "a wà nŭ", "sin", "nyɔnu"],
                  answer: "ku abɔ",
                  hint: "Écoute bien la prononciation de ku abɔ (Bienvenue)."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la transcription pour 'Comment vas-tu ?' :",
                  word: "a ɖò ganjí à",
                  options: ["a ɖò ganjí à", "un ɖo ganji", "éɖabɔ", "kúdo gbáda"],
                  answer: "a ɖò ganjí à",
                  hint: "C'est la forme interrogative 'a ɖò ganjí à'."
                },
                {
                  type: "pairs",
                  question: "Associe chaque expression avec sa traduction :",
                  pairs: [
                    { fon: "bo kudo zanzan", fr: "Bonjour" },
                    { fon: "ku abɔ", fr: "Bienvenue" },
                    { fon: "a ɖò ganjí à", fr: "Comment vas-tu ?" }
                  ]
                },
                {
                  type: "qcm",
                  question: "Que signifie 'bo kudo zanzan' ?",
                  options: ["Bonjour", "Merci", "Au revoir", "Eau"],
                  answer: "Bonjour",
                  hint: "Bonjour se dit 'bo kudo zanzan' en Fon."
                },
                {
                  type: "pairs",
                  question: "Associe ces salutations :",
                  pairs: [
                    { fon: "un ɖo ganji", fr: "Je vais bien" },
                    { fon: "ku abɔ", fr: "Bienvenue" },
                    { font: "bo kudo zanzan", fr: "Bonjour" }
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Bonsoir' :",
                  word: "kúdo gbáda",
                  options: ["kúdo gbáda", "a wà nŭ", "éɖabɔ", "vǐ"],
                  answer: "kúdo gbáda",
                  hint: "Écoute bien la prononciation de kúdo gbáda (Bonsoir)."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la transcription pour 'Au revoir' :",
                  word: "éɖabɔ",
                  options: ["éɖabɔ", "ku abɔ", "ɖokpó", "lan"],
                  answer: "éɖabɔ",
                  hint: "C'est 'éɖabɔ' pour dire Au revoir."
                },
                {
                  type: "pairs",
                  question: "Associe chaque mot avec sa traduction :",
                  pairs: [
                    { fon: "kúdo gbáda", fr: "Bonsoir" },
                    { fon: "a wà nŭ", fr: "Merci" },
                    { fon: "éɖabɔ", fr: "Au revoir" }
                  ]
                },
                {
                  type: "qcm",
                  question: "Que signifie l'expression 'kúdo gbáda' ?",
                  options: ["Bonsoir", "Bonjour", "Merci", "Mère"],
                  answer: "Bonsoir",
                  hint: "kúdo gbáda correspond à Bonsoir."
                },
                {
                  type: "qcm",
                  question: "Que signifie le mot 'a wà nŭ' ?",
                  options: ["Merci", "Père", "Deux", "Eau"],
                  answer: "Merci",
                  hint: "Merci se dit 'a wà nŭ'."
                },
                {
                  type: "pairs",
                  question: "Associe ces formules de politesse :",
                  pairs: [
                    { fon: "éɖabɔ", fr: "Au revoir" },
                    { fon: "a wà nŭ", fr: "Merci" },
                    { fon: "kúdo gbáda", fr: "Bonsoir" }
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Deux' :",
                  word: "wè",
                  options: ["wè", "ɖokpó", "atɔn", "atɔ́ɔ́n"],
                  answer: "wè",
                  hint: "C'est le chiffre wè (Deux)."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Trois' :",
                  word: "atɔn",
                  options: ["atɔn", "wè", "ɛnɛ", "ɖokpó"],
                  answer: "atɔn",
                  hint: "C'est le chiffre atɔn (Trois)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque nombre avec sa traduction :",
                  pairs: [
                    { fon: "ɖokpó", fr: "Un" },
                    { fon: "wè", fr: "Deux" },
                    { fon: "atɔn", fr: "Trois" }
                  ]
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Deux' en Fon ?",
                  options: ["wè", "ɖokpó", "atɔn", "ɛnɛ"],
                  answer: "wè",
                  hint: "Deux se dit 'wè'."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Trois' en Fon ?",
                  options: ["atɔn", "wè", "ɖokpó", "atɔ́ɔ́n"],
                  answer: "atɔn",
                  hint: "Trois se dit 'atɔn'."
                },
                {
                  type: "pairs",
                  question: "Réassocie les chiffres pour validation :",
                  pairs: [
                    { fon: "atɔn", fr: "Trois" },
                    { fon: "wè", fr: "Deux" },
                    { fon: "ɖokpó", fr: "Un" }
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Quatre' :",
                  word: "ɛnɛ",
                  options: ["ɛnɛ", "atɔ́ɔ́n", "atɔn", "ɖokpó"],
                  answer: "ɛnɛ",
                  hint: "Écoute bien la prononciation de ɛnɛ (Quatre)."
                },
                {
                  type: "qcm",
                  question: "Que signifie 'ɛnɛ' ?",
                  options: ["Quatre", "Un", "Trois", "Cinq"],
                  answer: "Quatre",
                  hint: "ɛnɛ correspond à Quatre."
                },
                {
                  type: "qcm",
                  question: "Que signifie le nombre 'atɔ́ɔ́n' ?",
                  options: ["Cinq", "Deux", "Quatre", "Trois"],
                  answer: "Cinq",
                  hint: "atɔ́ɔ́n correspond à Cinq."
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
                },
                {
                  type: "qcm",
                  question: "Quel nombre correspond à 'ɛnɛ' ?",
                  options: ["Quatre", "Deux", "Un", "Maison"],
                  answer: "Quatre",
                  hint: "ɛnɛ veut dire Quatre."
                },
                {
                  type: "qcm",
                  question: "Quel nombre correspond à 'atɔ́ɔ́n' ?",
                  options: ["Cinq", "Trois", "Frère", "Bonjour"],
                  answer: "Cinq",
                  hint: "atɔ́ɔ́n veut dire Cinq."
                },
                {
                  type: "pairs",
                  question: "Associe les chiffres restants :",
                  pairs: [
                    { fon: "atɔ́ɔ́n", fr: "Cinq" },
                    { fon: "ɛnɛ", fr: "Quatre" },
                    { fon: "ɖokpó", fr: "Un" },
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Boire' :",
                  word: "nù",
                  options: ["nù", "sin", "ɖu", "wɔ̌xúxú"],
                  answer: "nù",
                  hint: "Écoute bien la prononciation de nù (Boire)."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on le verbe 'Boire' en Fon ?",
                  options: ["nù", "ɖu", "tɔ́", "ku abɔ"],
                  answer: "nù",
                  hint: "Boire se dit 'nù'."
                },
                {
                  type: "qcm",
                  question: "Que signifie le mot 'sin' ?",
                  options: ["Eau", "Pain", "Viande", "Père"],
                  answer: "Eau",
                  hint: "sin signifie Eau."
                },
                {
                  type: "qcm",
                  question: "Quelle est la traduction de 'sin' ?",
                  options: ["Eau", "Manger", "Bienvenue", "Au revoir"],
                  answer: "Eau",
                  hint: "sin est l'Eau."
                },
                {
                  type: "qcm",
                  question: "Quelle est la traduction de 'nù' ?",
                  options: ["Boire", "Maison", "Deux", "Trois"],
                  answer: "Boire",
                  hint: "nù est Boire."
                },
                {
                  type: "pairs",
                  question: "Associe chaque élément avec sa traduction :",
                  pairs: [
                    { fon: "sin", fr: "Eau" },
                    { fon: "nù", fr: "Boire" }
                  ]
                },
                {
                  type: "pairs",
                  question: "Réassocie les mots liés à la boisson :",
                  pairs: [
                    { fon: "nù", fr: "Boire" },
                    { fon: "sin", fr: "Eau" }
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Viande' :",
                  word: "lan",
                  options: ["lan", "wɔ̌xúxú", "ɖu", "sin"],
                  answer: "lan",
                  hint: "Écoute bien la prononciation de lan (Viande)."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Manger' :",
                  word: "ɖu",
                  options: ["ɖu", "nù", "lan", "wɔ̌xúxú"],
                  answer: "ɖu",
                  hint: "Écoute bien la prononciation de ɖu (Manger)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque élément alimentaire :",
                  pairs: [
                    { fon: "wɔ̌xúxú", fr: "Pain" },
                    { fon: "lan", fr: "Viande" },
                    { fon: "ɖu", fr: "Manger" }
                  ]
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Manger' en Fon ?",
                  options: ["ɖu", "nù", "tɔ́", "nɔ̂"],
                  answer: "ɖu",
                  hint: "Manger se dit 'ɖu'."
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Viande' en Fon ?",
                  options: ["lan", "wɔ̌xúxú", "sin", "atɔn"],
                  answer: "lan",
                  hint: "Viande se dit 'lan'."
                },
                {
                  type: "pairs",
                  question: "Réassocie les aliments :",
                  pairs: [
                    { fon: "ɖu", fr: "Manger" },
                    { fon: "lan", fr: "Viande" },
                    { fon: "wɔ̌xúxú", fr: "Pain" }
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Père' :",
                  word: "tɔ́",
                  options: ["tɔ́", "nɔ̂", "vǐ", "nyɔnu"],
                  answer: "tɔ́",
                  hint: "Écoute bien la prononciation de tɔ́ (Père)."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Enfant' :",
                  word: "vǐ",
                  options: ["vǐ", "tɔ́", "nɔ̂", "nɔví"],
                  answer: "vǐ",
                  hint: "Écoute bien la prononciation de vǐ (Enfant)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque parent avec sa traduction :",
                  pairs: [
                    { fon: "nɔ̂", fr: "Mère" },
                    { font: "tɔ́", fr: "Père" },
                    { fon: "vǐ", fr: "Enfant" }
                  ]
                },
                {
                  type: "qcm",
                  question: "Comment dit-on 'Enfant' en Fon ?",
                  options: ["vǐ", "tɔ́", "nɔ̂", "nyɔnu"],
                  answer: "vǐ",
                  hint: "Enfant se dit 'vǐ'."
                },
                {
                  type: "qcm",
                  question: "Que signifie le mot 'tɔ́' en Français ?",
                  options: ["Père", "Mère", "Enfant", "Frère"],
                  answer: "Père",
                  hint: "tɔ́ veut dire Père."
                },
                {
                  type: "pairs",
                  question: "Associe les rôles familiaux :",
                  pairs: [
                    { fon: "vǐ", fr: "Enfant" },
                    { fon: "tɔ́", fr: "Père" },
                    { fon: "nɔ̂", fr: "Mère" }
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
                  type: "audio",
                  question: "Écoute et sélectionne la bonne transcription pour 'Sœur' :",
                  word: "nyɔnu",
                  options: ["nyɔnu", "nɔví súnnu", "nɔ̂", "tɔ́"],
                  answer: "nyɔnu",
                  hint: "Écoute bien la prononciation de nyɔnu (Sœur)."
                },
                {
                  type: "audio",
                  question: "Écoute et sélectionne la transcription pour 'Frère/Sœur' :",
                  word: "nɔví",
                  options: ["nɔví", "nyɔnu", "nɔví súnnu", "vǐ"],
                  answer: "nɔví",
                  hint: "Écoute bien la prononciation de nɔví (Frère/Sœur)."
                },
                {
                  type: "pairs",
                  question: "Associe chaque membre de la fratrie :",
                  pairs: [
                    { fon: "nɔví súnnu", fr: "Frère" },
                    { fon: "nyɔnu", fr: "Sœur" },
                    { fon: "nɔví", fr: "Frère/Sœur" }
                  ]
                },
                {
                  type: "qcm",
                  question: "Que signifie le mot 'nyɔnu' ?",
                  options: ["Sœur", "Mère", "Frère", "Enfant"],
                  answer: "Sœur",
                  hint: "nyɔnu correspond à Sœur."
                },
                {
                  type: "qcm",
                  question: "Que signifie 'nɔví súnnu' ?",
                  options: ["Frère", "Père", "Enfant", "Sœur"],
                  answer: "Frère",
                  hint: "nɔví súnnu correspond à Frère."
                },
                {
                  type: "pairs",
                  question: "Réassocie les membres de la fratrie :",
                  pairs: [
                    { fon: "nɔví", fr: "Frère/Sœur" },
                    { fon: "nyɔnu", fr: "Sœur" },
                    { fon: "nɔví súnnu", fr: "Frère" }
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
      // 1. If user is logged in, load directly from their profile data (Source of Truth)
      if (this.user) {
        this.xp = this.user.learning_xp || 0;
        this.hearts = this.user.learning_hearts !== undefined && this.user.learning_hearts !== null ? this.user.learning_hearts : 5;
        this.streak = this.user.learning_streak || 0;
        this.completedLessons = this.user.learning_completed || [];
        this.lastActivityDate = this.user.learning_last_date || null;
      } else {
        // 2. Guest defaults (strictly in-memory, resets on page refresh)
        this.xp = 0;
        this.hearts = 5;
        this.streak = 0;
        this.completedLessons = [];
        this.lastActivityDate = null;
      }

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
    async saveLearningData() {
      const nowStr = new Date().toISOString();
      this.lastActivityDate = nowStr;

      // Dispatch event to sync to profile properties locally
      window.dispatchEvent(new CustomEvent('learning-data-updated', { detail: { xp: this.xp } }));

      // If user logged in, sync directly to the remote database
      if (this.user && this.user.id) {
        try {
          const res = await axios.post('/api/auth/sync-learning', {
            id: this.user.id,
            xp: this.xp,
            hearts: this.hearts,
            streak: this.streak,
            completed_lessons: this.completedLessons,
            last_activity_date: nowStr
          });
          if (res.data.success) {
            console.log("Learning synced to Supabase successfully.");
            const updatedUser = {
              ...this.user,
              learning_xp: this.xp,
              learning_hearts: this.hearts,
              learning_streak: this.streak,
              learning_completed: this.completedLessons,
              learning_last_date: nowStr
            };
            // Notify App.js to update the reactive user state
            window.dispatchEvent(new CustomEvent('user-updated', { detail: { user: updatedUser } }));
          }
        } catch (e) {
          console.error("Failed to sync learning progress:", e);
        }
      }
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
          <div class="stat-bubble clickable" @click="$emit('navigate', 'profile')" title="Vos points XP accumulés">
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
        
        <!-- TABS BAR -->
        <div style="display: flex; gap: 12px; margin-bottom: 25px;">
          <button @click="showGuides = false" class="main-tab-btn" :class="{ active: !showGuides }" style="flex: 1; justify-content: center; border-radius: 20px;">
            <lucide-icon name="play-circle" />
            <span>Parcours de Jeu</span>
          </button>
          <button @click="showGuides = true" class="main-tab-btn" :class="{ active: showGuides }" style="flex: 1; justify-content: center; border-radius: 20px;">
            <lucide-icon name="book-open" />
            <span>Guides &amp; Grammaire</span>
          </button>
        </div>

        <!-- CONDITIONAL RENDER: ROADMAP OR GUIDES -->
        <div v-if="!showGuides">
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

        <!-- NEW LINGUISTIC LEARNING GUIDES & CHEATSHEETS -->
        <div v-else class="learning-guides-area slide-up" style="animation: fadeIn 0.4s ease;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;">
            <button @click="activeGuideTab = 'alphabet'" class="filter-chip" :class="{ 'chip-active': activeGuideTab === 'alphabet' }">🔤 Alphabet &amp; Tons</button>
            <button @click="activeGuideTab = 'grammar'" class="filter-chip" :class="{ 'chip-active': activeGuideTab === 'grammar' }">📝 Grammaire &amp; Conjugaison</button>
            <button @click="activeGuideTab = 'salutations'" class="filter-chip" :class="{ 'chip-active': activeGuideTab === 'salutations' }">🗣️ Salutations &amp; Relations</button>
            <button @click="activeGuideTab = 'numbers'" class="filter-chip" :class="{ 'chip-active': activeGuideTab === 'numbers' }">🔢 Nombres &amp; Logique</button>
            <button @click="activeGuideTab = 'vocab'" class="filter-chip" :class="{ 'chip-active': activeGuideTab === 'vocab' }">📚 Survie &amp; Expressions</button>
          </div>

          <!-- GUIDE 1: ALPHABET & TONS -->
          <div v-if="activeGuideTab === 'alphabet'" class="glass-card animate-fadeIn" style="padding: 30px; border-radius: 24px; border: 1px solid var(--glass-border);">
            <h3 class="gradient-text" style="font-size: 1.8rem; margin-bottom: 15px;">🔤 Alphabet Standard &amp; Système de Tons</h3>
            <p style="opacity: 0.8; line-height: 1.6; margin-bottom: 20px;">
              Le Fon (fɔ̀ngbè) utilise l'alphabet latin officiel standardisé par le <strong>CENALA</strong> (Bénin), enrichi de caractères phonétiques spéciaux et de digrammes indispensables pour transcrire fidèlement ses sons et ses variations de hauteur mélodique.
            </p>

            <h4 style="color: white; font-weight: 800; margin-top: 25px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Les 3 lettres spéciales du Fon
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: var(--primary); font-size: 1.6rem;" class="font-fon">Ɖ / ɖ</strong>
                  <span class="badge-luxury" style="font-size: 0.65rem;">Rétroflexe</span>
                </div>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0; line-height: 1.4;">
                  Un "d" prononcé avec le bout de la langue replié vers le palais. <br>
                  <em>Exemple :</em> <strong class="font-fon">ɖu</strong> (manger).
                </p>
              </div>

              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: var(--primary); font-size: 1.6rem;" class="font-fon">Ɛ / ɛ</strong>
                  <span class="badge-luxury" style="font-size: 0.65rem;">È ouvert</span>
                </div>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0; line-height: 1.4;">
                  Se prononce comme le "è" ouvert français dans le mot "mer". <br>
                  <em>Exemple :</em> <strong class="font-fon">ɛnɛ</strong> (quatre).
                </p>
              </div>

              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="color: var(--primary); font-size: 1.6rem;" class="font-fon">Ɔ / ɔ</strong>
                  <span class="badge-luxury" style="font-size: 0.65rem;">O ouvert</span>
                </div>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0; line-height: 1.4;">
                  Se prononce comme le "o" ouvert français dans le mot "fort". <br>
                  <em>Exemple :</em> <strong class="font-fon">tɔn</strong> (de/possessif).
                </p>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Consonnes Complexes (Digrammes)
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px;">
              Certaines articulations doubles exigent de prononcer deux consonnes simultanément, typiques des langues de l'Afrique de l'Ouest :
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; font-size: 0.88rem;">
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.02);">
                <strong style="color: white;" class="font-fon">gb</strong> : Consonne labio-vélaire sonore. Prononcez "g" et "b" en même temps. <br><small style="opacity: 0.5;">Ex: <strong>fɔ̀ngbè</strong> (langue fon).</small>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.02);">
                <strong style="color: white;" class="font-fon">kp</strong> : Variante sourde du précédent. Prononcez "k" et "p" simultanément. <br><small style="opacity: 0.5;">Ex: <strong>ɖokpó</strong> (un).</small>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.02);">
                <strong style="color: white;" class="font-fon">ny</strong> : Se prononce comme le "gn" français dans "champagne". <br><small style="opacity: 0.5;">Ex: <strong>nyɔnu</strong> (femme/sœur).</small>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.02);">
                <strong style="color: white;" class="font-fon">hw / xw</strong> : Fricatives arrondies aspirées (proches de "wh" en anglais ou "x" espagnol). <br><small style="opacity: 0.5;">Ex: <strong>xwégbé</strong> (maison).</small>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Nasalisation des Voyelles
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px;">
              Le Fon comprend 7 voyelles orales et 5 voyelles nasales (notées par un suffixe <strong>"n"</strong>). La nasalisation est un marqueur sémantique fondamental :
            </p>
            <div style="background: rgba(255, 107, 53, 0.03); padding: 15px 20px; border-radius: 16px; border: 1px dashed rgba(255, 107, 53, 0.2); display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
              <div style="text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">Oral</span> <br>
                <strong class="font-fon" style="color: white; font-size: 1.3rem;">sà</strong> <br>
                <span style="color: var(--primary); font-weight: 700; font-size: 0.85rem;">Vendre</span>
              </div>
              <div style="font-size: 1.5rem; opacity: 0.3;">≠</div>
              <div style="text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">Nasal (avec "n")</span> <br>
                <strong class="font-fon" style="color: white; font-size: 1.3rem;">sàn</strong> <br>
                <span style="color: #2ec4b6; font-weight: 700; font-size: 0.85rem;">Couler / Couler de l'eau</span>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Le Pouvoir Absolu des Tons (La Mélodie)
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px;">
              Le Fon est une <strong>langue à tons</strong>. La hauteur musicale de votre voix change radicalement le sens d'un mot orthographié de la même manière :
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                <span style="font-size: 0.75rem; opacity: 0.5; text-transform: uppercase;">Ton Haut (´)</span> <br>
                <strong class="font-fon" style="color: var(--primary); font-size: 1.4rem;">kɔ́</strong> <br>
                <span style="color: white; font-weight: 600; font-size: 0.9rem;">Le Cou</span>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                <span style="font-size: 0.75rem; opacity: 0.5; text-transform: uppercase;">Ton Bas (`)</span> <br>
                <strong class="font-fon" style="color: var(--primary); font-size: 1.4rem;">kɔ̀</strong> <br>
                <span style="color: white; font-weight: 600; font-size: 0.9rem;">La Boue / Le Sol</span>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                <span style="font-size: 0.75rem; opacity: 0.5; text-transform: uppercase;">Ton Montant (ˇ)</span> <br>
                <strong class="font-fon" style="color: var(--primary); font-size: 1.4rem;">kɔ̌</strong> <br>
                <span style="color: white; font-weight: 600; font-size: 0.9rem;">Refuser</span>
              </div>
            </div>
          </div>

          <!-- GUIDE 2: GRAMMAIRE & CONJUGAISON -->
          <div v-if="activeGuideTab === 'grammar'" class="glass-card animate-fadeIn" style="padding: 30px; border-radius: 24px; border: 1px solid var(--glass-border);">
            <h3 class="gradient-text" style="font-size: 1.8rem; margin-bottom: 15px;">📝 Syntaxe, Pronoms &amp; Marqueurs de Temps</h3>
            <p style="opacity: 0.8; line-height: 1.6; margin-bottom: 20px;">
              Le Fon est une <strong>langue isolante</strong> : les mots y sont invariables. Pas de conjugaisons compliquées, pas d'accords en genre ou en nombre. Tout repose sur l'ordre des mots (Sujet + Verbe + Objet) et l'utilisation de marqueurs de contexte.
            </p>
            
            <h4 style="color: white; font-weight: 800; margin-top: 25px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Table des Pronoms Personnels
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 25px;">
              <div style="background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>1ère Sing. (Je / Moi)</span>
                <strong style="color: var(--primary);" class="font-fon">ùn / mì</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>1ère Plur. (Nous)</span>
                <strong style="color: var(--primary);" class="font-fon">mǐ</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>2ème Sing. (Tu / Toi)</span>
                <strong style="color: var(--primary);" class="font-fon">a</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>2ème Plur. (Vous)</span>
                <strong style="color: var(--primary);" class="font-fon">mi</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>3ème Sing. (Il / Elle)</span>
                <strong style="color: var(--primary);" class="font-fon">é</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>3ème Plur. (Ils / Elles)</span>
                <strong style="color: var(--primary);" class="font-fon">ye</strong>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Possession Postpositionnelle (L'inversion possessive)
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px;">
              En Fon, on ne place pas l'adjectif possessif devant le nom. On place le nom d'abord, suivi du possesseur, souvent lié par la particule de possession <strong class="font-fon" style="color:var(--primary)">tɔn</strong> :
            </p>
            <div style="background: rgba(255,255,255,0.02); padding: 15px 20px; border-radius: 16px; border: 1px solid var(--glass-border); margin-bottom: 25px; line-height: 1.8;">
              • Ma maison ➔ <strong class="font-fon" style="color:var(--primary)">xɔ ce tɔn</strong> <span style="opacity:0.5;">(Maison + de moi)</span><br>
              • Son pain ➔ <strong class="font-fon" style="color:var(--primary)">wɔ̌xúxú tɔn</strong> <span style="opacity:0.5;">(Pain + de lui/elle)</span><br>
              • Ta viande ➔ <strong class="font-fon" style="color:var(--primary)">lan tɔwé tɔn</strong> <span style="opacity:0.5;">(Viande + de toi)</span>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Conjugaison : Le Système d'Aspects &amp; Temps
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px;">
              Le verbe reste <strong>strictement invariable</strong>. Pour marquer le temps ou le déroulement de l'action, on insère des marqueurs directement après le pronom sujet :
            </p>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 25px;">
              <div style="background: rgba(0,0,0,0.12); padding: 12px 15px; border-radius: 12px; border-left: 4px solid #ff6b35;">
                <span style="font-weight: 700; color: white;">Aoriste (Présent / Passé immédiat)</span> : Verbe nu. <br>
                ➔ <strong class="font-fon" style="color:var(--primary);">ùn ɖu</strong> = Je mange / J'ai mangé.
              </div>
              <div style="background: rgba(0,0,0,0.12); padding: 12px 15px; border-radius: 12px; border-left: 4px solid #4cc9f0;">
                <span style="font-weight: 700; color: white;">Futur</span> : Particule <strong class="font-fon" style="color:var(--primary);">na</strong> devant le verbe. <br>
                ➔ <strong class="font-fon" style="color:var(--primary);">ùn na ɖu</strong> = Je vais manger.
              </div>
              <div style="background: rgba(0,0,0,0.12); padding: 12px 15px; border-radius: 12px; border-left: 4px solid #7209b7;">
                <span style="font-weight: 700; color: white;">Passé Accomplie</span> : Particules <strong class="font-fon" style="color:var(--primary);">ko</strong> (déjà) ou <strong class="font-fon" style="color:var(--primary);">ɖo</strong>. <br>
                ➔ <strong class="font-fon" style="color:var(--primary);">ùn ko ɖu</strong> = J'ai déjà mangé.
              </div>
              <div style="background: rgba(0,0,0,0.12); padding: 12px 15px; border-radius: 12px; border-left: 4px solid #f72585;">
                <span style="font-weight: 700; color: white;">Présent Progressif (En train de)</span> : Particule <strong class="font-fon" style="color:var(--primary);">ɖò</strong> et suffixe <strong class="font-fon" style="color:var(--primary);">wɛ́</strong> avec redoublement du verbe ! <br>
                ➔ <strong class="font-fon" style="color:var(--primary);">ùn ɖò ɖuɖu wɛ́</strong> = Je suis en train de manger.
              </div>
              <div style="background: rgba(0,0,0,0.12); padding: 12px 15px; border-radius: 12px; border-left: 4px solid #2ec4b6;">
                <span style="font-weight: 700; color: white;">Habituel (Routine)</span> : Particule <strong class="font-fon" style="color:var(--primary);">nɔ</strong> devant le verbe. <br>
                ➔ <strong class="font-fon" style="color:var(--primary);">ùn nɔ ɖu wɔ̌xúxú</strong> = Je mange habituellement du pain.
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> La Règle d'Or de la Négation
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 10px;">
              Pour nier une phrase, on utilise l'adverbe de négation <strong class="font-fon" style="color:var(--primary)">ă</strong> (parfois transcrit <em>ã</em>) ou la particule finale <strong class="font-fon" style="color:var(--primary)">ɔ</strong> tout à la fin de la phrase :
            </p>
            <div style="background: rgba(231, 29, 54, 0.05); padding: 15px; border-radius: 16px; border: 1px solid rgba(231, 29, 54, 0.2); font-size: 0.95rem; line-height: 1.6;">
              • Je vois ➔ <strong class="font-fon" style="color:white">ùn mɔ</strong> <br>
              • Je ne vois pas ➔ <strong class="font-fon" style="color:var(--primary)">ùn mɔ ă</strong> <span style="opacity:0.5;">(Je + voir + pas)</span>
            </div>
          </div>

          <!-- GUIDE 3: SALUTATIONS & SOCIAL -->
          <div v-if="activeGuideTab === 'salutations'" class="glass-card animate-fadeIn" style="padding: 30px; border-radius: 24px; border: 1px solid var(--glass-border);">
            <h3 class="gradient-text" style="font-size: 1.8rem; margin-bottom: 15px;">🗣️ Salutations, Relations &amp; Politesse</h3>
            <p style="opacity: 0.8; line-height: 1.6; margin-bottom: 20px;">
              Au Bénin, saluer est un art social sacré et chaleureux. Ne pas saluer ou abréger une salutation est perçu comme impoli. On demande toujours des nouvelles de la santé, de la famille et du réveil.
            </p>

            <h4 style="color: white; font-weight: 800; margin-top: 25px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Dialogue de Salutation Traditionnelle du Matin
            </h4>
            
            <!-- CHAT STYLE MOCKUP -->
            <div style="display: flex; flex-direction: column; gap: 15px; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px;">
              <!-- Ami A -->
              <div style="display: flex; gap: 10px; align-items: flex-start; max-width: 80%;">
                <div style="background: var(--primary); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">A</div>
                <div style="background: rgba(255, 107, 53, 0.1); border: 1px solid rgba(255, 107, 53, 0.2); padding: 10px 15px; border-radius: 0 16px 16px 16px;">
                  <strong style="color: white;" class="font-fon">A fɔn à ?</strong>
                  <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 4px;">Littéralement : "T'es-tu réveillé ?" (Bonjour le matin)</div>
                </div>
              </div>
              
              <!-- Ami B -->
              <div style="display: flex; gap: 10px; align-items: flex-start; max-width: 80%; align-self: flex-end; flex-direction: row-reverse;">
                <div style="background: #2ec4b6; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">B</div>
                <div style="background: rgba(46, 196, 182, 0.1); border: 1px solid rgba(46, 196, 182, 0.2); padding: 10px 15px; border-radius: 16px 0 16px 16px;">
                  <strong style="color: white;" class="font-fon">Een, ùn fɔn ganji, bo a ?</strong>
                  <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 4px;">"Oui, je me suis bien réveillé, et toi ?"</div>
                </div>
              </div>

              <!-- Ami A -->
              <div style="display: flex; gap: 10px; align-items: flex-start; max-width: 80%;">
                <div style="background: var(--primary); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">A</div>
                <div style="background: rgba(255, 107, 53, 0.1); border: 1px solid rgba(255, 107, 53, 0.2); padding: 10px 15px; border-radius: 0 16px 16px 16px;">
                  <strong style="color: white;" class="font-fon">Ùn ɖo ganji, àwànù.</strong>
                  <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 4px;">"Je vais bien, merci."</div>
                </div>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Salutations selon l'heure de la journée
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 25px;">
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="font-size: 0.75rem; opacity: 0.5;">L'APRÈS-MIDI / SOLEIL</div>
                <strong style="color: var(--primary); font-size: 1.15rem;" class="font-fon">Kudo hwemɛ !</strong>
                <div style="color: white; font-weight: 600; margin-top: 3px;">Bon après-midi</div>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="font-size: 0.75rem; opacity: 0.5;">LE SOIR / CRÉPUSCULE</div>
                <strong style="color: var(--primary); font-size: 1.15rem;" class="font-fon">Kúdo gbáda !</strong>
                <div style="color: white; font-weight: 600; margin-top: 3px;">Bonsoir</div>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="font-size: 0.75rem; opacity: 0.5;">SOUHAITER LA BIENVENUE</div>
                <strong style="color: var(--primary); font-size: 1.15rem;" class="font-fon">Ku abɔ ! / Mi ku abɔ !</strong>
                <div style="color: white; font-weight: 600; margin-top: 3px;">Bienvenue (Pluriel/Respect)</div>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03);">
                <div style="font-size: 0.75rem; opacity: 0.5;">PARTIR / PRENDRE CONGÉ</div>
                <strong style="color: var(--primary); font-size: 1.15rem;" class="font-fon">Bo yi bo wá !</strong>
                <div style="color: white; font-weight: 600; margin-top: 3px;">Au revoir (Litt: Va et reviens)</div>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Faire Connaissance &amp; Formules de Politesse
            </h4>
            <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 18px; border: 1px solid var(--glass-border); line-height: 1.8;">
              • Comment t'appelles-tu ? ➔ <strong class="font-fon" style="color: var(--primary);">Nɛ̌ wɛ ye nɔ yɔ̌ we ?</strong><br>
              • Je m'appelle Eudes ➔ <strong class="font-fon" style="color: var(--primary);">Ye nɔ yɔ̌ mì ɖɔ Eudes</strong> <span style="opacity:0.5;">(On m'appelle Eudes)</span><br>
              • S'il vous plaît ➔ <strong class="font-fon" style="color: var(--primary);">Mi kɛnklɛɛn</strong><br>
              • Merci beaucoup ➔ <strong class="font-fon" style="color: var(--primary);">A wà nŭ kaka</strong><br>
              • Bonne nuit ➔ <strong class="font-fon" style="color: var(--primary);">Mi dɔ́ gbɛ̀</strong> <span style="opacity:0.5;">(Dormez bien/en vie)</span>
            </div>
          </div>

          <!-- GUIDE 4: NOMBRES & LOGIQUE -->
          <div v-if="activeGuideTab === 'numbers'" class="glass-card animate-fadeIn" style="padding: 30px; border-radius: 24px; border: 1px solid var(--glass-border);">
            <h3 class="gradient-text" style="font-size: 1.8rem; margin-bottom: 15px;">🔢 Système de Comptage Vigésimal &amp; Quinaire</h3>
            <p style="opacity: 0.8; line-height: 1.6; margin-bottom: 20px;">
              Le système numérique du Fon combine une <strong>base 5</strong> pour les unités et une <strong>base 20</strong> (système vigésimal) pour les nombres supérieurs.
            </p>

            <h4 style="color: white; font-weight: 800; margin-top: 25px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Les Chiffres Fondamentaux de 1 à 10
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 25px;">
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">1</span> <br>
                <strong style="color: var(--primary);" class="font-fon">ɖokpó</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">2</span> <br>
                <strong style="color: var(--primary);" class="font-fon">wè</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">3</span> <br>
                <strong style="color: var(--primary);" class="font-fon">atɔn</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">4</span> <br>
                <strong style="color: var(--primary);" class="font-fon">ɛnɛ</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">5</span> <br>
                <strong style="color: var(--primary);" class="font-fon">atɔ́ɔ́n</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">6</span> <br>
                <strong style="color: var(--primary);" class="font-fon">aizɛn</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">7</span> <br>
                <strong style="color: var(--primary);" class="font-fon">tɛ́nwè</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">8</span> <br>
                <strong style="color: var(--primary);" class="font-fon">tantɔn</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">9</span> <br>
                <strong style="color: var(--primary);" class="font-fon">tɛ́nnɛ</strong>
              </div>
              <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
                <span style="opacity: 0.5; font-size: 0.8rem;">10</span> <br>
                <strong style="color: var(--primary);" class="font-fon">wǒ</strong>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> Les Dizaines &amp; Nombres Pivots
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 25px;">
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>15 (Pivot)</span> <strong class="font-fon" style="color: white;">afɔtɔn</strong>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>20 (Base)</span> <strong class="font-fon" style="color: white;">ko</strong>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>30</span> <strong class="font-fon" style="color: white;">gban</strong>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>40 (20 × 2)</span> <strong class="font-fon" style="color: white;">kanɖé</strong>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>50 (40 + 10)</span> <strong class="font-fon" style="color: white;">kanɖé wo</strong>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                <span>100 (20 × 5)</span> <strong class="font-fon" style="color: white;">kanwe ko</strong>
              </div>
            </div>

            <h4 style="color: white; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary);">•</span> La logique de liaison "nukun" (addition)
            </h4>
            <p style="opacity: 0.7; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px;">
              Pour former les nombres intermédiaires, le Fon utilise le terme <strong style="color:var(--primary)">nukun</strong> (qui signifie littéralement "œil" ou "addition") pour additionner des unités à la base supérieure :
            </p>
            <div style="background: rgba(255,107,53,0.02); padding: 20px; border-radius: 18px; border: 1px dashed rgba(255,107,53,0.2); line-height: 2;">
              • <strong>16</strong> (15 + 1) ➔ <strong class="font-fon" style="color:var(--primary)">afɔtɔn nukun ɖokpó</strong> <br>
              • <strong>21</strong> (20 + 1) ➔ <strong class="font-fon" style="color:var(--primary)">ko nukun ɖokpó</strong> <br>
              • <strong>42</strong> (40 + 2) ➔ <strong class="font-fon" style="color:var(--primary)">kanɖé nukun wé</strong>
            </div>
          </div>

          <!-- GUIDE 5: SURVIE & EXPRESSIONS -->
          <div v-if="activeGuideTab === 'vocab'" class="glass-card animate-fadeIn" style="padding: 30px; border-radius: 24px; border: 1px solid var(--glass-border);">
            <h3 class="gradient-text" style="font-size: 1.8rem; margin-bottom: 15px;">📚 Guide de Survie &amp; Lexique Quotidien</h3>
            <p style="opacity: 0.8; line-height: 1.6; margin-bottom: 20px;">
              Les expressions les plus courantes dont vous aurez besoin pour vous intégrer, faire les courses au marché ou demander de l'aide en urgence.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
              <!-- Catégorie Marché -->
              <div style="background: rgba(0,0,0,0.15); padding: 20px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.03);">
                <h4 style="color: white; font-weight: 800; margin-top: 0; margin-bottom: 12px; color: var(--primary);">💰 Négocier au Marché</h4>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                  <div style="display:flex; justify-content:space-between;"><span>Combien ça coûte ?</span> <strong class="font-fon" style="color: white;">Bì nyí nabí ?</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>C'est trop cher !</span> <strong class="font-fon" style="color: white;">É vɛ́ kaka !</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>Diminue le prix !</span> <strong class="font-fon" style="color: white;">Vɔ̌ gbɔ !</strong></div>
                </div>
              </div>

              <!-- Catégorie Faim & Soif -->
              <div style="background: rgba(0,0,0,0.15); padding: 20px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.03);">
                <h4 style="color: white; font-weight: 800; margin-top: 0; margin-bottom: 12px; color: var(--primary);">🍽️ Alimentation &amp; Besoins</h4>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                  <div style="display:flex; justify-content:space-between;"><span>Donne-moi de l'eau</span> <strong class="font-fon" style="color: white;">Nǎ mì sin</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>Donne-moi du pain</span> <strong class="font-fon" style="color: white;">Nǎ mì wɔ̌xúxú</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>Je veux manger</span> <strong class="font-fon" style="color: white;">Un jló na ɖu nǔ</strong></div>
                </div>
              </div>

              <!-- Catégorie Direction -->
              <div style="background: rgba(0,0,0,0.15); padding: 20px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.03);">
                <h4 style="color: white; font-weight: 800; margin-top: 0; margin-bottom: 12px; color: var(--primary);">📍 Orientation</h4>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                  <div style="display:flex; justify-content:space-between;"><span>Où est la route de...?</span> <strong class="font-fon" style="color: white;">Fitɛ wɛ ali ... tɔn ɖe ?</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>C'est devant</span> <strong class="font-fon" style="color: white;">É ɖò nukɔn</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>C'est derrière</span> <strong class="font-fon" style="color: white;">É ɖò gudo</strong></div>
                </div>
              </div>

              <!-- Catégorie Urgences -->
              <div style="background: rgba(0,0,0,0.15); padding: 20px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.03);">
                <h4 style="color: white; font-weight: 800; margin-top: 0; margin-bottom: 12px; color: var(--primary);">⚠️ Urgences &amp; États</h4>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                  <div style="display:flex; justify-content:space-between;"><span>Aidez-moi !</span> <strong class="font-fon" style="color: white;">Mi wá dɔn mì !</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>Je suis fatigué</span> <strong class="font-fon" style="color: white;">Kpɔlo ɖo mì</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>J'ai faim</span> <strong class="font-fon" style="color: white;">Xɔvɛ ɖo mì</strong></div>
                  <div style="display:flex; justify-content:space-between;"><span>Je suis malade</span> <strong class="font-fon" style="color: white;">Azɔn ɖò mì ɖu wɛ</strong></div>
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
