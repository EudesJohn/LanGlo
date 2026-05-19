import os
import re
import sys
import json
import codecs

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from supabase import create_client, Client

# Attempt to import nltk, maybe the user needs to download some packages
try:
    import nltk
    from nltk.translate import ibm1
    from nltk.translate import AlignedSent
except ImportError:
    print("NLTK not found. Please install it with 'pip install nltk'")
    sys.exit(1)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env. Insertion will be skipped.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

FON_XML = os.path.join(os.path.dirname(__file__), 'FonBible.xml')
FR_XML = os.path.join(os.path.dirname(__file__), 'FrenchBible.xml')

# Stop words to filter out grammatical noise
FRENCH_STOP_WORDS = {
    'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'dans', 'pour', 
    'par', 'sur', 'avec', 'sous', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 
    'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'est', 'sont', 'ont', 'a', 'au', 'aux',
    'qui', 'que', 'qu', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'ne', 'pas', 'plus', 'jamais', 'rien', 'personne', 'se', 'me', 'te', 'lui', 'leur', 'y',
    "c'est", "s'est", "m'est", "t'est", "j'ai", "tuo", "ilo", 'avez', 'nous', 'vous',
    'sommes', 'etes', 'ont', 'etais', 'etait', 'etaient', 'aussi', 'comme', 'dans', 'tout',
    'tous', 'toute', 'toutes', 'mais', 'ou', 'où', 'donc', 'or', 'ni', 'car', 'si', 'bien',
    'tres', 'très', 'faire', 'fait', 'faites', 'font', 'avoir', 'suis', 'es', 'dit', 'dis',
    'est-ce', 'auxquelles', 'quel', 'quels', 'quelle', 'quelles', 'quelque', 'quelques',
    'ceci', 'cela', 'ils', 'elles', 'lorsque', 'alors', 'quand', 'donc', 'ainsi', 'plusieurs',
    'l', 'd', 's', 'm', 't', 'c', 'qu'
}

FON_STOP_WORDS = {
    'lɔ', 'ɖò', 'wɛ', 'tɔn', 'mɛ', 'sin', 'ce', 'tɔ́', 'nú', 'jí', 'ye', 'e', 'mi', 'un', 'a',
    'ɔ', 'é', 'mǐ', 'bó', 'ná', 'tó', 'lɛ́', 'wɛ́', 'ɖé', 'ě', 'á', 'ó', 'co', 'bɔ', 'ka', 'lɛ',
    'tɔ', 'we', 'ɖo', 'nyi', 'nyí', 'wɛ̀', 'wɛ́', 'xá', 'dó', 'dò', 'dóo', 'té',
    'ɖokpo', 'ɖokpó', 'kpo', 'kpó', 'kpódó', 'gúdó', 'taji', 'yetɔn', 'mitɔn', 'mítɔn',
    'ní', 'nɔ́', 'nɔ', 'nú', 'nu', 'bo', 'tɔn', 'wɛn', 'din', 'dǐn', 'bǐ', 'bí', 'dáa', 'ɔ́'
}

def tokenize(text, stop_words):
    if not text:
        return []
    text = text.lower()
    text = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?"\']', ' ', text)
    tokens = [w.strip() for w in text.split()]
    return [w for w in tokens if len(w) >= 2 and w not in stop_words]

def parse_bible_xml(file_path):
    print(f"📖 Lecture de {os.path.basename(file_path)}...")
    verses_map = {}
    current_testament = ''
    current_book = ''
    current_chapter = ''
    
    testament_re = re.compile(r'<testament name="([^"]+)">', re.IGNORECASE)
    book_re = re.compile(r'<book number="([^"]+)">', re.IGNORECASE)
    chapter_re = re.compile(r'<chapter number="([^"]+)">', re.IGNORECASE)
    verse_re = re.compile(r'<verse number="([^"]+)">([^<]+)</verse>', re.IGNORECASE)

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                t_match = testament_re.search(line)
                if t_match:
                    current_testament = t_match.group(1)
                    continue
                
                b_match = book_re.search(line)
                if b_match:
                    current_book = b_match.group(1)
                    continue
                
                c_match = chapter_re.search(line)
                if c_match:
                    current_chapter = c_match.group(1)
                    continue
                
                v_match = verse_re.search(line)
                if v_match:
                    verse_number = v_match.group(1)
                    text = v_match.group(2).strip()
                    key = f"{current_testament}_{current_book}_{current_chapter}_{verse_number}"
                    verses_map[key] = text
    except FileNotFoundError:
        print(f"❌ Fichier {file_path} introuvable.")
    
    print(f"✨ {len(verses_map)} versets chargés.")
    return verses_map

def fetch_existing_vocab():
    print('📖 Récupération du vocabulaire existant depuis Supabase...')
    keys = set()
    if not supabase:
        return keys
    
    offset = 0
    limit = 1000
    
    while True:
        try:
            response = supabase.table('words') \
                .select('french, fon') \
                .eq('category', 'Vocabulaire') \
                .range(offset, offset + limit - 1) \
                .execute()
            
            data = response.data
            if not data:
                break
            
            for item in data:
                if item.get('french') and item.get('fon'):
                    keys.add(f"{item['french'].lower().strip()}__{item['fon'].lower().strip()}")
            
            offset += limit
            print(f"\rMots existants chargés : {offset}...", end='', flush=True)
            if len(data) < limit:
                break
        except Exception as e:
            print(f"\n❌ Erreur de chargement du vocabulaire: {str(e)}")
            break

    print(f"\n✅ {len(keys)} mots de vocabulaire existants chargés.")
    return keys

