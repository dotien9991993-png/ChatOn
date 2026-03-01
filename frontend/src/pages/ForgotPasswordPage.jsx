import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { translateAuthError } from '../utils/passwordValidation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
          setError(translateAuthError(resetError));
        } else {
          setSent(true);
          setCooldown(60);
        }
      } catch (err) {
        setError(translateAuthError(err));
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(translateAuthError(resetError));
      } else {
        setCooldown(60);
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }, [email, cooldown]);

  // Success state — email sent
  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 font-['Be_Vietnam_Pro',sans-serif]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            {/* Mail icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
              Kiểm tra email!
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Chúng tôi đã gửi link đặt lại mật khẩu đến{' '}
              <span className="font-medium text-slate-700">{email}</span>
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="w-full bg-slate-100 text-slate-700 font-medium h-[44px] rounded-lg text-sm hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              )}
              {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại'}
            </button>

            <p className="text-center text-sm text-slate-500 mt-5">
              <Link to="/login" className="text-blue-600 hover:text-blue-500 transition">
                Quay lại đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default state — enter email
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
            Quên mật khẩu
          </h2>
          <p className="text-sm text-slate-500 text-center mb-6">
            Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                autoComplete="email"
                className="w-full bg-slate-50 text-slate-800 rounded-lg px-4 h-[44px] text-sm outline-none border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium h-[44px] rounded-lg text-sm hover:bg-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
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
