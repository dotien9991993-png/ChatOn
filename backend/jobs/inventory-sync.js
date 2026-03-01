const { supabaseAdmin } = require('../config/supabase');

/**
 * Cron job: sync inventory from OMS every 30 minutes
 * Finds tenants with OMS config → pulls inventory → updates products
 */
function startInventorySync(io) {
  const INTERVAL = 30 * 60 * 1000; // 30 minutes

  async function syncAll() {
    try {
      // Find all tenants with OMS config
      const { data: tenants } = await supabaseAdmin
        .from('tenants')
        .select('id, slug, oms_config')
        .not('oms_config', 'is', null);

      if (!tenants || tenants.length === 0) return;

      for (const tenant of tenants) {
        const omsConfig = tenant.oms_config || {};
        if (!omsConfig.api_url || !omsConfig.api_key) continue;

        try {
          const axios = require('axios');
          const res = await axios.get(`${omsConfig.api_url}/inventory`, {
            headers: { Authorization: `Bearer ${omsConfig.api_key}` },
            timeout: 10000,
          });

          const items = res.data?.items || res.data || [];
          if (!Array.isArray(items)) continue;

          let updated = 0;
          for (const item of items) {
            if (!item.sku) continue;
            const { error } = await supabaseAdmin
              .from('products')
              .update({ stock: item.stock ?? item.quantity ?? 0, updated_at: new Date().toISOString() })
              .eq('tenant_id', tenant.id)
              .eq('sku', item.sku);

            if (!error) updated++;
          }

          if (updated > 0 && io) {
            io.to(`tenant:${tenant.id}`).emit('inventory_updated', { updated });
          }

          console.log(`[Inventory Sync] Tenant ${tenant.slug}: updated ${updated} products`);
        } catch (err) {
          console.error(`[Inventory Sync] Error for tenant ${tenant.slug}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Inventory Sync] Global error:', err.message);
    }
  }

  // Run every 30 minutes
  setInterval(syncAll, INTERVAL);
  console.log('[Inventory Sync] Scheduler started (every 30 min)');
}

module.exports = { startInventorySync };
