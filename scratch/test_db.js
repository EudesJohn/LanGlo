const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('Testing connection to:', process.env.SUPABASE_URL);
  
  const { data, error } = await supabase.from('words').select('count', { count: 'exact', head: true });
  
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('relation "public.words" does not exist')) {
      console.error('❌ La table "words" n\'existe pas encore. Avez-vous exécuté le script SQL dans Supabase ?');
    } else {
      console.error('❌ Erreur de connexion :', error.message);
    }
  } else {
    console.log('✅ Connexion réussie ! Les tables sont présentes.');
  }
}

testConnection();
