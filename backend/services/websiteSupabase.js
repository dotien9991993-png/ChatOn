const { createClient } = require('@supabase/supabase-js');

const websiteUrl = process.env.WEBSITE_SUPABASE_URL;
const websiteKey = process.env.WEBSITE_SUPABASE_SERVICE_KEY;

if (!websiteUrl || !websiteKey) {
  console.warn('[WebsiteSupabase] Missing WEBSITE_SUPABASE_URL or WEBSITE_SUPABASE_SERVICE_KEY');
}

const websiteSupabase = createClient(websiteUrl || '', websiteKey || '', {
  auth: { autoRefreshToken: false, persistSession: false },
});

const websiteTenantId = process.env.WEBSITE_TENANT_ID;

module.exports = { websiteSupabase, websiteTenantId };
