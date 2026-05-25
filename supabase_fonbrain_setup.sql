-- =====================================================================
-- SCRIPT SQL DE CONFIGURATION FONBRAIN — TABLES & RÈGLES IA
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com)
-- =====================================================================

-- Table des règles grammaticales apprises
CREATE TABLE IF NOT EXISTS public.fon_grammar_rules (
  id            SERIAL PRIMARY KEY,
  rule_type     TEXT NOT NULL,
  trigger_fr    TEXT NOT NULL,
  structure_fon TEXT NOT NULL,
  example_fr    TEXT,
  example_fon   TEXT,
  confidence    FLOAT DEFAULT 0.5,
  occurrences   INT DEFAULT 1,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(rule_type, trigger_fr, structure_fon)
);

-- Table des liaisons (mots Fon ajoutés automatiquement)
CREATE TABLE IF NOT EXISTS public.fon_liaisons (
  id          SERIAL PRIMARY KEY,
  context_fr  TEXT NOT NULL,
  mot_liaison TEXT NOT NULL,
  position    TEXT DEFAULT 'after',
  confidence  FLOAT DEFAULT 0.5,
  occurrences INT DEFAULT 1,
  UNIQUE(context_fr, mot_liaison)
);

-- Table mémoire des traductions faites par l'IA
CREATE TABLE IF NOT EXISTS public.ai_translations (
  id              SERIAL PRIMARY KEY,
  french          TEXT NOT NULL UNIQUE,
  fon             TEXT NOT NULL,
  method          TEXT,
  confidence      FLOAT,
  audio_assembled BOOLEAN DEFAULT FALSE,
  validated       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_grammar_rules_type
  ON public.fon_grammar_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_grammar_rules_trigger
  ON public.fon_grammar_rules(trigger_fr);
CREATE INDEX IF NOT EXISTS idx_liaisons_context
  ON public.fon_liaisons(context_fr);
CREATE INDEX IF NOT EXISTS idx_ai_translations_fr
  ON public.ai_translations(french);

-- Données de base : règles grammaticales fondamentales du Fon
-- (L'IA va enrichir ces règles automatiquement)
INSERT INTO public.fon_grammar_rules
  (rule_type, trigger_fr, structure_fon, example_fr, example_fon, confidence, occurrences)
VALUES
  ('ordre_mots',    'sujet_verbe_objet', 'SUJET VERBE OBJET', 'il mange du pain', 'é ɖu kpakpɔ', 0.95, 500),
  ('negation',      'ne_pas',  'VERBE ɔ',           'je ne vois pas',     'un mɔ ɔ',        0.95, 400),
  ('negation',      'ne_plus', 'VERBE ɔ tɔn',       'je ne viens plus',   'un wá ɔ tɔn',    0.90, 200),
  ('negation',      'ne_jamais','VERBE gbɔn ɔ',     'je ne mens jamais',  'un ɖɔ gbɔn ɔ',   0.88, 150),
  ('temps',         'passe_compose', 'SUJET ɖo VERBE',  'j ai mangé',      'un ɖo ɖu',       0.85, 300),
  ('temps',         'imparfait',     'SUJET ɖo VERBE ɖ', 'j etais',        'un ɖo',          0.83, 250),
  ('temps',         'futur',         'SUJET na VERBE',   'je vais manger',  'un na ɖu',       0.85, 280),
  ('liaison',       'sujet_pronom',  'SUJET kpó',        'et moi',          'kpó',            0.90, 350),
  ('possession',    'de_moi',        'ce SUJET tɔn',     'ma maison',       'xɔ ce tɔn',      0.88, 200),
  ('question',      'est_ce_que',    'PHRASE wɛ a',      'est-ce que tu vas','a yì a',        0.85, 180),
  ('exclamation',   'quel',          'nùɖé wɛ',          'quelle chance',   'nùɖé wɛ',        0.80, 120)
ON CONFLICT DO NOTHING;

-- Mots de liaison Fon fondamentaux
INSERT INTO public.fon_liaisons (context_fr, mot_liaison, position, confidence, occurrences)
VALUES
  ('sujet_avant_verbe',  'ɔ',    'between', 0.90, 400),
  ('verbe_transitif',    'ɔ',    'after_obj', 0.85, 350),
  ('phrase_declarative', 'ɖ',    'end',     0.80, 300),
  ('possession',         'tɔn',  'end',     0.88, 250),
  ('question',           'à',    'end',     0.87, 220)
ON CONFLICT DO NOTHING;
