const { supabaseAdmin } = require('../config/supabase');
const fbService = require('./facebook');

/**
 * Execute a campaign — send messages to all eligible recipients
 * Respects Facebook 24h messaging policy
 */
async function executeCampaign(campaignId, io) {
  console.log(`[Campaign] Starting execution for campaign ${campaignId}`);

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    console.error(`[Campaign] Campaign ${campaignId} not found`);
    return;
  }

  const tenantId = campaign.tenant_id;

  // Get channel token
  const { data: ch } = await supabaseAdmin
    .from('channels')
    .select('page_access_token')
    .eq('tenant_id', tenantId)
    .eq('type', 'facebook')
    .eq('connected', true)
    .limit(1)
    .single();

  const token = ch?.page_access_token;

  // Build recipient list
  let query = supabaseAdmin
    .from('conversations')
    .select('id, customer_id, last_message_at, channel, customers!inner(id, name, external_id, tags)')
    .eq('tenant_id', tenantId);

  if (campaign.target_type === 'channel') {
    query = query.eq('channel', campaign.target_channel || 'facebook');
  }

  const { data: convs } = await query;
  let recipients = convs || [];

  // Filter by tags
  if (campaign.target_type === 'tag' && campaign.target_tags?.length) {
    recipients = recipients.filter((c) => {
      const tags = c.customers?.tags || [];
      return campaign.target_tags.some((t) => tags.includes(t));
    });
  }

  // Filter by specific customer IDs
  if (campaign.target_type === 'custom' && campaign.target_customer_ids?.length) {
    recipients = recipients.filter((c) => campaign.target_customer_ids.includes(c.customer_id));
  }

  // 24h eligibility filter
  const now = Date.now();
  const eligible = recipients.filter((c) => {
    const lastMsg = new Date(c.last_message_at).getTime();
    return (now - lastMsg) < 24 * 60 * 60 * 1000;
  });

  // Update campaign totals
  await supabaseAdmin
    .from('campaigns')
    .update({
      total_recipients: recipients.length,
      status: 'sending',
    })
    .eq('id', campaignId);

  let sentCount = 0;
  let failedCount = 0;

  for (const conv of eligible) {
    const recipientId = conv.customers?.external_id;
    if (!recipientId) {
      failedCount++;
      continue;
    }

    try {
      // Create log entry
      const { data: log } = await supabaseAdmin
        .from('campaign_logs')
        .insert({
          campaign_id: campaignId,
          customer_id: conv.customer_id,
          platform_user_id: recipientId,
          channel_type: conv.channel,
          status: 'pending',
        })
        .select('id')
        .single();

      // Send message via Facebook
      if (token && token.length > 30) {
        const result = await fbService.sendMessageWithToken(recipientId, campaign.message_text, token);

        if (result.success) {
          sentCount++;
          await supabaseAdmin
            .from('campaign_logs')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', log.id);
        } else {
          failedCount++;
          await supabaseAdmin
            .from('campaign_logs')
            .update({ status: 'failed', error: result.error })
            .eq('id', log.id);
        }
      } else {
        // Demo mode — mark as sent locally
        sentCount++;
        await supabaseAdmin
          .from('campaign_logs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', log.id);
      }

      // Rate limiting — wait 200ms between sends
      await new Promise((r) => setTimeout(r, 200));

      // Emit progress
      io.to(`tenant:${tenantId}`).emit('campaign_progress', {
        campaignId,
        sent: sentCount,
        failed: failedCount,
        total: eligible.length,
      });
    } catch (err) {
      failedCount++;
      console.error(`[Campaign] Send error to ${recipientId}:`, err.message);
    }
  }

  // Mark ineligible as failed
  const ineligible = recipients.length - eligible.length;
  for (const conv of recipients.filter((c) => !eligible.includes(c))) {
    await supabaseAdmin
      .from('campaign_logs')
      .insert({
        campaign_id: campaignId,
        customer_id: conv.customer_id,
        platform_user_id: conv.customers?.external_id || '',
        channel_type: conv.channel,
        status: 'failed',
        error: 'Ngoài cửa sổ tin nhắn 24h',
      });
  }

  // Finalize campaign
  const finalStatus = failedCount === eligible.length && eligible.length > 0 ? 'failed' : 'sent';
  await supabaseAdmin
    .from('campaigns')
    .update({
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount + ineligible,
      delivered_count: sentCount,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  // Emit completion
  io.to(`tenant:${tenantId}`).emit('campaign_complete', {
    campaignId,
    status: finalStatus,
    sent: sentCount,
    failed: failedCount + ineligible,
    total: recipients.length,
  });

  console.log(`[Campaign] Completed ${campaignId}: sent=${sentCount}, failed=${failedCount}, ineligible=${ineligible}`);
}

module.exports = { executeCampaign };
