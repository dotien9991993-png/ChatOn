import React, { useState, useEffect } from 'react';
import { updateConversation, getTeamMembers, assignConversation, getWebsiteOrders } from '../services/api';
import { User, Phone, StickyNote, MessageSquare, Calendar, X, ShoppingBag, ChevronLeft } from 'lucide-react';

/**
 * Panel thông tin khách hàng — cột phải
 * Avatar, tên, Facebook ID, SĐT, ghi chú, trạng thái, thống kê
 */
export default function CustomerInfo({ conversation, onClose, onBack, onUpdated }) {
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [websiteOrders, setWebsiteOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sync state khi chọn conversation khác
  useEffect(() => {
    if (conversation) {
      setPhone(conversation.phone || '');
      setNotes(conversation.notes || '');
    }
  }, [conversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load team members for assignment dropdown
  useEffect(() => {
    getTeamMembers().then(setTeamMembers).catch(() => {});
  }, []);

  // Load website orders for this customer
  useEffect(() => {
    if (!conversation?.phone) {
      setWebsiteOrders([]);
      return;
    }
    setLoadingOrders(true);
    getWebsiteOrders({ customer_phone: conversation.phone })
      .then((res) => setWebsiteOrders(res.orders || []))
      .catch(() => setWebsiteOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [conversation?.phone]);

  // Lưu thông tin (phone / notes)
  async function handleSave() {
    if (!conversation) return;
    setSaving(true);
    try {
      await updateConversation(conversation.id, { phone, notes });
      onUpdated?.({ phone, notes });
    } catch (err) {
      console.error('Lỗi lưu:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!conversation) return null;

  // Shared content (used by both mobile and desktop)
  const infoContent = (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Avatar + tên */}
        <div className="flex flex-col items-center py-5 px-4 border-b border-slate-200">
          {conversation.avatar ? (
            <img
              src={conversation.avatar}
              alt={conversation.name}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-500/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl ring-2 ring-blue-500/20">
              {(conversation.name || 'K')[0].toUpperCase()}
            </div>
          )}
          <h4 className="mt-3 text-base font-semibold text-slate-800">{conversation.name}</h4>
          {/* Badge kênh */}
          <span className="mt-1.5 inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">
            <MessageSquare className="w-3 h-3" />
            Messenger
          </span>
        </div>

        {/* Fields */}
        <div className="px-4 py-3 space-y-3">
          {/* Facebook ID */}
          <div>
            <label className="flex items-center gap-1 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              <User className="w-3 h-3" />
              Facebook ID
            </label>
            <p className="text-sm text-slate-500 font-mono mt-1">{conversation.senderId}</p>
          </div>

          {/* Trạng thái */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Trạng thái</label>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                conversation.status === 'active' ? 'bg-green-500' :
                conversation.status === 'resolved' ? 'bg-slate-400' : 'bg-red-500'
              }`} />
              <span className="text-sm text-slate-700 capitalize">{conversation.status}</span>
            </div>
          </div>

          {/* Phân công */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Phân công cho</label>
            <select
              value={conversation.assigned_to || ''}
              onChange={async (e) => {
                const agentId = e.target.value || null;
                setAssigning(true);
                try {
                  await assignConversation(conversation.id, agentId);
                  onUpdated?.({ assigned_to: agentId });
                } catch (err) {
                  console.error('Assign error:', err);
                } finally {
                  setAssigning(false);
                }
              }}
              disabled={assigning}
              className="mt-1 w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 transition"
            >
              <option value="">Chưa phân công</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role}){m.online ? ' - Online' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* SĐT — editable */}
          <div>
            <label className="flex items-center gap-1 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              <Phone className="w-3 h-3" />
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handleSave}
              placeholder="Nhập SĐT..."
              className="mt-1 w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 transition"
            />
          </div>

          {/* Ghi chú — editable */}
          <div>
            <label className="flex items-center gap-1 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              <StickyNote className="w-3 h-3" />
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSave}
              placeholder="Thêm ghi chú về khách..."
              rows={3}
              className="mt-1 w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none transition"
            />
          </div>

          {/* Thống kê */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-slate-500">
                <MessageSquare className="w-3 h-3" />
                Tổng tin nhắn
              </span>
              <span className="text-slate-700">{conversation.messageCount || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-slate-500">
                <Calendar className="w-3 h-3" />
                Bắt đầu chat
              </span>
              <span className="text-slate-700">
                {new Date(conversation.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Đơn hàng website */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-1 text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-2">
              <ShoppingBag className="w-3 h-3" />
              Đơn hàng
            </label>
            {loadingOrders ? (
              <p className="text-xs text-slate-400">Đang tải...</p>
            ) : websiteOrders.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có đơn hàng</p>
            ) : (
              <div className="space-y-1.5">
                {websiteOrders.map((order) => (
                  <div key={order.id} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-blue-600">{order.order_code}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {Number(order.total).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 text-center">
        {saving && <span className="text-[11px] text-blue-600">Đang lưu...</span>}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: full screen với back button */}
      {onBack && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white">
          {/* Mobile header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 flex-shrink-0 safe-area-top">
            <button onClick={onBack} className="text-slate-600 hover:text-slate-900 transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-semibold text-slate-800">Thông tin khách hàng</h3>
          </div>
          {infoContent}
        </div>
      )}

      {/* Desktop: giữ nguyên layout cũ */}
      <div className="hidden md:flex flex-col h-full bg-white border-l border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Thông tin khách
            </h3>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        {infoContent}
      </div>
    </>
  );
}
