import React from 'react';
import { getPasswordStrength } from '../utils/passwordValidation';

/**
 * Thanh đánh giá độ mạnh mật khẩu
 */
export default function PasswordStrengthMeter({ password }) {
  const { label, color, percent } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {label && (
        <p className={`text-xs font-medium ${
          percent <= 33 ? 'text-red-500' :
          percent <= 66 ? 'text-amber-500' :
          'text-green-600'
        }`}>
          {label}
        </p>
      )}
    </div>
  );
}
