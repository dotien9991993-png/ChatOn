import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { validatePassword, getPasswordStrength, translateAuthError } from '../utils/passwordValidation';
import { useToast } from '../contexts/ToastContext';
import chatonLogoLight from '../assets/chaton-logo-light.svg';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const toast = useToast();

  const [shopName, setShopName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [touched, setTouched] = useState({
    shopName: false,
    displayName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // --- Validation ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const fieldErrors = useMemo(() => {
    const e = {};
    if (shopName.length < 2) e.shopName = 'Tên cửa hàng phải có ít nhất 2 ký tự';
    if (displayName.length < 2) e.displayName = 'Họ và tên phải có ít nhất 2 ký tự';
    if (!emailRegex.test(email)) e.email = 'Email không hợp lệ';
    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      const failedLabels = pwResult.rules
        .filter((r) => !r.passed)
        .map((r) => r.label);
      e.password = failedLabels.join(', ');
    }
    if (confirmPassword !== password) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    return e;
  }, [shopName, displayName, email, password, confirmPassword]);

  const isFormValid = useMemo(() => {
    return (
      shopName.length >= 2 &&
      displayName.length >= 2 &&
      emailRegex.test(email) &&
      validatePassword(password).valid &&
      confirmPassword === password &&
      agreeTerms
    );
  }, [shopName, displayName, email, password, confirmPassword, agreeTerms]);

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isFormValid) return;

    setLoading(true);
    try {
      await signUp(email, password, { display_name: displayName, shop_name: shopName });
      setSuccess(true);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    setResending(true);
    setResendMsg('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        setResendMsg(translateAuthError(resendError));
      } else {
        setResendMsg('Đã gửi lại email xác thực!');
      }
    } catch (err) {
      setResendMsg(translateAuthError(err));
    } finally {
      setResending(false);
    }
  }

  // --- Email verification success page ---
  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
            {/* Mail icon */}
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Kiểm tra email của bạn!
            </h2>
            <p className="text-slate-600 text-sm mb-1">
              Chúng tôi đã gửi link xác thực đến{' '}
              <span className="font-semibold text-slate-800">{email}</span>
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Click vào link trong email để kích hoạt tài khoản.
            </p>

            <div className="text-sm text-slate-500 mb-3">
              Không nhận được email?
            </div>

            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-2 h-[44px]"
            >
              {resending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {resending ? 'Đang gửi...' : 'Gửi lại email xác thực'}
            </button>

            {resendMsg && (
              <p className={`mt-3 text-sm ${resendMsg.includes('lỗi') || resendMsg.includes('Quá') || resendMsg.includes('đợi') ? 'text-red-500' : 'text-green-600'}`}>
                {resendMsg}
              </p>
            )}

            <Link
              to="/login"
              className="inline-block mt-5 text-sm text-blue-600 hover:text-blue-500 transition font-medium"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Main 2-column register layout ---
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left column - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 flex-col justify-center px-12 xl:px-20">
        <div className="max-w-lg">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <img src={chatonLogoLight} alt="ChatOn" className="h-10" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl xl:text-4xl font-bold text-slate-900 leading-tight mb-4">
            Quản lý bán hàng thông minh với AI
          </h1>
          <p className="text-slate-600 text-lg mb-10">
            Tự động hóa quy trình, tăng doanh thu và tiết kiệm thời gian mỗi ngày.
          </p>

          {/* Feature bullets */}
          <div className="space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center mt-0.5">
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Trả lời tự động 24/7</h3>
                <p className="text-slate-500 text-sm mt-0.5">AI chatbot hỗ trợ khách hàng mọi lúc, không cần chờ.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center mt-0.5">
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Phân tích doanh thu chi tiết</h3>
                <p className="text-slate-500 text-sm mt-0.5">Dashboard trực quan, biết rõ xu hướng kinh doanh.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center mt-0.5">
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Bảo mật cao cấp</h3>
                <p className="text-slate-500 text-sm mt-0.5">Dữ liệu được mã hóa và bảo vệ toàn diện.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column - register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {/* Small logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <img src={chatonLogoLight} alt="ChatOn" className="h-8" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Tạo tài khoản
          </h2>
          <p className="text-slate-500 text-sm mb-7">
            Dùng thử miễn phí 14 ngày, không cần thẻ.
          </p>

          {/* Global error */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên cửa hàng */}
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Tên cửa hàng <span className="text-red-400">*</span>
              </label>
              <input
                id="shopName"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                onBlur={() => handleBlur('shopName')}
                required
                className={`w-full bg-slate-50 text-slate-800 rounded-lg px-4 h-auto py-2.5 text-sm outline-none border transition focus:ring-2 focus:ring-blue-500/30 ${
                  touched.shopName && fieldErrors.shopName
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-300 focus:border-blue-500'
                }`}
                placeholder="Ví dụ: Shop Thời Trang ABC"
              />
              {touched.shopName && fieldErrors.shopName && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.shopName}</p>
              )}
            </div>

            {/* Họ và tên */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Họ và tên <span className="text-red-400">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => handleBlur('displayName')}
                required
                className={`w-full bg-slate-50 text-slate-800 rounded-lg px-4 h-auto py-2.5 text-sm outline-none border transition focus:ring-2 focus:ring-blue-500/30 ${
                  touched.displayName && fieldErrors.displayName
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-300 focus:border-blue-500'
                }`}
                placeholder="Nguyễn Văn A"
              />
              {touched.displayName && fieldErrors.displayName && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.displayName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                required
                className={`w-full bg-slate-50 text-slate-800 rounded-lg px-4 h-auto py-2.5 text-sm outline-none border transition focus:ring-2 focus:ring-blue-500/30 ${
                  touched.email && fieldErrors.email
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-300 focus:border-blue-500'
                }`}
                placeholder="email@example.com"
              />
              {touched.email && fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <PasswordInput
                id="password"
                label={<>Mật khẩu <span className="text-red-400">*</span></>}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                required
                autoComplete="new-password"
                error={touched.password && fieldErrors.password ? fieldErrors.password : undefined}
              />
              <PasswordStrengthMeter password={password} />
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <PasswordInput
                id="confirmPassword"
                label={<>Xác nhận mật khẩu <span className="text-red-400">*</span></>}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                required
                autoComplete="new-password"
                error={touched.confirmPassword && fieldErrors.confirmPassword ? fieldErrors.confirmPassword : undefined}
              />
              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  {confirmPassword === password ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-green-600 font-medium">Khớp</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-xs text-red-500 font-medium">Không khớp</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="agreeTerms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
              />
              <label htmlFor="agreeTerms" className="text-sm text-slate-600 leading-snug">
                Tôi đồng ý với{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-500 underline transition">
                  Điều khoản dịch vụ
                </Link>{' '}
                và{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500 underline transition">
                  Chính sách bảo mật
                </Link>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-500 transition flex items-center justify-center gap-2 h-[44px] ${
                !isFormValid || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký miễn phí'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">hoặc</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => toast.info('Đăng ký bằng Google sẽ sớm được hỗ trợ!')}
            className="w-full flex items-center justify-center gap-2.5 border border-slate-300 rounded-lg h-[44px] text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
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
            Tiếp tục với Google
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500 mt-7">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 transition font-medium">
              Đăng nhập &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
