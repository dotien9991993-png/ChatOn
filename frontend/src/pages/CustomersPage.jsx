import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Download, Tag, Plus, Minus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as api from '../services/api';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(v) {
  if (!v) return '0đ';
  return Number(v).toLocaleString('vi-VN') + 'đ';
}

const CHANNEL_BADGES = {
  facebook: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'FB' },
  zalo: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Zalo' },
  instagram: { bg: 'bg-pink-50', text: 'text-pink-600', label: 'IG' },
  tiktok: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'TikTok' },
};

/**
 * Trang Khách hàng CRM
 */
export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (tagFilter) params.tag = tagFilter;
      const res = await api.getCustomers(params);
      setCustomers(res.customers || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Load customers error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, tagFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    api.getCustomerTags().then(setAllTags).catch(() => {});
  }, []);

  async function handleSelectCustomer(id) {
    setDetailLoading(true);
    try {
      const data = await api.getCustomer(id);
      setSelectedCustomer(data);
    } catch (err) {
      console.error('Load customer detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdateCustomer(id, updates) {
    try {
      await api.updateCustomer(id, updates);
      setSelectedCustomer((prev) => prev ? { ...prev, ...updates } : prev);
      loadCustomers();
    } catch (err) {
      console.error('Update customer error:', err);
    }
  }

  async function handleBulkTag(action) {
    if (!bulkTagInput.trim() || selectedIds.length === 0) return;
    const tags = bulkTagInput.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      await api.bulkTagCustomers({ customerIds: selectedIds, tags, action });
      setBulkTagInput('');
      setSelectedIds([]);
      loadCustomers();
      api.getCustomerTags().then(setAllTags).catch(() => {});
    } catch (err) {
      console.error('Bulk tag error:', err);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  }

  async function handleExport() {
    try {
      const res = await api.exportCustomersCsv();
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  }

  const searchTimeout = React.useRef(null);
  function handleSearchChange(val) {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      {/* Main list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Khách hàng</h1>
              <p className="text-sm text-slate-500">{total} khách hàng</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                defaultValue={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm theo tên, SĐT..."
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40"
              />
            </div>
            <select
              value={tagFilter}
              onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
            >
              <option value="">Tất cả tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
              <span className="text-xs text-slate-600">{selectedIds.length} đã chọn</span>
              <input
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                placeholder="tag1, tag2..."
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded px-2 py-1 outline-none flex-1"
              />
              <button onClick={() => handleBulkTag('add')} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition flex items-center gap-1">
                <Plus className="w-3 h-3" /><Tag className="w-3 h-3" /> Gắn tag
              </button>
              <button onClick={() => handleBulkTag('remove')} className="text-xs px-2 py-1 bg-red-600/80 text-white rounded hover:bg-red-500 transition flex items-center gap-1">
                <Minus className="w-3 h-3" /><Tag className="w-3 h-3" /> Gỡ tag
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-white border-slate-300"
                  />
                </th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Kênh</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 text-center">Đơn hàng</th>
                <th className="px-4 py-3 text-right">Tổng chi</th>
                <th className="px-4 py-3">Tin cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">Đang tải...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">Không tìm thấy khách hàng nào</td>
                </tr>
              ) : (
                customers.map((c) => {
                  const badge = CHANNEL_BADGES[c.channel] || CHANNEL_BADGES.facebook;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCustomer(c.id)}
                      className={`hover:bg-slate-50 cursor-pointer transition ${selectedCustomer?.id === c.id ? 'bg-slate-100' : ''}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded bg-white border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.avatar ? (
                            <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-semibold">
                              {(c.name || 'K')[0].toUpperCase()}
                            </div>
                          )}
                          <span className="text-slate-700 font-medium truncate max-w-[160px]">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{c.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(c.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{t}</span>
                          ))}
                          {(c.tags || []).length > 3 && (
                            <span className="text-[10px] text-slate-400">+{c.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-blue-600 font-medium">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-right text-slate-700 text-xs">{formatMoney(c.totalSpent)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[140px]">{c.lastMessage || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">Trang {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-xs border border-slate-200 text-slate-600 rounded hover:bg-slate-100 disabled:opacity-30 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-xs border border-slate-200 text-slate-600 rounded hover:bg-slate-100 disabled:opacity-30 transition flex items-center gap-1"
              >
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          loading={detailLoading}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={handleUpdateCustomer}
        />
      )}
    </div>
  );
}

/**
 * Panel chi tiết khách hàng bên phải
 */
function CustomerDetailPanel({ customer, loading, onClose, onUpdate }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(customer.notes || '');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setNotes(customer.notes || '');
    setEditingNotes(false);
    setTagInput('');
  }, [customer.id]);

  function addTag() {
    if (!tagInput.trim()) return;
    const newTags = [...(customer.tags || []), tagInput.trim()];
    onUpdate(customer.id, { tags: newTags });
    setTagInput('');
  }

  function removeTag(tag) {
    const newTags = (customer.tags || []).filter((t) => t !== tag);
    onUpdate(customer.id, { tags: newTags });
  }

  if (loading) {
    return (
      <div className="w-80 border-l border-slate-200 bg-white flex items-center justify-center">
        <span className="text-slate-500 text-sm">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Chi tiết khách hàng</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar + Name */}
        <div className="text-center">
          {customer.avatar ? (
            <img src={customer.avatar} alt="" className="w-16 h-16 rounded-full mx-auto object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg mx-auto">
              {(customer.name || 'K')[0].toUpperCase()}
            </div>
          )}
          <h4 className="text-slate-800 font-semibold mt-2">{customer.name}</h4>
          <p className="text-xs text-slate-500">{customer.channel} - {customer.source}</p>
        </div>

        {/* Info fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">SĐT</label>
            <p className="text-sm text-slate-700">{customer.phone || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Địa chỉ</label>
            <p className="text-sm text-slate-700">{customer.address || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ngày tạo</label>
            <p className="text-sm text-slate-700">{formatDate(customer.createdAt)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{customer.totalOrders}</p>
            <p className="text-[10px] text-slate-500">Đơn hàng</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{formatMoney(customer.totalSpent)}</p>
            <p className="text-[10px] text-slate-500">Tổng chi</p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-slate-500 mb-2">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(customer.tags || []).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-red-400">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Thêm tag..."
              className="flex-1 bg-slate-50 text-xs text-slate-700 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/40"
            />
            <button onClick={addTag} className="text-xs px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 transition">+</button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500">Ghi chú</label>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-[10px] text-blue-600 hover:text-blue-500">
                Sửa
              </button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 text-xs text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => { onUpdate(customer.id, { notes }); setEditingNotes(false); }}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
                >
                  Lưu
                </button>
                <button
                  onClick={() => { setNotes(customer.notes || ''); setEditingNotes(false); }}
                  className="text-xs px-2 py-1 border border-slate-200 text-slate-600 rounded hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">{customer.notes || 'Chưa có ghi chú'}</p>
          )}
        </div>

        {/* Recent Orders */}
        {customer.orders?.length > 0 && (
          <div>
            <label className="block text-xs text-slate-500 mb-2">Đơn hàng gần đây</label>
            <div className="space-y-1.5">
              {customer.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-700 font-mono">{o.order_code}</p>
                    <p className="text-[10px] text-slate-500">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-700">{formatMoney(o.total)}</p>
                    <span className={`text-[10px] ${
                      o.status === 'delivered' ? 'text-green-600' :
                      o.status === 'cancelled' ? 'text-red-600' :
                      'text-amber-600'
                    }`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigate to chat */}
        {customer.conversationId && (
          <a
            href={`/chat`}
            className="block w-full text-center text-xs px-3 py-2 bg-slate-100 text-blue-600 rounded-lg hover:bg-slate-200 transition"
          >
            Mở hội thoại
          </a>
        )}
      </div>
    </div>
  );
}
