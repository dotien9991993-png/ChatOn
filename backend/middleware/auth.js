const { supabaseAdmin } = require('../config/supabase');

/**
 * Auth middleware — verifies Supabase JWT + loads tenant info
 * Sets req.user, req.tenantId, req.userRole
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    // Verify JWT via Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up profile to get tenant_id + role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, display_name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
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
