-- =====================================================================
-- SCRIPT SQL DE CONFIGURATION COMPLÈTE — GBÉ TCHÉ (DICO FON)
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CONFIGURATION DE LA TABLE `admin_activity` (Suivi des contributions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    admin_email TEXT,
    action_type TEXT NOT NULL, -- 'add', 'approve', 'update', 'delete', 'audio_added'
    word_id INTEGER,
    word_french TEXT,
    word_fon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pour accélérer les requêtes de stats par admin
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id 
    ON public.admin_activity(admin_id);

-- Activation de RLS (Sécurité)
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (Policies) pour `admin_activity`
DROP POLICY IF EXISTS "Admins can view all activity" ON public.admin_activity;
CREATE POLICY "Admins can view all activity" ON public.admin_activity 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can insert activity" ON public.admin_activity;
CREATE POLICY "Admins can insert activity" ON public.admin_activity 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );


-- ---------------------------------------------------------------------
-- 2. CONFIGURATION DE LA TABLE `grammar_patterns` (Moteur de Traduction IA)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grammar_patterns (
    id          SERIAL PRIMARY KEY,
    type        TEXT NOT NULL, -- 'bigram' | 'trigram' | 'template'
    pattern_fr  TEXT NOT NULL,
    pattern_fon TEXT NOT NULL,
    occurrences INT DEFAULT 1,
    confidence  FLOAT DEFAULT 0.5,
    source      TEXT DEFAULT 'Bible',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(pattern_fr, pattern_fon)
);

-- Index pour optimiser les recherches du traducteur
CREATE INDEX IF NOT EXISTS idx_grammar_patterns_fr
    ON public.grammar_patterns(pattern_fr);

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_confidence
    ON public.grammar_patterns(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_type
    ON public.grammar_patterns(type);


-- ---------------------------------------------------------------------
-- 3. AJOUT DES COLONNES IA & TRADUCTION SUR LA TABLE `words`
-- ---------------------------------------------------------------------
ALTER TABLE public.words
    ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.7,
    ADD COLUMN IF NOT EXISTS source     TEXT  DEFAULT 'manual';

-- Index sur les mots suggérés automatiquement par l'IA
CREATE INDEX IF NOT EXISTS idx_words_pending_ai
    ON public.words(status, source)
    WHERE status = 'pending' AND source = 'ai_generated';


-- ---------------------------------------------------------------------
-- 4. CRÉATION DES VUES UTILITAIRES (Pour les statistiques d'apprentissage)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.grammar_stats AS
SELECT
    type,
    COUNT(*) AS total_patterns,
    ROUND(AVG(confidence)::numeric, 3) AS avg_confidence,
    SUM(occurrences) AS total_occurrences,
    MAX(occurrences) AS max_occurrences
FROM public.grammar_patterns
GROUP BY type
ORDER BY total_patterns DESC;

CREATE OR REPLACE VIEW public.pending_ai_phrases AS
SELECT id, french, fon, confidence, created_at
FROM public.words
WHERE status = 'pending' AND source = 'ai_generated'
ORDER BY confidence DESC;

-- ---------------------------------------------------------------------
-- FIN DU SCRIPT. Félicitations, votre base de données est 100% prête !
-- ---------------------------------------------------------------------
