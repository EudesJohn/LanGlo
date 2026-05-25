"""
GBÉTCHÉ — Apprentissage automatique de la grammaire Fon
depuis les 31 000 versets bibliques alignés.

NOTE : Les variables d'environnement nécessaires sont :
  SUPABASE_URL          → URL de votre projet Supabase
  SUPABASE_SERVICE_KEY  → Clé de service (SUPABASE_SERVICE_ROLE_KEY dans .env)

Pour lancer :
  pip install supabase python-dotenv
  python learn_grammar.py
"""

import os
import re
import json
from collections import defaultdict, Counter
from supabase import create_client

# Compatibilité avec le nom de variable du projet (.env utilise SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL et SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) sont requis.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_aligned_verses():
    print("Chargement des versets bibliques...")
    all_verses = []
    page = 0
    page_size = 1000
    while True:
        result = (
            supabase.table("words")
            .select("french, fon")
            .eq("category", "Bible")
            .eq("status", "approved")
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        batch = result.data
        if not batch:
            break
        all_verses.extend(batch)
        page += 1
        print(f"  → {len(all_verses)} versets chargés...")
    print(f"Total : {len(all_verses)} versets\n")
    return all_verses

def tokenize(text):
    if not text:
        return []
    text = text.lower().strip()
    tokens = re.findall(r"[a-zɛɔɖƒŋɖɣɥœàáâäèéêëîïôùúûüɑɒ']+", text)
    return tokens

def build_alignment_table(verses):
    print("Apprentissage des alignements de mots...")
    co_counts = defaultdict(Counter)
    for verse in verses:
        fr_tokens = tokenize(verse.get("french", ""))
        fon_tokens = tokenize(verse.get("fon", ""))
        for fr in fr_tokens:
            for fon in fon_tokens:
                co_counts[fr][fon] += 1
    translation_probs = {}
    for fr_word, fon_counter in co_counts.items():
        total = sum(fon_counter.values())
        if total > 0:
            translation_probs[fr_word] = {
                fon: count / total
                for fon, count in fon_counter.most_common(5)
            }
    print(f"  → {len(translation_probs)} mots français alignés\n")
    return translation_probs

WORD_TAGS = {
    "je": "PRON_SUJE", "tu": "PRON_SUJE", "il": "PRON_SUJE",
    "elle": "PRON_SUJE", "nous": "PRON_SUJE", "vous": "PRON_SUJE",
    "ils": "PRON_SUJE", "elles": "PRON_SUJE",
    "le": "ART", "la": "ART", "les": "ART", "un": "ART",
    "une": "ART", "des": "ART", "du": "ART", "de": "PREP",
    "dans": "PREP", "sur": "PREP", "sous": "PREP", "avec": "PREP",
    "pour": "PREP", "par": "PREP", "vers": "PREP", "entre": "PREP",
    "en": "PREP", "au": "PREP", "aux": "PREP",
    "et": "CONJ", "ou": "CONJ", "mais": "CONJ", "car": "CONJ",
    "donc": "CONJ", "or": "CONJ", "ni": "CONJ", "que": "CONJ",
    "qui": "CONJ", "quand": "CONJ", "si": "CONJ",
    "est": "VERBE", "sont": "VERBE", "a": "VERBE", "ont": "VERBE",
    "dit": "VERBE", "fait": "VERBE", "va": "VERBE", "vient": "VERBE",
}

def get_tag(word):
    return WORD_TAGS.get(word.lower(), "MOT")

def extract_phrase_patterns(verses, min_occurrences=3):
    print("Extraction des patterns grammaticaux...")
    bigram_pairs = Counter()
    trigram_pairs = Counter()
    template_pairs = Counter()
    for verse in verses:
        fr_tokens = tokenize(verse.get("french", ""))
        fon_tokens = tokenize(verse.get("fon", ""))
        if len(fr_tokens) < 2 or len(fon_tokens) < 2:
            continue
        for i in range(len(fr_tokens) - 1):
            fr_bg = (fr_tokens[i], fr_tokens[i+1])
            fon_start = max(0, round(i * len(fon_tokens) / len(fr_tokens)) - 1)
            for j in range(fon_start, min(fon_start + 3, len(fon_tokens) - 1)):
                if j + 1 < len(fon_tokens):
                    fon_bg = (fon_tokens[j], fon_tokens[j+1])
                    bigram_pairs[(fr_bg, fon_bg)] += 1
        for i in range(len(fr_tokens) - 2):
            fr_tg = (fr_tokens[i], fr_tokens[i+1], fr_tokens[i+2])
            fon_start = max(0, round(i * len(fon_tokens) / len(fr_tokens)) - 1)
            for j in range(fon_start, min(fon_start + 3, len(fon_tokens) - 2)):
                fon_tg = (fon_tokens[j], fon_tokens[j+1], fon_tokens[j+2])
                trigram_pairs[(fr_tg, fon_tg)] += 1
        fr_tags = tuple(get_tag(w) for w in fr_tokens[:6])
        fon_tags = tuple(get_tag(w) for w in fon_tokens[:6])
        template_pairs[(fr_tags, fon_tags)] += 1
    patterns = []
    for (fr_bg, fon_bg), count in bigram_pairs.most_common(500):
        if count >= min_occurrences:
            patterns.append({
                "type": "bigram",
                "pattern_fr": " ".join(fr_bg),
                "pattern_fon": " ".join(fon_bg),
                "occurrences": count,
                "confidence": min(0.99, count / 100),
                "source": "Bible"
            })
    for (fr_tg, fon_tg), count in trigram_pairs.most_common(500):
        if count >= min_occurrences:
            patterns.append({
                "type": "trigram",
                "pattern_fr": " ".join(fr_tg),
                "pattern_fon": " ".join(fon_tg),
                "occurrences": count,
                "confidence": min(0.99, count / 50),
                "source": "Bible"
            })
    for (fr_tmpl, fon_tmpl), count in template_pairs.most_common(200):
        if count >= min_occurrences:
            patterns.append({
                "type": "template",
                "pattern_fr": " ".join(fr_tmpl),
                "pattern_fon": " ".join(fon_tmpl),
                "occurrences": count,
                "confidence": min(0.99, count / 200),
                "source": "Bible"
            })
    print(f"  → {len(patterns)} patterns extraits\n")
    return patterns

def save_patterns_to_supabase(patterns, translation_probs):
    print("Sauvegarde dans Supabase...")
    batch_size = 100
    saved = 0
    for i in range(0, len(patterns), batch_size):
        batch = patterns[i:i + batch_size]
        supabase.table("grammar_patterns").upsert(
            batch, on_conflict="pattern_fr,pattern_fon"
        ).execute()
        saved += len(batch)
        print(f"  → {saved}/{len(patterns)} patterns sauvegardés...")
    alignment_rows = []
    for fr_word, translations in list(translation_probs.items())[:5000]:
        best_fon = max(translations, key=translations.get)
        best_prob = translations[best_fon]
        if best_prob > 0.1:
            alignment_rows.append({
                "french": fr_word,
                "fon": best_fon,
                "confidence": round(best_prob, 4),
                "source": "bible_alignment"
            })
    for i in range(0, len(alignment_rows), batch_size):
        batch = alignment_rows[i:i + batch_size]
        supabase.table("words").upsert(
            batch, on_conflict="french,fon"
        ).execute()
    print(f"Terminé ! {len(patterns)} patterns + {len(alignment_rows)} alignements sauvegardés\n")

if __name__ == "__main__":
    print("GBÉTCHÉ — Apprentissage de la grammaire Fon\n")
    verses = load_aligned_verses()
    translation_probs = build_alignment_table(verses)
    patterns = extract_phrase_patterns(verses)
    save_patterns_to_supabase(patterns, translation_probs)
    print("L'IA a appris la grammaire Fon depuis la Bible !")
