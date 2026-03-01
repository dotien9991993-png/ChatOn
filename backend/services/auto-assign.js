const { supabaseAdmin } = require('../config/supabase');

/**
 * Auto-assign service — round-robin phân chia hội thoại cho agents online
 */

// Track last assigned index per tenant (in-memory, resets on restart)
const lastAssignedIndex = new Map();

/**
 * Auto-assign a conversation to an available agent
 * @param {string} tenantId
 * @param {string} conversationId
 * @param {object} io - Socket.IO instance
 * @returns {object|null} assigned agent profile or null
 */
async function autoAssign(tenantId, conversationId, io) {
  try {
    // Check if conversation already assigned
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('assigned_to')
      .eq('id', conversationId)
      .single();

    if (conv?.assigned_to) return null; // Already assigned

    // Get online agents (seen in last 5 minutes)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: agents } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name')
      .eq('tenant_id', tenantId)
      .in('role', ['owner', 'admin', 'agent'])
      .gte('online_at', cutoff)
      .order('display_name');

    if (!agents || agents.length === 0) return null;

    // Round-robin
    const lastIdx = lastAssignedIndex.get(tenantId) || 0;
    const nextIdx = lastIdx % agents.length;
    const agent = agents[nextIdx];
    lastAssignedIndex.set(tenantId, nextIdx + 1);

    // Assign
    await supabaseAdmin
      .from('conversations')
      .update({ assigned_to: agent.id })
      .eq('id', conversationId);

    // Emit event
    if (io) {
      io.to(`tenant:${tenantId}`).emit('conversation_updated', {
        id: conversationId,
        assigned_to: agent.id,
        assigned_name: agent.display_name,
      });
    }

    return agent;
  } catch (err) {
    console.error('[AutoAssign] Error:', err.message);
    return null;
  }
}

module.exports = { autoAssign };
