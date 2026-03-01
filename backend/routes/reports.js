const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API Reports — xuất báo cáo Excel
 */

// GET /api/reports/export — Export Excel report
router.get('/export', async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { days: daysParam = '30' } = req.query;
    const days = parseInt(daysParam) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString();

    const tenantId = req.tenantId;

    // Sheet 1: Overview stats
    const { count: totalConversations } = await supabaseAdmin
      .from('conversations').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
    const { count: activeConversations } = await supabaseAdmin
      .from('conversations').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active');
    const { data: revenueData } = await supabaseAdmin
      .from('orders').select('total').eq('tenant_id', tenantId).in('status', ['pushed', 'shipping', 'delivered']);
    const totalRevenue = (revenueData || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
    const { count: totalCustomers } = await supabaseAdmin
      .from('customers').select('*, conversations!inner(tenant_id)', { count: 'exact', head: true }).eq('conversations.tenant_id', tenantId);
    const { count: totalOrders } = await supabaseAdmin
      .from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);

    const overviewData = [
      { 'Chỉ số': 'Tổng hội thoại', 'Giá trị': totalConversations || 0 },
      { 'Chỉ số': 'Hội thoại đang mở', 'Giá trị': activeConversations || 0 },
      { 'Chỉ số': 'Tổng đơn hàng', 'Giá trị': totalOrders || 0 },
      { 'Chỉ số': 'Doanh thu', 'Giá trị': totalRevenue },
      { 'Chỉ số': 'Tổng khách hàng', 'Giá trị': totalCustomers || 0 },
      { 'Chỉ số': 'Thời gian báo cáo', 'Giá trị': `${days} ngày gần nhất` },
    ];

    // Sheet 2: Orders
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('order_code, customer_name, customer_phone, customer_address, items, total, status, source, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startStr)
      .order('created_at', { ascending: false });

    const ordersData = (orders || []).map(o => ({
      'Mã đơn': o.order_code,
      'Khách hàng': o.customer_name,
      'SĐT': o.customer_phone,
      'Địa chỉ': o.customer_address,
      'Sản phẩm': (o.items || []).map(i => `${i.product_name} x${i.quantity}`).join(', '),
      'Tổng tiền': o.total,
      'Trạng thái': o.status,
      'Nguồn': o.source,
      'Ngày tạo': new Date(o.created_at).toLocaleString('vi-VN'),
    }));

    // Sheet 3: Customers
    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('name, phone, email, address, channel_type, tags, created_at, conversations!inner(tenant_id)')
      .eq('conversations.tenant_id', tenantId)
      .limit(1000);

    const customersData = (customers || []).map(c => ({
      'Tên': c.name,
      'SĐT': c.phone || '',
      'Email': c.email || '',
      'Địa chỉ': c.address || '',
      'Kênh': c.channel_type,
      'Tags': (c.tags || []).join(', '),
      'Ngày tạo': new Date(c.created_at).toLocaleString('vi-VN'),
    }));

    // Sheet 4: Agent performance
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('display_name, role')
      .eq('tenant_id', tenantId);

    const agentsData = [];
    for (const p of profiles || []) {
      const { count: assigned } = await supabaseAdmin
        .from('conversations').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('assigned_to', p.id);
      const { count: resolved } = await supabaseAdmin
        .from('conversations').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('assigned_to', p.id).eq('status', 'resolved');

      agentsData.push({
        'Nhân viên': p.display_name,
        'Vai trò': p.role,
        'Đã phân công': assigned || 0,
        'Đã xử lý xong': resolved || 0,
      });
    }

    // Build workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), 'Tổng quan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData.length ? ordersData : [{ 'Không có dữ liệu': '' }]), 'Đơn hàng');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersData.length ? customersData : [{ 'Không có dữ liệu': '' }]), 'Khách hàng');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agentsData.length ? agentsData : [{ 'Không có dữ liệu': '' }]), 'Hiệu suất NV');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=chaton-report-${days}d.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error('[Reports] Export error:', err.message);
    res.status(500).json({ error: 'Lỗi xuất báo cáo: ' + err.message });
  }
});

module.exports = router;
