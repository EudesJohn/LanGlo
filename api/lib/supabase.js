// api/lib/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.");
}

// Use Service Role Key for backend if available, otherwise fallback to Anon Key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

module.exports = supabase;
