-- SQL Schema for Supabase
-- Run this in the Supabase SQL Editor

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_active BOOLEAN DEFAULT true
);

-- 2. Create Words Table
CREATE TABLE IF NOT EXISTS public.words (
    id SERIAL PRIMARY KEY,
    french TEXT NOT NULL,
    fon TEXT NOT NULL,
    category TEXT,
    example TEXT,
    phonetic TEXT,
    audio_url TEXT,
    status TEXT DEFAULT 'pending',
    added_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES public.words(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, word_id)
);

-- 4. Insert Initial Admin (Password: Johnson40)
-- Note: In a real app, use Supabase Auth instead of a custom user table if possible.
-- This schema matches your current logic.
INSERT INTO public.users (name, email, password, role) 
VALUES ('Admin Gbe Tche', 'eudesjohn650@gmail.com', 'Johnson40', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 5. Seed initial data
INSERT INTO public.words (french, fon, category, example, phonetic, status, added_by)
VALUES 
('bonjour', 'kɔ́kú', 'salutations', 'Kɔ́kú, à ní cɛ ɖé?', 'ko-koo', 'approved', 1),
('merci', 'à wá', 'salutations', 'À wá kpɛ́dé', 'a-wa', 'approved', 1),
('eau', 'sin', 'nature', 'Sin ɖé mɛ', 'sin', 'approved', 1)
ON CONFLICT DO NOTHING;
