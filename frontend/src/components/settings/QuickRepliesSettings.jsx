import React, { useState, useEffect } from 'react';
import { MessageSquare, Edit, Trash2 } from 'lucide-react';
import * as api from '../../services/api';

/**
 * Quản lý câu trả lời mẫu (quick replies)
 */
export default function QuickRepliesSettings({ settings, showToast }) {
  const [replies, setReplies] = useState(settings?.quick_replies || []);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ shortcut: '', text: '' });
  const [saving, setSaving] = useState(false);

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
    setForm({ shortcut: '', text: '' });
    setEditIdx(-1);
  }

  function startEdit(idx) {
    setForm({ ...replies[idx] });
    setEditIdx(idx);
  }

  function handleSave() {
    if (!form.shortcut.startsWith('/')) form.shortcut = '/' + form.shortcut;
    if (!form.shortcut.trim() || !form.text.trim()) return;

    let newReplies;
    if (editIdx === -1) {
      newReplies = [...replies, { shortcut: form.shortcut.trim(), text: form.text.trim() }];
    } else {
      newReplies = replies.map((r, i) => i === editIdx ? { shortcut: form.shortcut.trim(), text: form.text.trim() } : r);
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
            <p className="text-sm text-slate-700 flex-1">{reply.text}</p>
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
    </div>
  );
}
