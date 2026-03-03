const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
} else {
  console.log('[Supabase] URL:', supabaseUrl);
  console.log('[Supabase] Service key:', supabaseServiceRoleKey ? 'SET (' + supabaseServiceRoleKey.length + ' chars)' : 'MISSING');
}

// Admin client — bypasses RLS (for webhooks + server ops)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Public client — respects RLS (optional server use)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabaseAdmin, supabase };
