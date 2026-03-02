import React, { useState, useEffect } from 'react';
import { Bell, Volume2, Mail, Save } from 'lucide-react';
import * as api from '../../services/api';

export default function NotificationSettings({ settings, onSettingsChange, showToast }) {
  const notif = settings?.notifications || {};
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      browser_push: notif.browser_push ?? true,
      sound_enabled: notif.sound_enabled ?? true,
      sound_volume: notif.sound_volume ?? 80,
      email_new_conversation: notif.email_new_conversation ?? false,
      email_daily_summary: notif.email_daily_summary ?? false,
      notify_assigned_only: notif.notify_assigned_only ?? false,
    });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateNotificationSettings(form);
      showToast('Đã lưu cài đặt thông báo!', 'success');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function requestBrowserPermission() {
    if (!('Notification' in window)) {
      showToast('Trình duyệt không hỗ trợ thông báo', 'error');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Đã bật thông báo trình duyệt!', 'success');
      updateField('browser_push', true);
    } else {
      showToast('Bạn đã từ chối quyền thông báo', 'error');
    }
  }

  const browserPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Cài đặt thông báo</h2>
      <p className="text-sm text-slate-500 mb-6">Tuỳ chỉnh cách nhận thông báo khi có tin nhắn mới</p>

      <div className="space-y-5">
        {/* Browser Push */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Thông báo trình duyệt</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Thông báo đẩy trên trình duyệt</p>
              <p className="text-xs text-slate-500 mt-0.5">Nhận thông báo ngay khi có tin nhắn mới</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.browser_push || false}
                onChange={(e) => updateField('browser_push', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          {browserPermission !== 'granted' && (
            <button
              onClick={requestBrowserPermission}
              className="text-xs px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              Cấp quyền thông báo trình duyệt
            </button>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Chỉ thông báo hội thoại được phân công</p>
              <p className="text-xs text-slate-500 mt-0.5">Không nhận thông báo từ hội thoại chưa phân công</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.notify_assigned_only || false}
                onChange={(e) => updateField('notify_assigned_only', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
        </div>

        {/* Sound */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Âm thanh</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Âm thanh thông báo</p>
              <p className="text-xs text-slate-500 mt-0.5">Phát âm khi có tin nhắn mới</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.sound_enabled || false}
                onChange={(e) => updateField('sound_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          {form.sound_enabled && (
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Âm lượng</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.sound_volume || 80}
                  onChange={(e) => updateField('sound_volume', parseInt(e.target.value, 10))}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-slate-500 w-10 text-right">{form.sound_volume || 80}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Thông báo email</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Email khi có hội thoại mới</p>
              <p className="text-xs text-slate-500 mt-0.5">Gửi email khi khách hàng mới nhắn tin</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.email_new_conversation || false}
                onChange={(e) => updateField('email_new_conversation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Báo cáo tổng hợp hàng ngày</p>
              <p className="text-xs text-slate-500 mt-0.5">Nhận email tóm tắt hoạt động mỗi sáng</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.email_daily_summary || false}
                onChange={(e) => updateField('email_daily_summary', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition"
        >
          {saving ? 'Đang lưu...' : <span className="flex items-center gap-1.5"><Save className="w-4 h-4" /> Lưu cài đặt</span>}
        </button>
      </div>
    </div>
  );
}
