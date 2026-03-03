const { supabaseAdmin } = require('../config/supabase');
const fbService = require('../services/facebook');

/**
 * Drip Campaign Processor — runs every minute
 * Processes pending drip enrollments
 */
function startDripProcessor(io) {
  const INTERVAL = 60 * 1000; // 1 minute

  async function processEnrollments() {
    try {
      const now = new Date().toISOString();

      // Find enrollments ready to send
      const { data: enrollments } = await supabaseAdmin
        .from('drip_enrollments')
        .select('*, drip_campaigns(*)')
        .eq('status', 'active')
        .lte('next_send_at', now)
        .limit(50);

      if (!enrollments || enrollments.length === 0) return;

      for (const enrollment of enrollments) {
        try {
          const campaign = enrollment.drip_campaigns;
          if (!campaign || !campaign.is_active) {
            await supabaseAdmin.from('drip_enrollments').update({ status: 'cancelled' }).eq('id', enrollment.id);
            continue;
          }

          const steps = campaign.steps || [];
          const currentStep = enrollment.current_step;
          if (currentStep >= steps.length) {
            await supabaseAdmin.from('drip_enrollments').update({ status: 'completed' }).eq('id', enrollment.id);
            continue;
          }

          const step = steps[currentStep];
          const messageText = step.message || step.text;
          if (!messageText) continue;

          // Get customer + conversation
          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('id, external_id, name')
            .eq('id', enrollment.customer_id)
            .single();

          if (!customer) continue;

          // Find conversation
          const { data: conv } = await supabaseAdmin
            .from('conversations')
            .select('id, channel, tenant_id, page_id')
            .eq('customer_id', customer.id)
            .single();

          if (!conv) continue;

          // Send message via channel
          if (conv.channel === 'facebook' && customer.external_id) {
            const token = await fbService.getChannelToken(conv.tenant_id, conv.page_id);
            if (token) {
              await fbService.sendMessageWithToken(customer.external_id, messageText, token);
            }
          }

          // Save as system message
          await supabaseAdmin.from('messages').insert({
            conversation_id: conv.id,
            sender: 'system',
            text: messageText,
            type: 'drip',
          });

          // Update enrollment
          const nextStep = currentStep + 1;
          if (nextStep >= steps.length) {
            await supabaseAdmin.from('drip_enrollments').update({ status: 'completed', current_step: nextStep }).eq('id', enrollment.id);
          } else {
            const nextDelay = steps[nextStep]?.delay_days || 1;
            const nextSendAt = new Date(Date.now() + nextDelay * 86400000).toISOString();
            await supabaseAdmin.from('drip_enrollments').update({
              current_step: nextStep,
              next_send_at: nextSendAt,
            }).eq('id', enrollment.id);
          }

          // Emit
          if (io) {
            io.to(`tenant:${conv.tenant_id}`).emit('new_message', {
              conversation: { id: conv.id },
              message: { from: 'system', text: messageText, type: 'drip', timestamp: new Date().toISOString() },
            });
          }
        } catch (err) {
          console.error('[DripProcessor] Enrollment error:', err.message);
        }
      }
    } catch (err) {
      console.error('[DripProcessor] Global error:', err.message);
    }
  }

  setInterval(processEnrollments, INTERVAL);
  console.log('[DripProcessor] Started (every 1 min)');
}

module.exports = { startDripProcessor };