def main():
    print("🎯 ===== ALIGNEMENT STATISTIQUE NLP BIBLE FON-FRANCAIS (IBM MODEL 1) =====\n")

    if not os.path.exists(FON_XML) or not os.path.exists(FR_XML):
        print("❌ Fichiers de la Bible XML manquants. Exécutez import_bible_xml.js d'abord.")
        return

    # 1. Fetch existing vocab
    existing_vocab = fetch_existing_vocab()

    # 2. Parse Bibles
    fon_bible = parse_bible_xml(FON_XML)
    fr_bible = parse_bible_xml(FR_XML)

    # 3. Create AlignedSent objects
    print("\n🔗 Alignement et Tokenisation des versets en cours...")
    aligned_sents = []
    
    for key, fon_text in fon_bible.items():
        if key in fr_bible:
            fr_text = fr_bible[key]
            fr_tokens = tokenize(fr_text, FRENCH_STOP_WORDS)
            fon_tokens = tokenize(fon_text, FON_STOP_WORDS)
            
            if fr_tokens and fon_tokens:
                # NLTK AlignedSent takes words in target language first, then source language.
                # Actually it doesn't matter, IBMModel1 translates from source to target.
                # We want to translate from FR to FON. So source=FR, target=FON.
                aligned_sents.append(AlignedSent(fon_tokens, fr_tokens))

    print(f"📊 {len(aligned_sents)} versets parallèles tokenisés avec succès.")

    if not aligned_sents:
        print("❌ Aucun verset aligné.")
        return

    # 4. Train IBM Model 1
    iterations = 10
    print(f"🧠 Entraînement du modèle d'alignement IBM Model 1 ({iterations} itérations)... Cela peut prendre quelques minutes.")
    ibm1_model = ibm1.IBMModel1(aligned_sents, iterations)

    print("🧮 Analyse des probabilités de traduction...")
    # ibm1_model.translation_table[t][s] is probability of target t given source s.
    # target = fon, source = french
    
    alignments = []
    min_prob = 0.50 # Seuil très strict pour ne garder que les meilleures paires
    
    # We will iterate over all source (fr) words and find the best target (fon) word
    for fr_word in ibm1_model.translation_table.keys(): # Wait, translation_table is dict of dicts: [target][source]
        pass
        
    # the translation table is organized as table[t][s]
    # let's rebuild it as table_s_t[s][t]
    fr_to_fon_probs = {}
    for fon_word, fr_dict in ibm1_model.translation_table.items():
        for fr_word, prob in fr_dict.items():
            # Skip None which represents NULL word
            if fr_word is None:
                continue
            if fr_word not in fr_to_fon_probs:
                fr_to_fon_probs[fr_word] = {}
            fr_to_fon_probs[fr_word][fon_word] = prob

    best_alignments = []
    for fr_word, fon_dict in fr_to_fon_probs.items():
        # Find the fon_word with highest probability
        best_fon = max(fon_dict, key=fon_dict.get)
        best_prob = fon_dict[best_fon]
        if best_prob > min_prob:
            best_alignments.append({
                'fr': fr_word,
                'fo': best_fon,
                'prob': best_prob
            })

    # Sort by probability descending
    best_alignments.sort(key=lambda x: x['prob'], reverse=True)

    print(f"✨ Correspondances de haute confiance trouvées : {len(best_alignments)}")

    # View Top 20 extracted words
    print('\n🌟 Exemples de vocabulaire biblique extrait (Top 20) :')
    for i, align in enumerate(best_alignments[:20]):
        print(f"  {i + 1}. [{align['fr']}] ➔ [{align['fo']}] (Probabilité: {align['prob']:.4f})")

    # 5. Insert into Supabase
    if not supabase:
        print("\n⏭️  Supabase non configuré, l'insertion est ignorée.")
        return

    words_to_insert = []
    skipped_duplicates = 0

    for align in best_alignments:
        key = f"{align['fr'].lower().strip()}__{align['fo'].lower().strip()}"
        if key in existing_vocab:
            skipped_duplicates += 1
            continue

        words_to_insert.append({
            'french': align['fr'].capitalize(),
            'fon': align['fo'],
            'category': 'Vocabulaire',
            'status': 'approved'
        })

    print(f"\n📦 Mots candidats uniques pour insertion : {len(words_to_insert)} (Doublons évités : {skipped_duplicates})")

    if len(words_to_insert) == 0:
        print('⏭️  Tous les mots extraits sont déjà présents en base. Fin du script.')
        return

    print('📥 Démarrage de l\'insertion dans la base de données Supabase par lots de 500...')
    
    BATCH_SIZE = 500
    inserted_count = 0
    error_count = 0

    for i in range(0, len(words_to_insert), BATCH_SIZE):
        batch = words_to_insert[i:i + BATCH_SIZE]
        try:
            response = supabase.table('words').insert(batch).execute()
            inserted_count += len(batch)
            print(f"\r✅ {inserted_count} / {len(words_to_insert)} mots insérés...", end='', flush=True)
        except Exception as e:
            print(f"\n❌ Erreur insertion lot {i // BATCH_SIZE + 1}: {str(e)}")
            error_count += len(batch)

    print(f"\n\n🎉 ===== ALIGNEMENT & EXTRACTION TERMINÉS AVEC SUCCÈS =====")
    print(f"✅ Nouveaux mots de vocabulaire insérés : {inserted_count}")
    print(f"⏭️  Doublons ignorés                       : {skipped_duplicates}")
    print(f"❌ Échecs d'insertion                     : {error_count}")
    print(f"=========================================================\n")

if __name__ == "__main__":
    main()
