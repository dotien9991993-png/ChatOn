import React, { useState, useEffect } from 'react';
import { getCommentSettings, updateCommentSettings } from '../../services/api';

export default function CommentSettings({ showToast }) {
  const [settings, setSettings] = useState({
    auto_hide_phone: true,
    auto_hide_keywords: [],
    auto_reply_enabled: false,
    auto_reply_message: '',
    auto_inbox_enabled: false,
    auto_inbox_message: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getCommentSettings();
        setSettings(data);
      } catch (err) {
        console.error('Error loading comment settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCommentSettings(settings);
      showToast?.('Đã lưu cài đặt bình luận');
    } catch (err) {
      showToast?.('Lỗi khi lưu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    setSettings({
      ...settings,
      auto_hide_keywords: [...(settings.auto_hide_keywords || []), newKeyword.trim()],
    });
    setNewKeyword('');
  };

  const removeKeyword = (idx) => {
    setSettings({
      ...settings,
      auto_hide_keywords: settings.auto_hide_keywords.filter((_, i) => i !== idx),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Cài đặt bình luận</h2>
      <p className="text-sm text-slate-500 mb-6">Tự động xử lý bình luận trên Facebook/Instagram</p>

      <div className="space-y-6">
        {/* Auto-hide phone numbers */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-800">Tự động ẩn SĐT</h3>
              <p className="text-xs text-slate-500">Ẩn bình luận chứa số điện thoại để bảo vệ thông tin khách</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, auto_hide_phone: !settings.auto_hide_phone })}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                settings.auto_hide_phone ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                settings.auto_hide_phone ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Auto-hide keywords */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-1">Tự động ẩn từ khoá</h3>
          <p className="text-xs text-slate-500 mb-3">Ẩn bình luận chứa các từ khoá nhất định</p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {(settings.auto_hide_keywords || []).map((kw, idx) => (
              <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                {kw}
                <button onClick={() => removeKeyword(idx)} className="text-slate-400 hover:text-red-500">x</button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Nhập từ khoá..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400"
              onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }}
            />
            <button
              onClick={addKeyword}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
            >
              Thêm
            </button>
          </div>
        </div>

        {/* Auto-reply */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-800">Tự động trả lời bình luận</h3>
              <p className="text-xs text-slate-500">Gửi trả lời công khai cho mỗi bình luận mới</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, auto_reply_enabled: !settings.auto_reply_enabled })}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                settings.auto_reply_enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                settings.auto_reply_enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {settings.auto_reply_enabled && (
            <textarea
              value={settings.auto_reply_message || ''}
              onChange={(e) => setSettings({ ...settings, auto_reply_message: e.target.value })}
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 resize-none mt-2"
              placeholder="Nhập nội dung trả lời tự động..."
            />
          )}
        </div>

        {/* Auto-inbox (private reply) */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-800">Tự động inbox khách</h3>
              <p className="text-xs text-slate-500">Gửi tin nhắn riêng cho người bình luận</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, auto_inbox_enabled: !settings.auto_inbox_enabled })}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                settings.auto_inbox_enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                settings.auto_inbox_enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {settings.auto_inbox_enabled && (
            <textarea
              value={settings.auto_inbox_message || ''}
              onChange={(e) => setSettings({ ...settings, auto_inbox_message: e.target.value })}
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 resize-none mt-2"
              placeholder="Nhập nội dung inbox tự động..."
            />
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 transition"
        >
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
}
