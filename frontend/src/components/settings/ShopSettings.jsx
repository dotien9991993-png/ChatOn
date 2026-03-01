import React, { useState, useEffect } from 'react';
import { Store, X, Save } from 'lucide-react';
import * as api from '../../services/api';

/**
 * Thông tin Shop
 */
export default function ShopSettings({ settings, onSettingsChange, showToast }) {
  const shop = settings?.shop || {};
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...shop });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function updatePolicy(key, value) {
    setForm((p) => ({ ...p, policies: { ...p.policies, [key]: value } }));
  }

  function updateHours(key, value) {
    setForm((p) => ({ ...p, hours: { ...p.hours, [key]: value } }));
  }

  function updateShowroom(index, value) {
    setForm((p) => {
      const showrooms = [...(p.showrooms || [])];
      showrooms[index] = { ...showrooms[index], address: value };
      return { ...p, showrooms };
    });
  }

  function addShowroom() {
    setForm((p) => ({
      ...p,
      showrooms: [...(p.showrooms || []), { id: String(Date.now()), address: '' }],
    }));
  }

  function removeShowroom(index) {
    setForm((p) => ({
      ...p,
      showrooms: (p.showrooms || []).filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateShopSettings(form);
      showToast('Đã lưu thông tin shop!', 'success');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Thông tin Shop</h2>
      <p className="text-sm text-slate-500 mb-6">Thông tin cơ bản và chính sách của shop (AI sẽ dùng để trả lời khách)</p>

      <div className="space-y-5">
        {/* Thông tin cơ bản */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Thông tin cơ bản</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Tên shop</label>
              <input type="text" value={form.name || ''} onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Hotline</label>
              <input type="tel" value={form.hotline || ''} onChange={(e) => updateField('hotline', e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Email</label>
              <input type="email" value={form.email || ''} onChange={(e) => updateField('email', e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Website</label>
              <input type="url" value={form.website || ''} onChange={(e) => updateField('website', e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1.5">Địa chỉ</label>
            <input type="text" value={form.address || ''} onChange={(e) => updateField('address', e.target.value)}
              className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
          </div>

          {/* Giờ làm việc */}
          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1.5">Giờ làm việc</label>
            <div className="flex items-center gap-2">
              <input type="time" value={form.hours?.open || '08:00'} onChange={(e) => updateHours('open', e.target.value)}
                className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
              <span className="text-slate-500 text-sm">đến</span>
              <input type="time" value={form.hours?.close || '21:00'} onChange={(e) => updateHours('close', e.target.value)}
                className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
              <span className="text-xs text-slate-500">hàng ngày</span>
            </div>
          </div>
        </div>

        {/* Chính sách */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Chính sách (AI sẽ dùng để trả lời khách)</h3>

          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1.5">Chính sách giao hàng</label>
            <textarea value={form.policies?.shipping || ''} onChange={(e) => updatePolicy('shipping', e.target.value)} rows={3}
              className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
          </div>
          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1.5">Chính sách bảo hành</label>
            <textarea value={form.policies?.warranty || ''} onChange={(e) => updatePolicy('warranty', e.target.value)} rows={3}
              className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
          </div>
          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1.5">Chính sách đổi trả</label>
            <textarea value={form.policies?.returns || ''} onChange={(e) => updatePolicy('returns', e.target.value)} rows={3}
              className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
          </div>
        </div>

        {/* Showrooms */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Showroom</h3>

          <div className="space-y-2">
            {(form.showrooms || []).map((sr, i) => (
              <div key={sr.id || i} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">Cơ sở {i + 1}:</span>
                <input type="text" value={sr.address} onChange={(e) => updateShowroom(i, e.target.value)}
                  className="flex-1 bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40" />
                <button onClick={() => removeShowroom(i)} className="text-red-500 hover:text-red-600 px-1.5"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={addShowroom} className="text-xs text-blue-600 hover:text-blue-500">
            + Thêm cơ sở
          </button>
        </div>

        {/* Lưu */}
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition">
          {saving ? 'Đang lưu...' : <span className="flex items-center gap-1.5"><Save className="w-4 h-4" /> Lưu thông tin shop</span>}
        </button>
      </div>
    </div>
  );
}
