const { supabaseAdmin } = require('../config/supabase');
const zaloService = require('../services/zalo');

let refreshInterval = null;
const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Zalo Token Refresh Job
 * Runs every 6 hours — refreshes tokens expiring within 12 hours
 */
function startZaloTokenRefresh() {
  if (refreshInterval) return;

  console.log('[Zalo Token Refresh] Job started — runs every 6 hours');

  // Run once on startup (after 30s delay to let server init)
  setTimeout(refreshAllTokens, 30 * 1000);

  // Then every 6 hours
  refreshInterval = setInterval(refreshAllTokens, SIX_HOURS);
}

async function refreshAllTokens() {
  try {
    // Find all Zalo channels with tokens expiring within 12 hours
    const twelveHoursFromNow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { data: channels, error } = await supabaseAdmin
      .from('channels')
      .select('id, tenant_id, page_id, page_name, page_access_token, config')
      .eq('type', 'zalo')
      .eq('connected', true);

    if (error) {
      console.error('[Zalo Token Refresh] Query error:', error.message);
      return;
    }

    if (!channels || channels.length === 0) {
      console.log('[Zalo Token Refresh] No Zalo channels found');
      return;
    }

    // Filter channels whose tokens expire within 12 hours
    const expiring = channels.filter((ch) => {
      const expiresAt = ch.config?.token_expires_at;
      if (!expiresAt) return true; // no expiry info → refresh to be safe
      return new Date(expiresAt) < new Date(twelveHoursFromNow);
    });

    if (expiring.length === 0) {
      console.log(`[Zalo Token Refresh] All ${channels.length} channels have valid tokens`);
      return;
    }

    console.log(`[Zalo Token Refresh] Refreshing ${expiring.length}/${channels.length} channels`);

    for (const ch of expiring) {
      const refreshToken = ch.config?.refresh_token;
      if (!refreshToken) {
        console.warn(`[Zalo Token Refresh] No refresh_token for channel ${ch.id} (${ch.page_name})`);
        continue;
      }

      try {
        const result = await zaloService.refreshAccessToken(refreshToken);
        const newExpiresAt = new Date(Date.now() + (result.expires_in || 86400) * 1000).toISOString();

        await supabaseAdmin
          .from('channels')
          .update({
            page_access_token: result.access_token,
            config: {
              ...ch.config,
              refresh_token: result.refresh_token,
              token_expires_at: newExpiresAt,
              token_error: false,
            },
          })
          .eq('id', ch.id);

        console.log(`[Zalo Token Refresh] OK: ${ch.page_name} (${ch.page_id}) — expires ${newExpiresAt}`);
      } catch (err) {
        console.error(`[Zalo Token Refresh] FAILED: ${ch.page_name} (${ch.page_id}):`, err.message);

        // Mark token error so UI can show warning
        await supabaseAdmin
          .from('channels')
          .update({
            config: {
              ...ch.config,
              token_error: true,
              token_error_at: new Date().toISOString(),
            },
          })
          .eq('id', ch.id);
      }
    }

    console.log('[Zalo Token Refresh] Cycle complete');
  } catch (err) {
    console.error('[Zalo Token Refresh] Unexpected error:', err.message);
  }
}

function stopZaloTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

module.exports = { startZaloTokenRefresh, stopZaloTokenRefresh };
