const { supabaseAdmin } = require('../config/supabase');
const { executeCampaign } = require('../services/campaign-service');

let schedulerInterval = null;

/**
 * Start the campaign scheduler
 * Checks every 60 seconds for campaigns that are scheduled to send
 */
function startScheduler(io) {
  if (schedulerInterval) return;

  console.log('[CampaignScheduler] Started — checking every 60s');

  schedulerInterval = setInterval(async () => {
    try {
      const now = new Date().toISOString();

      // Find campaigns that are scheduled and due
      const { data: campaigns } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

      for (const campaign of campaigns || []) {
        console.log(`[CampaignScheduler] Triggering campaign ${campaign.id}`);

        // Mark as sending
        await supabaseAdmin
          .from('campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);

        // Execute async
        executeCampaign(campaign.id, io).catch((err) => {
          console.error(`[CampaignScheduler] Execute error for ${campaign.id}:`, err.message);
        });
      }
    } catch (err) {
      console.error('[CampaignScheduler] Check error:', err.message);
    }
  }, 60 * 1000);
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[CampaignScheduler] Stopped');
  }
}

module.exports = { startScheduler, stopScheduler };
