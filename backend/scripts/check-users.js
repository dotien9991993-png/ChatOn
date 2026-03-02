require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) { console.log('Error:', error); return; }

  console.log('=== TẤT CẢ TÀI KHOẢN ===');
  users.users.forEach(u => {
    console.log('Email:', u.email, '| ID:', u.id, '| Confirmed:', !!u.email_confirmed_at);
  });

  const { data: profiles } = await supabase.from('profiles').select('*, tenants(name)');
  console.log('\n=== PROFILES ===');
  (profiles || []).forEach(p => {
    console.log('Name:', p.display_name, '| Role:', p.role, '| Tenant:', p.tenants?.name, '| ID:', p.id);
  });

  // Test login with demo account
  console.log('\n=== TEST LOGIN ===');
  const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'demo@hoangnamaudio.vn',
    password: 'demo123456',
  });
  if (loginErr) console.log('demo@hoangnamaudio.vn LOGIN FAILED:', loginErr.message);
  else console.log('demo@hoangnamaudio.vn LOGIN OK');
}
check();
