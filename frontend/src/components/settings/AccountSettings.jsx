import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PasswordInput from '../PasswordInput';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { validatePassword, translateAuthError } from '../../utils/passwordValidation';

/**
 * Tài khoản & Bảo mật
 */
export default function AccountSettings({ settings, onSettingsChange, showToast }) {
  const { profile, updatePassword } = useAuth();
  const account = settings?.account || {};
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    setForm({ ...account });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateAccountSettings(form);
      showToast('Đã lưu!', 'success');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');

    // Validate new password
    const validation = validatePassword(newPw);
    if (!validation.valid) {
      setPwError('Mật khẩu mới chưa đủ mạnh. Cần ít nhất 8 ký tự, có chữ hoa, chữ thường và số.');
      return;
    }

    if (newPw !== confirmPw) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (currentPw === newPw) {
      setPwError('Mật khẩu mới phải khác mật khẩu cũ');
      return;
    }

    setChangingPw(true);
    try {
      await updatePassword(newPw);
      showToast('Đã đổi mật khẩu thành công!', 'success');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwError(translateAuthError(err));
    } finally {
      setChangingPw(false);
    }
  }

  function copyApiKey() {
    const key = form.apiKeys?.[0] || '';
    navigator.clipboard.writeText(key);
    showToast('Đã copy API key!', 'info');
  }

  const pwValid = validatePassword(newPw).valid;
  const pwMatch = newPw && confirmPw && newPw === confirmPw;
  const canSubmitPw = currentPw && pwValid && pwMatch && !changingPw;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Tài khoản & Bảo mật</h2>
      <p className="text-sm text-slate-500 mb-6">Quản lý tài khoản và cài đặt bảo mật</p>

      <div className="space-y-5">
        {/* Thông tin tài khoản */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-semibold text-slate-800">Thông tin tài khoản</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Tên hiển thị</label>
              <input
                type="text"
                value={form.displayName || profile?.display_name || ''}
                onChange={(e) => updateField('displayName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email || ''}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 text-sm text-slate-500 rounded-lg px-3 py-2.5 outline-none cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Email không thể thay đổi</p>
            </div>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm font-semibold text-slate-800">Đổi mật khẩu</span>
          </div>

          {pwError && (
            <div className="p-3 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {pwError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <PasswordInput
              label="Mật khẩu hiện tại"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div>
              <PasswordInput
                label="Mật khẩu mới"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                required
              />
              <PasswordStrengthMeter password={newPw} />
            </div>

            <div>
              <PasswordInput
                label="Xác nhận mật khẩu mới"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                required
                error={confirmPw && !pwMatch ? 'Mật khẩu xác nhận không khớp' : ''}
              />
              {pwMatch && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Khớp
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmitPw}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {changingPw && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {changingPw ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </div>

        {/* Quản lý nhân viên */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Quản lý nhân viên</h3>
          <p className="text-xs text-slate-500">Thêm nhân viên vào hệ thống để cùng trả lời chat</p>

          <div className="bg-slate-50 rounded-lg overflow-hidden">
            {(form.staff || []).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 font-medium">
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">{s.name}</p>
                    <p className="text-[11px] text-slate-500">{s.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.role === 'owner' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  {s.role === 'owner' ? 'Chủ shop' : 'Agent'}
                </span>
              </div>
            ))}
            <div className="px-3 py-2.5">
              <button className="text-xs text-blue-600 hover:text-blue-500">+ Thêm nhân viên</button>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">API Keys</h3>
          <p className="text-xs text-slate-500">Key cho bên thứ 3 truy cập hệ thống</p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.apiKeys?.[0] || ''}
              readOnly
              className="flex-1 bg-slate-50 border border-slate-200 text-sm text-slate-500 rounded-lg px-3 py-2.5 font-mono opacity-70"
            />
            <button onClick={copyApiKey} className="px-3 py-2.5 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 text-xs transition">Copy</button>
          </div>
        </div>

        {/* Bảo mật */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Bảo mật</h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Xác minh webhook signature (Facebook)</span>
              <div className="relative">
                <input type="checkbox" checked={form.verifySignature || false} onChange={(e) => updateField('verifySignature', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Rate limiting (60 req/phút)</span>
              <div className="relative">
                <input type="checkbox" checked={form.rateLimiting || false} onChange={(e) => updateField('rateLimiting', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </div>
            </label>
          </div>
        </div>

        {/* Nút lưu chung */}
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}
