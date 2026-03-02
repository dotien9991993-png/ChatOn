import React from 'react';
import {
  Link2,
  Bot,
  ShoppingCart,
  MessageSquare,
  MessageCircle,
  Users,
  UserCog,
  Store,
  X,
  Cpu,
  Zap,
  Filter,
  CreditCard,
  Bell,
} from 'lucide-react';

const MENU_GROUPS = [
  {
    label: 'Kênh & Giao tiếp',
    items: [
      { id: 'channels', icon: Link2, label: 'Kết nối kênh chat' },
      { id: 'quick_replies', icon: MessageSquare, label: 'Câu trả lời mẫu' },
      { id: 'comments', icon: MessageCircle, label: 'Bình luận tự động' },
    ],
  },
  {
    label: 'AI & Chatbot',
    items: [
      { id: 'ai', icon: Bot, label: 'Cài đặt AI' },
      { id: 'chatbot_rules', icon: Cpu, label: 'Chatbot kịch bản' },
    ],
  },
  {
    label: 'Bán hàng',
    items: [
      { id: 'oms', icon: ShoppingCart, label: 'Đơn hàng & OMS' },
    ],
  },
  {
    label: 'Chiến dịch',
    items: [
      { id: 'drip_campaigns', icon: Zap, label: 'Chăm sóc tự động' },
      { id: 'segments', icon: Filter, label: 'Phân nhóm khách' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { id: 'team', icon: Users, label: 'Quản lý nhân viên' },
      { id: 'notifications', icon: Bell, label: 'Thông báo' },
      { id: 'account', icon: UserCog, label: 'Tài khoản & Bảo mật' },
      { id: 'shop', icon: Store, label: 'Thông tin Shop' },
      { id: 'billing', icon: CreditCard, label: 'Gói dịch vụ' },
    ],
  },
];

export default function SettingsSidebar({ activeSection, onSelect, onClose }) {
  return (
    <div className="h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Cài đặt hệ thống</h2>
        <button onClick={onClose} className="md:hidden text-slate-500 hover:text-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {MENU_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.id); onClose?.(); }}
                  className={`
                    w-full text-left px-4 py-2 flex items-center gap-3 text-sm transition-colors
                    border-l-2
                    ${activeSection === item.id
                      ? 'bg-blue-50 border-l-blue-500 text-slate-900'
                      : 'border-l-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${activeSection === item.id ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
