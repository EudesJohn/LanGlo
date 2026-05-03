-- ==========================================================
-- SQL Schema COMPLET pour Dico Fon (Gbé Tché)
-- À exécuter dans l'Editor SQL de Supabase
-- ==========================================================

-- 1. Nettoyage (Optionnel - à ne faire que si vous voulez repartir à zéro)
DROP TABLE IF EXISTS public.favorites;
DROP TABLE IF EXISTS public.words;
DROP TABLE IF EXISTS public.users;

-- 2. Table des Utilisateurs (En synchronisation avec Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT, -- Optionnel car géré par Supabase Auth
    role TEXT DEFAULT 'user', -- 'user' ou 'admin'
    nationality TEXT DEFAULT 'Béninoise',
    ethnicity TEXT DEFAULT 'Fon',
    pseudo TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================================
-- MIGRATION : À exécuter si vous avez déjà créé la table users
-- ==========================================================
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pseudo TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Table des Mots et Suggestions
CREATE TABLE IF NOT EXISTS public.words (
    id SERIAL PRIMARY KEY,
    french TEXT NOT NULL,
    fon TEXT NOT NULL,
    phonetic TEXT,
    category TEXT,
    example TEXT,
    audio_url TEXT, -- Prononciation du mot
    example_audio_url TEXT, -- Prononciation de la phrase
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    added_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Table des Favoris
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES public.words(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, word_id)
);

-- 5. Injection de données initiales (Admin & Exemples)
-- Note: L'ID 1 est réservé pour le premier admin créé manuellement.
INSERT INTO public.users (id, name, email, password, role, nationality, ethnicity) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Admin Gbe Tche', 'eudesjohn650@gmail.com', 'Johnson@@50', 'admin', 'Béninoise', 'Fon')
ON CONFLICT (id) DO UPDATE SET 
    role = 'admin', 
    password = EXCLUDED.password;

INSERT INTO public.words (french, fon, category, example, phonetic, status, added_by)
VALUES 
('bonjour', 'kɔ́kú', 'salutations', 'Kɔ́kú, à ní cɛ ɖé?', 'ko-koo', 'approved', '00000000-0000-0000-0000-000000000001'),
('merci', 'à wá', 'salutations', 'À wá kpɛ́dé', 'a-wa', 'approved', '00000000-0000-0000-0000-000000000001'),
('eau', 'sin', 'nature', 'Sin ɖé mɛ', 'sin', 'approved', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ==========================================================
-- SCRIPT DE PROMOTION ADMIN (À exécuter APRÈS votre inscription sur le site)
-- ==========================================================
-- UPDATE public.users SET role = 'admin' WHERE email = 'eudesjohn650@gmail.com';
