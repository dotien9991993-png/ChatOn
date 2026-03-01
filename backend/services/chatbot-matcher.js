const { supabaseAdmin } = require('../config/supabase');

/**
 * Chatbot Rule Matcher — check incoming message against rules BEFORE AI
 * Returns matched rule response or null
 */
async function matchChatbotRule(tenantId, messageText) {
  try {
    const { data: rules } = await supabaseAdmin
      .from('chatbot_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) return null;

    const msgLower = messageText.toLowerCase().trim();

    for (const rule of rules) {
      if (!rule.keywords || rule.keywords.length === 0) continue;

      let matched = false;

      for (const keyword of rule.keywords) {
        const kwLower = keyword.toLowerCase().trim();
        if (!kwLower) continue;

        switch (rule.match_type) {
          case 'exact':
            if (msgLower === kwLower) matched = true;
            break;
          case 'starts_with':
            if (msgLower.startsWith(kwLower)) matched = true;
            break;
          case 'contains':
          default:
            if (msgLower.includes(kwLower)) matched = true;
            break;
        }

        if (matched) break;
      }

      if (matched) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          responseText: rule.response_text,
          responseButtons: rule.response_buttons || [],
          responseImageUrl: rule.response_image_url,
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[ChatbotMatcher] Error:', err.message);
    return null;
  }
}

module.exports = { matchChatbotRule };
