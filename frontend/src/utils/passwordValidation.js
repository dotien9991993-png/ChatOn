/**
 * Password validation utility
 * Kiểm tra và đánh giá độ mạnh mật khẩu
 */

const RULES = [
  { id: 'length', label: 'Tối thiểu 8 ký tự', test: (pw) => pw.length >= 8 },
  { id: 'upper', label: 'Có chữ hoa (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'Có chữ thường (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'Có số (0-9)', test: (pw) => /[0-9]/.test(pw) },
];

/**
 * Validate password against all rules
 * @returns {{ valid: boolean, passed: string[], failed: string[], rules: Array }}
 */
export function validatePassword(password) {
  const results = RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const passed = results.filter((r) => r.passed).map((r) => r.id);
  const failed = results.filter((r) => !r.passed).map((r) => r.id);

  return {
    valid: failed.length === 0,
    passed,
    failed,
    rules: results,
  };
}

/**
 * Get password strength level
 * @returns {{ level: 'weak'|'medium'|'strong', label: string, color: string, percent: number }}
 */
export function getPasswordStrength(password) {
  if (!password) {
    return { level: 'weak', label: '', color: 'bg-slate-200', percent: 0 };
  }

  const { passed } = validatePassword(password);
  const score = passed.length;

  if (password.length < 8 || score <= 1) {
    return { level: 'weak', label: 'Yếu', color: 'bg-red-500', percent: 33 };
  }
  if (score === 2) {
    return { level: 'medium', label: 'Trung bình', color: 'bg-amber-500', percent: 66 };
  }
  return { level: 'strong', label: 'Mạnh', color: 'bg-green-500', percent: 100 };
}

/**
 * Translate Supabase auth error to Vietnamese
 */
export function translateAuthError(error) {
  const msg = error?.message || error || '';
  const map = {
    'Invalid login credentials': 'Email hoặc mật khẩu không đúng',
    'Email not confirmed': 'Vui lòng xác thực email trước khi đăng nhập',
    'User already registered': 'Email này đã được đăng ký',
    'Password should be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự',
    'Unable to validate email address: invalid format': 'Định dạng email không hợp lệ',
    'Signup requires a valid password': 'Vui lòng nhập mật khẩu hợp lệ',
    'For security purposes, you can only request this once every 60 seconds': 'Vui lòng đợi 60 giây trước khi gửi lại',
    'Email rate limit exceeded': 'Quá nhiều yêu cầu. Vui lòng đợi một lát',
    'over_email_send_rate_limit': 'Quá nhiều yêu cầu gửi email. Vui lòng đợi một lát',
    'Auth session missing!': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
    'New password should be different from the old password.': 'Mật khẩu mới phải khác mật khẩu cũ',
  };

  for (const [en, vi] of Object.entries(map)) {
    if (msg.includes(en)) return vi;
  }

  // Generic fallback
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Quá nhiều lần thử. Vui lòng đợi 15 phút';
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại';
}
