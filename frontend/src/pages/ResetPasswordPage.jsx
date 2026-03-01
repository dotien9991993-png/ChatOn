import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validatePassword, translateAuthError } from '../utils/passwordValidation';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validation = useMemo(() => validatePassword(newPassword), [newPassword]);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const isFormValid = validation.valid && passwordsMatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isFormValid) return;

    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(translateAuthError(updateError));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 font-['Be_Vietnam_Pro',sans-serif]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            {/* Check icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
              Mật khẩu đã được thay đổi!
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Mật khẩu của bạn đã được cập nhật thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
            </p>

            <Link
              to="/login"
              className="w-full bg-blue-600 text-white font-medium h-[44px] rounded-lg text-sm hover:bg-blue-500 transition flex items-center justify-center"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default state — reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 font-['Be_Vietnam_Pro',sans-serif]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
            Đặt lại mật khẩu
          </h2>
          <p className="text-sm text-slate-500 text-center mb-6">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div>
              <PasswordInput
                id="new-password"
                label="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                required
                autoComplete="new-password"
                className="h-[44px]"
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm password */}
            <div>
              <PasswordInput
                id="confirm-password"
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                autoComplete="new-password"
                className="h-[44px]"
              />
              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <p className={`mt-1.5 text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordsMatch ? 'Khớp' : 'Không khớp'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full bg-blue-600 text-white font-medium h-[44px] rounded-lg text-sm hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link to="/login" className="text-blue-600 hover:text-blue-500 transition">
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
