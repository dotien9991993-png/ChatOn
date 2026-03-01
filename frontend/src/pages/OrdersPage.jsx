import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, RefreshCw, MessageSquare, X, Bot, UserCheck } from 'lucide-react';
import * as api from '../services/api';

const STATUS_MAP = {
  draft: { label: 'Nháp', color: 'text-slate-600', bg: 'bg-slate-500/10', dot: 'bg-slate-400' },
  pushed: { label: 'Đã đẩy', color: 'text-green-600', bg: 'bg-green-500/10', dot: 'bg-green-500' },
  push_failed: { label: 'Thất bại', color: 'text-red-600', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  confirmed: { label: 'Xác nhận', color: 'text-blue-600', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  packing: { label: 'Đóng gói', color: 'text-yellow-600', bg: 'bg-yellow-500/10', dot: 'bg-yellow-500' },
  shipping: { label: 'Đang giao', color: 'text-orange-600', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  delivered: { label: 'Đã giao', color: 'text-green-600', bg: 'bg-green-500/10', dot: 'bg-green-500' },
  cancelled: { label: 'Đã hủy', color: 'text-red-600', bg: 'bg-red-500/10', dot: 'bg-red-500' },
};

const FILTER_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'pushed', label: 'Đã đẩy' },
  { key: 'push_failed', label: 'Thất bại' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await api.getOrders(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRetry(orderId) {
    try {
      const result = await api.retryOrderPush(orderId);
      showToast(result.success ? 'Đẩy lại thành công' : 'Vẫn thất bại: ' + result.message, result.success ? 'success' : 'error');
      loadOrders();
    } catch (err) {
      showToast('Lỗi đẩy lại', 'error');
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" /> Đơn hàng
            <span className="text-sm font-normal text-slate-500">({total})</span>
          </h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm đơn hàng..."
              className="bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 w-48"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === tab.key ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Mã đơn</th>
                <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Khách hàng</th>
                <th className="text-right text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Tổng tiền</th>
                <th className="text-center text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">OMS</th>
                <th className="text-right text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Đang tải...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Chưa có đơn hàng nào</td></tr>
              ) : orders.map((o) => {
                const st = STATUS_MAP[o.status] || STATUS_MAP.draft;
                return (
                  <tr key={o.id} className="border-b border-slate-200 hover:bg-slate-50 transition cursor-pointer" onClick={() => setDetail(o)}>
                    <td className="px-4 py-3">
                      <span className="text-sm text-blue-600 font-medium">{o.order_code}</span>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">{o.created_by === 'ai' ? <><Bot className="w-3 h-3" /> AI</> : <><UserCheck className="w-3 h-3" /> NV</>}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800">{o.customer_name || '—'}</p>
                      <p className="text-[11px] text-slate-500">{o.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-800 font-medium">{Number(o.total).toLocaleString('vi-VN')}đ</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${st.bg} ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                      </span>
                      {o.status === 'push_failed' && (
                        <button onClick={(e) => { e.stopPropagation(); handleRetry(o.id); }} className="flex items-center gap-1 mx-auto mt-1 text-[10px] text-blue-600 hover:text-blue-500">
                          <RefreshCw className="w-3 h-3" /> Đẩy lại
                        </button>
                      )}
                      {o.oms_order_id && <p className="text-[10px] text-slate-400 mt-0.5">{o.oms_order_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-slate-500">{timeAgo(o.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">&lt;</button>
            <span className="text-sm text-slate-500">Trang {page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">&gt;</button>
          </div>
        )}

        {/* Detail panel */}
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
            <div className="bg-white border border-slate-200 shadow-2xl rounded-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /> {detail.order_code}</h2>
                <button onClick={() => setDetail(null)} className="text-slate-600 hover:text-slate-900"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Khách hàng</p>
                  <p className="text-sm text-slate-800">{detail.customer_name || '—'}</p>
                  <p className="text-sm text-slate-600">{detail.customer_phone}</p>
                  <p className="text-sm text-slate-600">{detail.customer_address}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2">Sản phẩm</p>
                  {(detail.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-slate-700">{item.product_name} x{item.quantity}</span>
                      <span className="text-slate-800">{Number(item.subtotal || item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-medium pt-2 mt-2 border-t border-slate-200">
                    <span className="text-slate-800">Tổng cộng</span>
                    <span className="text-blue-600">{Number(detail.total).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Trạng thái OMS</p>
                  {(() => {
                    const st = STATUS_MAP[detail.status] || STATUS_MAP.draft;
                    return <span className={`${st.color} text-sm font-medium inline-flex items-center gap-1.5`}><span className={`w-2 h-2 rounded-full ${st.dot}`} />{st.label}</span>;
                  })()}
                  {detail.oms_order_id && <p className="text-xs text-slate-500 mt-1">OMS ID: {detail.oms_order_id}</p>}
                  {detail.oms_pushed_at && <p className="text-xs text-slate-500">Đẩy lúc: {new Date(detail.oms_pushed_at).toLocaleString('vi-VN')}</p>}
                </div>

                {detail.note && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Ghi chú</p>
                    <p className="text-sm text-slate-700">{detail.note}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {detail.status === 'push_failed' && (
                    <button onClick={() => { handleRetry(detail.id); setDetail(null); }} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Đẩy lại OMS
                    </button>
                  )}
                  {detail.conversation_id && (
                    <button onClick={() => { setDetail(null); navigate('/chat'); }} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Mở chat
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
