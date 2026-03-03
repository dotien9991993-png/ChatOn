import React, { useState, useEffect } from 'react';
import { MessageSquare, Edit, Trash2, Image, X } from 'lucide-react';
import * as api from '../../services/api';
import MediaPicker from '../MediaPicker';

/**
 * Quản lý câu trả lời mẫu (quick replies)
 */
export default function QuickRepliesSettings({ settings, showToast }) {
  const [replies, setReplies] = useState(settings?.quick_replies || []);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ shortcut: '', text: '', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setReplies(settings?.quick_replies || []);
  }, [settings?.quick_replies]);

  async function save(newReplies) {
    setSaving(true);
    try {
      await api.updateQuickReplies(newReplies);
      setReplies(newReplies);
      showToast?.('Đã lưu');
    } catch (err) {
      showToast?.('Lỗi lưu: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  }

  function startAdd() {
    setForm({ shortcut: '', text: '', imageUrl: '' });
    setEditIdx(-1);
  }

  function startEdit(idx) {
    setForm({ ...replies[idx], imageUrl: replies[idx].imageUrl || '' });
    setEditIdx(idx);
  }

  function handleSave() {
    if (!form.shortcut.startsWith('/')) form.shortcut = '/' + form.shortcut;
    if (!form.shortcut.trim() || !form.text.trim()) return;

    const entry = {
      shortcut: form.shortcut.trim(),
      text: form.text.trim(),
      ...(form.imageUrl ? { imageUrl: form.imageUrl } : {}),
    };

    let newReplies;
    if (editIdx === -1) {
      newReplies = [...replies, entry];
    } else {
      newReplies = replies.map((r, i) => i === editIdx ? entry : r);
    }
    save(newReplies);
    setEditIdx(null);
  }

  function handleDelete(idx) {
    save(replies.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" /> Câu trả lời mẫu</h2>
          <p className="text-sm text-slate-500 mt-1">Gõ "/" trong ô chat để dùng mẫu nhanh</p>
        </div>
        <button onClick={startAdd} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition font-medium">
          + Thêm mẫu
        </button>
      </div>

      {/* Edit/Add form */}
      {editIdx !== null && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Shortcut</label>
              <input
                value={form.shortcut}
                onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                placeholder="/chao"
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-slate-600 mb-1">Nội dung</label>
              <textarea
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Xin chào! Em có thể giúp gì ạ?"
                rows={2}
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
              />
            </div>
          </div>
          {/* Image attachment */}
          <div className="mb-3">
            <label className="block text-xs text-slate-600 mb-1">Hình ảnh đính kèm</label>
            {form.imageUrl ? (
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 pr-3">
                <img src={form.imageUrl} alt="" className="w-12 h-12 rounded object-cover" />
                <span className="text-xs text-slate-500 truncate max-w-[150px]">Đã chọn ảnh</span>
                <button onClick={() => setForm({ ...form, imageUrl: '' })} className="p-0.5 text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
              >
                <Image className="w-4 h-4" />
                Chọn ảnh
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Dùng {'{shop_name}'} để tự thay bằng tên cửa hàng</p>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 transition">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={() => setEditIdx(null)} className="px-4 py-1.5 border border-slate-300 text-sm text-slate-600 rounded-lg hover:bg-slate-100 transition">Hủy</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {replies.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">Chưa có mẫu nào. Bấm "Thêm mẫu" để tạo.</p>
        )}
        {replies.map((reply, idx) => (
          <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-start gap-3">
            <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono flex-shrink-0">
              {reply.shortcut}
            </code>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">{reply.text}</p>
              {reply.imageUrl && (
                <img src={reply.imageUrl} alt="" className="mt-1.5 w-16 h-16 rounded-lg object-cover border border-slate-200" />
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => startEdit(idx)} className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(idx)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-500 hover:bg-slate-100 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MediaPicker for quick replies */}
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => setForm({ ...form, imageUrl: url })}
      />
    </div>
  );
}
