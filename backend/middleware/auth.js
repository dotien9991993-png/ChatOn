const { supabaseAdmin } = require('../config/supabase');

/**
 * Auth middleware — verifies Supabase JWT + loads tenant info
 * Sets req.user, req.tenantId, req.userRole
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[Auth] No token — missing Authorization header');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT via Supabase Auth (service role bypasses RLS)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.log('[Auth] Token invalid:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up profile to get tenant_id + role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, display_name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('[Auth] Profile not found for user:', user.id, '— error:', profileError?.message);
      return res.status(401).json({ error: 'User profile not found. Please contact support.' });
    }

    req.user = user;
    req.profile = profile;
    req.tenantId = profile.tenant_id;
    req.userRole = profile.role;
    next();
  } catch (err) {
    console.error('[Auth] Middleware error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = authMiddleware;
