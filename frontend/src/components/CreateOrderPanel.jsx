import React, { useState, useRef, useEffect } from 'react';
import { Package, X, User, Search, Trash2, CheckCircle } from 'lucide-react';
import * as api from '../services/api';

/**
 * Slide panel tạo đơn hàng từ chat
 */
export default function CreateOrderPanel({ conversation, onClose }) {
  const [customerName, setCustomerName] = useState(conversation?.name || '');
  const [customerPhone, setCustomerPhone] = useState(conversation?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(conversation?.address || '');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);

  function handleSearch(q) {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchWebsiteProducts(q);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function addItem(product) {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems(items.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  }

  function updateQuantity(idx, qty) {
    if (qty < 1) return;
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleSubmit() {
    if (items.length === 0) return setToast({ msg: 'Chưa thêm sản phẩm nào', type: 'error' });
    if (!customerPhone.trim()) return setToast({ msg: 'Vui lòng nhập SĐT', type: 'error' });

    setSaving(true);
    try {
      await api.createWebsiteOrder({
        conversation_id: conversation.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: items.map((i) => ({
          product_name: i.product_name,
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
        })),
        note,
      });
      setToast({ msg: 'Đơn hàng đã tạo thành công!', type: 'success' });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setToast({ msg: 'Lỗi: ' + (err.response?.data?.error || err.message), type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="absolute inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="absolute top-0 right-0 bottom-0 z-50 w-[420px] max-w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" /> Tạo đơn hàng
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 transition"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Customer info */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Khách hàng</p>
            <div className="space-y-2">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tên khách hàng" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40" />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Số điện thoại *" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40" />
              <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Địa chỉ giao hàng" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40" />
            </div>
          </div>

          {/* Product search */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Sản phẩm</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Tìm sản phẩm..."
                className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto z-10">
                  {searchResults.map((p) => (
                    <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex justify-between items-center">
                      <span className="text-sm text-slate-800">{p.name}</span>
                      <span className="text-xs text-blue-600">{Number(p.price).toLocaleString('vi-VN')}đ</span>
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-xs text-slate-500 mt-1">Đang tìm...</p>}
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{item.product_name}</p>
                    <p className="text-xs text-slate-500">{Number(item.price).toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(idx, item.quantity - 1)} className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-200 text-sm hover:bg-slate-200 flex items-center justify-center">-</button>
                    <span className="text-sm text-slate-800 w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(idx, item.quantity + 1)} className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-200 text-sm hover:bg-slate-200 flex items-center justify-center">+</button>
                  </div>
                  <span className="text-sm text-slate-800 font-medium w-24 text-right">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                  <button onClick={() => removeItem(idx)} className="text-slate-500 hover:text-red-400 ml-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-600">Tổng cộng:</span>
            <span className="text-lg font-bold text-slate-800">{total.toLocaleString('vi-VN')}đ</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Đang tạo...' : <span className="flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Tạo đơn & Đẩy sang Website</span>}
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Đơn sẽ được tạo trên website bán hàng.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`absolute bottom-20 left-5 right-5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
