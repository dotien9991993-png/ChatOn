import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { translateAuthError } from '../utils/passwordValidation';
import { useToast } from '../contexts/ToastContext';
import chatonLogoLight from '../assets/chaton-logo-light.svg';

export default function LoginPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle ?confirmed=true query param
  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setSuccessMsg('Email đã được xác thực! Đăng nhập để tiếp tục.');
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    toast.info('Đăng nhập Google sẽ có sớm. Vui lòng dùng email/mật khẩu.');
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ───── Left Column: Branding (hidden on mobile) ───── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 flex-col justify-center px-16 xl:px-24">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <img src={chatonLogoLight} alt="ChatOn" className="h-10" />
        </div>

        {/* Headline */}
        <h1 className="text-3xl xl:text-4xl font-bold text-slate-900 leading-tight mb-6">
          ChatOn — Nền tảng AI<br />
          Bán hàng Đa kênh #1 Việt Nam
        </h1>

        <p className="text-slate-600 text-base mb-10 max-w-md">
          Tự động hóa quy trình bán hàng, chăm sóc khách hàng và chốt đơn trên mọi kênh với sức mạnh AI.
        </p>

        {/* Feature bullets */}
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">AI tự tư vấn 24/7</p>
              <p className="text-slate-500 text-sm mt-0.5">Chatbot AI trả lời khách hàng mọi lúc, không cần nhân viên trực.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">Quản lý đa kênh Facebook, Zalo, TikTok</p>
              <p className="text-slate-500 text-sm mt-0.5">Tập trung mọi tin nhắn về một nơi, không bỏ sót khách hàng.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">Chốt đơn tự động thông minh</p>
              <p className="text-slate-500 text-sm mt-0.5">AI nhận diện ý định mua và hỗ trợ chốt đơn nhanh chóng.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Right Column: Login Form ───── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Small logo (visible on all screens) */}
          <div className="flex items-center gap-2.5 mb-10">
            <img src={chatonLogoLight} alt="ChatOn" className="h-8" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Đăng nhập</h2>
          <p className="text-slate-500 text-sm mb-8">Chào mừng trở lại!</p>

          {/* Success message */}
          {successMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-green-50 border-l-4 border-green-500 p-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 text-sm">{successMsg}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border-l-4 border-red-500 p-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full h-[44px] bg-slate-50 text-slate-800 rounded-lg px-4 text-sm outline-none border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
              />
            </div>

            {/* Password */}
            <PasswordInput
              id="login-password"
              label="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              className="h-[44px]"
            />

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                />
                <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-400">hoặc</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-[44px] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng nhập với Google
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-slate-500 mt-8">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Đăng ký miễn phí &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
