const { supabaseAdmin } = require('../config/supabase');
const fbService = require('../services/facebook');

/**
 * Remarketing Job — runs every hour
 * Sends follow-up to customers with purchase intent but no order within 24h
 */
function startRemarketingJob(io) {
  const INTERVAL = 60 * 60 * 1000; // 1 hour

  async function processRemarketing() {
    try {
      // Find tenants with remarketing enabled
      const { data: tenants } = await supabaseAdmin
        .from('tenants')
        .select('id, ai_config, shop_info');

      for (const tenant of tenants || []) {
        const config = tenant.ai_config || {};
        if (!config.remarketing_enabled) continue;

        const remarketingText = config.remarketing_text || 'Chào anh/chị! 👋 Hôm qua anh/chị có hỏi về sản phẩm. Anh/chị còn quan tâm không ạ? Shop đang có ưu đãi đặc biệt!';
        const waitHours = config.remarketing_wait_hours || 24;
        const cutoffTime = new Date(Date.now() - waitHours * 3600000).toISOString();
        const maxAge = new Date(Date.now() - 48 * 3600000).toISOString(); // Don't send if older than 48h (FB policy)

        try {
          // Find conversations with purchase intent, updated within window, no order
          const { data: conversations } = await supabaseAdmin
            .from('conversations')
            .select('id, customer_id, page_id, customers(external_id, name), metadata')
            .eq('tenant_id', tenant.id)
            .eq('status', 'active')
            .lte('last_message_at', cutoffTime)
            .gte('last_message_at', maxAge);

          for (const conv of conversations || []) {
            const meta = conv.metadata || {};
            if (!meta.purchase_intent || meta.remarketing_sent) continue;

            // Check no order exists
            const { count: orderCount } = await supabaseAdmin
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id);

            if (orderCount > 0) continue;

            // Send remarketing message via Facebook
            if (conv.customers?.external_id) {
              const token = await fbService.getChannelToken(tenant.id, conv.page_id);

              if (token) {
                const personalText = remarketingText.replace('{customer_name}', conv.customers.name || 'anh/chị');
                await fbService.sendMessageWithToken(conv.customers.external_id, personalText, token);

                // Save message + mark sent
                await supabaseAdmin.from('messages').insert({
                  conversation_id: conv.id,
                  sender: 'system',
                  text: personalText,
                  type: 'remarketing',
                });

                await supabaseAdmin
                  .from('conversations')
                  .update({ metadata: { ...meta, remarketing_sent: true } })
                  .eq('id', conv.id);

                console.log(`[Remarketing] Sent to conversation ${conv.id}`);
              }
            }
          }
        } catch (err) {
          console.error(`[Remarketing] Tenant ${tenant.id} error:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Remarketing] Global error:', err.message);
    }
  }

  setInterval(processRemarketing, INTERVAL);
  console.log('[Remarketing] Job started (every 1 hour)');
}

module.exports = { startRemarketingJob };
