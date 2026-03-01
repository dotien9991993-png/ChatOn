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
    if (shopName.length < 2) e.shopName = 'T\u00ean c\u1eeda h\u00e0ng ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 2 k\u00fd t\u1ef1';
    if (displayName.length < 2) e.displayName = 'H\u1ecd v\u00e0 t\u00ean ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 2 k\u00fd t\u1ef1';
    if (!emailRegex.test(email)) e.email = 'Email kh\u00f4ng h\u1ee3p l\u1ec7';
    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      const failedLabels = pwResult.rules
        .filter((r) => !r.passed)
        .map((r) => r.label);
      e.password = failedLabels.join(', ');
    }
    if (confirmPassword !== password) e.confirmPassword = 'M\u1eadt kh\u1ea9u x\u00e1c nh\u1eadn kh\u00f4ng kh\u1edbp';
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
        setResendMsg('\u0110\u00e3 g\u1eedi l\u1ea1i email x\u00e1c th\u1ef1c!');
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
              Ki\u1ec3m tra email c\u1ee7a b\u1ea1n!
            </h2>
            <p className="text-slate-600 text-sm mb-1">
              Ch\u00fang t\u00f4i \u0111\u00e3 g\u1eedi link x\u00e1c th\u1ef1c \u0111\u1ebfn{' '}
              <span className="font-semibold text-slate-800">{email}</span>
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Click v\u00e0o link trong email \u0111\u1ec3 k\u00edch ho\u1ea1t t\u00e0i kho\u1ea3n.
            </p>

            <div className="text-sm text-slate-500 mb-3">
              Kh\u00f4ng nh\u1eadn \u0111\u01b0\u1ee3c email?
            </div>

            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-2 h-[44px]"
            >
              {resending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {resending ? '\u0110ang g\u1eedi...' : 'G\u1eedi l\u1ea1i email x\u00e1c th\u1ef1c'}
            </button>

            {resendMsg && (
              <p className={`mt-3 text-sm ${resendMsg.includes('l\u1ed7i') || resendMsg.includes('Qu\u00e1') || resendMsg.includes('\u0111\u1ee3i') ? 'text-red-500' : 'text-green-600'}`}>
                {resendMsg}
              </p>
            )}

            <Link
              to="/login"
              className="inline-block mt-5 text-sm text-blue-600 hover:text-blue-500 transition font-medium"
            >
              Quay l\u1ea1i \u0111\u0103ng nh\u1eadp
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
            Qu\u1ea3n l\u00fd b\u00e1n h\u00e0ng th\u00f4ng minh v\u1edbi AI
          </h1>
          <p className="text-slate-600 text-lg mb-10">
            T\u1ef1 \u0111\u1ed9ng h\u00f3a quy tr\u00ecnh, t\u0103ng doanh thu v\u00e0 ti\u1ebft ki\u1ec7m th\u1eddi gian m\u1ed7i ng\u00e0y.
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
                <h3 className="font-semibold text-slate-900 text-sm">Tr\u1ea3 l\u1eddi t\u1ef1 \u0111\u1ed9ng 24/7</h3>
                <p className="text-slate-500 text-sm mt-0.5">AI chatbot h\u1ed7 tr\u1ee3 kh\u00e1ch h\u00e0ng m\u1ecdi l\u00fac, kh\u00f4ng c\u1ea7n ch\u1edd.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center mt-0.5">
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Ph\u00e2n t\u00edch doanh thu chi ti\u1ebft</h3>
                <p className="text-slate-500 text-sm mt-0.5">Dashboard tr\u1ef1c quan, bi\u1ebft r\u00f5 xu h\u01b0\u1edbng kinh doanh.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center mt-0.5">
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">B\u1ea3o m\u1eadt cao c\u1ea5p</h3>
                <p className="text-slate-500 text-sm mt-0.5">D\u1eef li\u1ec7u \u0111\u01b0\u1ee3c m\u00e3 h\u00f3a v\u00e0 b\u1ea3o v\u1ec7 to\u00e0n di\u1ec7n.</p>
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
            T\u1ea1o t\u00e0i kho\u1ea3n
          </h2>
          <p className="text-slate-500 text-sm mb-7">
            D\u00f9ng th\u1eed mi\u1ec5n ph\u00ed 14 ng\u00e0y, kh\u00f4ng c\u1ea7n th\u1ebb.
          </p>

          {/* Global error */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* T\u00ean c\u1eeda h\u00e0ng */}
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-slate-700 mb-1.5">
                T\u00ean c\u1eeda h\u00e0ng <span className="text-red-400">*</span>
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
                placeholder="V\u00ed d\u1ee5: Shop Th\u1eddi Trang ABC"
              />
              {touched.shopName && fieldErrors.shopName && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.shopName}</p>
              )}
            </div>

            {/* H\u1ecd v\u00e0 t\u00ean */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
                H\u1ecd v\u00e0 t\u00ean <span className="text-red-400">*</span>
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
                placeholder="Nguy\u1ec5n V\u0103n A"
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

            {/* M\u1eadt kh\u1ea9u */}
            <div>
              <PasswordInput
                id="password"
                label={<>M\u1eadt kh\u1ea9u <span className="text-red-400">*</span></>}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                required
                autoComplete="new-password"
                error={touched.password && fieldErrors.password ? fieldErrors.password : undefined}
              />
              <PasswordStrengthMeter password={password} />
            </div>

            {/* X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u */}
            <div>
              <PasswordInput
                id="confirmPassword"
                label={<>X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u <span className="text-red-400">*</span></>}
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
                      <span className="text-xs text-green-600 font-medium">Kh\u1edbp</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-xs text-red-500 font-medium">Kh\u00f4ng kh\u1edbp</span>
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
                T\u00f4i \u0111\u1ed3ng \u00fd v\u1edbi{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-500 underline transition">
                  \u0110i\u1ec1u kho\u1ea3n d\u1ecbch v\u1ee5
                </Link>{' '}
                v\u00e0{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500 underline transition">
                  Ch\u00ednh s\u00e1ch b\u1ea3o m\u1eadt
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
              {loading ? '\u0110ang t\u1ea1o t\u00e0i kho\u1ea3n...' : '\u0110\u0103ng k\u00fd mi\u1ec5n ph\u00ed'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">ho\u1eb7c</span>
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
            Ti\u1ebfp t\u1ee5c v\u1edbi Google
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500 mt-7">
            \u0110\u00e3 c\u00f3 t\u00e0i kho\u1ea3n?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 transition font-medium">
              \u0110\u0103ng nh\u1eadp \u2192
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
