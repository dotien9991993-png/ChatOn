const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API quản lý team (multi-tenant via req.tenantId)
 */

// GET /api/team — Danh sách thành viên
router.get('/', async (req, res) => {
  try {
    const { data: members, error } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, role, online_at, avatar_url, created_at')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Get email from auth.users for each member
    const result = await Promise.all(
      (members || []).map(async (m) => {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(m.id);
        const isOnline = m.online_at && (Date.now() - new Date(m.online_at).getTime() < 5 * 60 * 1000);

        return {
          id: m.id,
          name: m.display_name || 'Member',
          email: user?.email || '',
          role: m.role || 'agent',
          avatarUrl: m.avatar_url,
          online: isOnline,
          onlineAt: m.online_at,
          createdAt: m.created_at,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('[Team] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/team/invite — Mời thành viên mới
router.post('/invite', async (req, res) => {
  try {
    // Only owner/admin can invite
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin hoặc owner mới có thể mời thành viên' });
    }

    const { email, displayName, role = 'agent' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email là bắt buộc' });
    }

    // Create user via admin API
    const tempPassword = 'ChatOn@' + Math.random().toString(36).slice(2, 10);
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: displayName || email.split('@')[0], shop_name: '__join_existing__' },
    });

    if (createErr) {
      return res.status(400).json({ error: createErr.message });
    }

    // Update profile to join this tenant (override the trigger-created tenant)
    // First delete the auto-created tenant if exists
    const { data: autoProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', newUser.user.id)
      .single();

    if (autoProfile && autoProfile.tenant_id !== req.tenantId) {
      // Delete auto-created tenant (if it was just created by trigger)
      await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', autoProfile.tenant_id);
    }

    // Update profile to join existing tenant
    await supabaseAdmin
      .from('profiles')
      .update({
        tenant_id: req.tenantId,
        display_name: displayName || email.split('@')[0],
        role: role,
      })
      .eq('id', newUser.user.id);

    res.json({
      success: true,
      member: {
        id: newUser.user.id,
        email,
        name: displayName || email.split('@')[0],
        role,
        tempPassword,
      },
    });
  } catch (err) {
    console.error('[Team] POST /invite error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/team/:id/role — Đổi role thành viên
router.put('/:id/role', async (req, res) => {
  try {
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền' });
    }

    const { role } = req.body;
    if (!['admin', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Role phải là admin hoặc agent' });
    }

    // Cannot change own role
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Không thể thay đổi role của chính mình' });
    }

    // Verify member is in same tenant
    const { data: member } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!member) {
      return res.status(404).json({ error: 'Không tìm thấy thành viên' });
    }

    // Cannot change owner role
    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Không thể thay đổi role của owner' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[Team] PUT /:id/role error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/team/:id — Xóa thành viên khỏi team
router.delete('/:id', async (req, res) => {
  try {
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền' });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Không thể xóa chính mình' });
    }

    const { data: member } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!member) {
      return res.status(404).json({ error: 'Không tìm thấy thành viên' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Không thể xóa owner' });
    }

    // Unassign all conversations
    await supabaseAdmin
      .from('conversations')
      .update({ assigned_to: null })
      .eq('tenant_id', req.tenantId)
      .eq('assigned_to', req.params.id);

    // Delete auth user (cascade deletes profile)
    await supabaseAdmin.auth.admin.deleteUser(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('[Team] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/team/assign — Phân chia hội thoại cho agent
router.post('/assign', async (req, res) => {
  try {
    const { conversationId, agentId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId là bắt buộc' });
    }

    // Verify conversation belongs to tenant
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!conv) {
      return res.status(404).json({ error: 'Không tìm thấy hội thoại' });
    }

    // Verify agent if provided
    if (agentId) {
      const { data: agent } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', agentId)
        .eq('tenant_id', req.tenantId)
        .single();

      if (!agent) {
        return res.status(404).json({ error: 'Không tìm thấy agent' });
      }
    }

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ assigned_to: agentId || null })
      .eq('id', conversationId);

    if (error) return res.status(500).json({ error: error.message });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`tenant:${req.tenantId}`).emit('conversation_updated', {
      id: conversationId,
      assigned_to: agentId || null,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Team] POST /assign error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
