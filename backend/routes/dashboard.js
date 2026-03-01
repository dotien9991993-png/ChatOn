const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API Dashboard — thống kê tổng quan (multi-tenant via req.tenantId)
 */

// GET /api/dashboard/stats — Stat cards overview
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Conversations stats
    const { count: totalConversations } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: activeConversations } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    const { count: unassignedConversations } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('assigned_to', null)
      .eq('status', 'active');

    // Messages today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: messagesToday } = await supabaseAdmin
      .from('messages')
      .select('*, conversations!inner(tenant_id)', { count: 'exact', head: true })
      .eq('conversations.tenant_id', tenantId)
      .gte('messages.created_at', todayStart.toISOString());

    // Orders stats
    const { count: totalOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { data: revenueData } = await supabaseAdmin
      .from('orders')
      .select('total')
      .eq('tenant_id', tenantId)
      .in('status', ['pushed', 'shipping', 'delivered']);

    const totalRevenue = (revenueData || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Customers count
    const { count: totalCustomers } = await supabaseAdmin
      .from('customers')
      .select('*, conversations!inner(tenant_id)', { count: 'exact', head: true })
      .eq('conversations.tenant_id', tenantId);

    // New customers today
    const { count: newCustomersToday } = await supabaseAdmin
      .from('customers')
      .select('*, conversations!inner(tenant_id)', { count: 'exact', head: true })
      .eq('conversations.tenant_id', tenantId)
      .gte('customers.created_at', todayStart.toISOString());

    // Unread total
    const { data: unreadData } = await supabaseAdmin
      .from('conversations')
      .select('unread')
      .eq('tenant_id', tenantId)
      .gt('unread', 0);

    const totalUnread = (unreadData || []).reduce((sum, c) => sum + (c.unread || 0), 0);

    res.json({
      totalConversations: totalConversations || 0,
      activeConversations: activeConversations || 0,
      unassignedConversations: unassignedConversations || 0,
      messagesToday: messagesToday || 0,
      totalOrders: totalOrders || 0,
      totalRevenue,
      totalCustomers: totalCustomers || 0,
      newCustomersToday: newCustomersToday || 0,
      totalUnread: totalUnread || 0,
    });
  } catch (err) {
    console.error('[Dashboard] GET /stats error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/charts — Chart data (messages per day, orders per day)
router.get('/charts', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { days = 7 } = req.query;
    const daysNum = Math.min(Number(days), 30);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // Messages per day
    const { data: messagesRaw } = await supabaseAdmin
      .from('messages')
      .select('created_at, sender, conversations!inner(tenant_id)')
      .eq('conversations.tenant_id', tenantId)
      .gte('messages.created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Orders per day
    const { data: ordersRaw } = await supabaseAdmin
      .from('orders')
      .select('created_at, status, total')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Build daily data
    const dailyData = [];
    for (let i = 0; i < daysNum; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayMessages = (messagesRaw || []).filter((m) => m.created_at?.startsWith(dateStr));
      const dayOrders = (ordersRaw || []).filter((o) => o.created_at?.startsWith(dateStr));

      dailyData.push({
        date: dateStr,
        label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        messages: dayMessages.length,
        inbound: dayMessages.filter((m) => m.sender === 'customer').length,
        outbound: dayMessages.filter((m) => m.sender === 'agent' || m.sender === 'ai').length,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      });
    }

    // Conversation status breakdown
    const { data: statusData } = await supabaseAdmin
      .from('conversations')
      .select('status')
      .eq('tenant_id', tenantId);

    const statusCounts = { active: 0, resolved: 0, spam: 0 };
    for (const c of statusData || []) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    }

    // Channel breakdown
    const { data: channelData } = await supabaseAdmin
      .from('conversations')
      .select('channel')
      .eq('tenant_id', tenantId);

    const channelCounts = {};
    for (const c of channelData || []) {
      channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1;
    }

    res.json({
      daily: dailyData,
      statusBreakdown: statusCounts,
      channelBreakdown: channelCounts,
    });
  } catch (err) {
    console.error('[Dashboard] GET /charts error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/agents — Agent performance
router.get('/agents', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Get all team members
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, role, online_at, avatar_url')
      .eq('tenant_id', tenantId);

    // Get conversation assignments + message counts per agent
    const agents = await Promise.all(
      (profiles || []).map(async (p) => {
        const { count: assignedCount } = await supabaseAdmin
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('assigned_to', p.id);

        const { count: resolvedCount } = await supabaseAdmin
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('assigned_to', p.id)
          .eq('status', 'resolved');

        // Messages sent by this agent today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: messagesToday } = await supabaseAdmin
          .from('messages')
          .select('*, conversations!inner(tenant_id)', { count: 'exact', head: true })
          .eq('conversations.tenant_id', tenantId)
          .eq('messages.sender', 'agent')
          .gte('messages.created_at', todayStart.toISOString());

        const isOnline = p.online_at && (Date.now() - new Date(p.online_at).getTime() < 5 * 60 * 1000);

        return {
          id: p.id,
          name: p.display_name || 'Agent',
          role: p.role,
          avatarUrl: p.avatar_url,
          online: isOnline,
          onlineAt: p.online_at,
          assignedConversations: assignedCount || 0,
          resolvedConversations: resolvedCount || 0,
          messagesToday: messagesToday || 0,
        };
      })
    );

    res.json(agents);
  } catch (err) {
    console.error('[Dashboard] GET /agents error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
