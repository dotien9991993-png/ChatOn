import React from 'react';
import { CreditCard, CheckCircle, Zap } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Miễn phí',
    price: 0,
    features: ['1 kênh chat', '500 tin nhắn/tháng', '1 nhân viên', 'AI cơ bản'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499000,
    features: ['5 kênh chat', '10.000 tin nhắn/tháng', '5 nhân viên', 'AI nâng cao', 'Chatbot kịch bản', 'Chăm sóc tự động'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    price: 1499000,
    features: ['Không giới hạn kênh', 'Không giới hạn tin nhắn', 'Không giới hạn nhân viên', 'AI nâng cao + tuỳ chỉnh', 'Tất cả tính năng', 'Hỗ trợ ưu tiên'],
  },
];

export default function BillingSettings({ settings }) {
  const currentPlan = settings?.billing?.plan || 'free';
  const usage = settings?.billing?.usage || {};

  const messageUsed = usage.messages || 0;
  const messageLimit = usage.messageLimit || 500;
  const agentUsed = usage.agents || 1;
  const agentLimit = usage.agentLimit || 1;

  const messagePercent = Math.min(100, Math.round((messageUsed / messageLimit) * 100));
  const agentPercent = Math.min(100, Math.round((agentUsed / agentLimit) * 100));

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Gói dịch vụ</h2>
      <p className="text-sm text-slate-500 mb-6">Quản lý gói đăng ký và theo dõi mức sử dụng</p>

      {/* Current Plan */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">Gói hiện tại</span>
          <span className="ml-auto px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 capitalize">
            {PLANS.find(p => p.id === currentPlan)?.name || currentPlan}
          </span>
        </div>

        {/* Usage bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1.5">
              <span>Tin nhắn tháng này</span>
              <span>{messageUsed.toLocaleString('vi-VN')} / {messageLimit.toLocaleString('vi-VN')}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${messagePercent > 90 ? 'bg-red-500' : messagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${messagePercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1.5">
              <span>Nhân viên</span>
              <span>{agentUsed} / {agentLimit}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${agentPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${agentPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`bg-white border rounded-xl p-5 relative ${
                plan.recommended ? 'border-blue-300 shadow-md' : 'border-slate-200 shadow-sm'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-medium rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Phổ biến
                  </span>
                </div>
              )}

              <h3 className="text-sm font-semibold text-slate-800 mb-1">{plan.name}</h3>
              <div className="mb-4">
                {plan.price === 0 ? (
                  <span className="text-2xl font-bold text-slate-800">Miễn phí</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-slate-800">{plan.price.toLocaleString('vi-VN')}đ</span>
                    <span className="text-xs text-slate-500">/tháng</span>
                  </>
                )}
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                className={`w-full py-2 text-sm font-medium rounded-lg transition ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : plan.recommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isCurrent ? 'Gói hiện tại' : 'Nâng cấp'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
