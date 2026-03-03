import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Users,
  ShoppingCart,
  Package,
  Image,
  Megaphone,
  Video,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import chatonLogoWhite from '../assets/chaton-logo-white.svg';
import chatonIcon from '../assets/chaton-icon.svg';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
  { to: '/chat', label: 'Hộp thư', icon: MessageSquare, color: 'blue', badgeKey: 'unreadMessages' },
  { to: '/comments', label: 'Bình luận', icon: MessageCircle, color: 'orange' },
  { to: '/customers', label: 'Khách hàng', icon: Users, color: 'emerald' },
  { to: '/orders', label: 'Đơn hàng', icon: ShoppingCart, color: 'amber' },
  { to: '/products', label: 'Sản phẩm', icon: Package, color: 'violet' },
  { to: '/media', label: 'Thư viện ảnh', icon: Image, color: 'cyan' },
  { to: '/campaigns', label: 'Chiến dịch', icon: Megaphone, color: 'pink' },
  { to: '/livestream', label: 'Livestream', icon: Video, color: 'red' },
];

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function AppSidebar({ collapsed, onToggleCollapse }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (profile?.display_name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={`
        h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[64px]' : 'w-[240px]'}
      `}
      style={{
        background: 'linear-gradient(180deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)',
      }}
    >
      {/* Logo + Brand */}
      <div className={`flex items-center gap-3 px-4 h-16 flex-shrink-0 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        {collapsed ? (
          <img src={chatonIcon} alt="ChatOn" className="w-8 h-8" />
        ) : (
          <img src={chatonLogoWhite} alt="ChatOn" className="h-8" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg transition-all duration-200 relative
                ${collapsed ? 'justify-center px-2 py-2.5 mx-auto' : 'px-3 py-2.5'}
                ${isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
                  )}
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                  {!collapsed && (
                    <span className="text-[13px] font-medium truncate">{item.label}</span>
                  )}
                  {/* Badge placeholder */}
                  {item.badgeKey && !collapsed && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 opacity-0 group-data-[badge]:opacity-100">
                      0
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section: Settings + User */}
      <div className="border-t border-white/10 px-2 py-2 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg transition-all duration-200
                ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}

        {/* User section */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            title={collapsed ? profile?.display_name : undefined}
            className={`
              w-full flex items-center gap-3 rounded-lg transition-all duration-200
              text-blue-100/70 hover:bg-white/10 hover:text-white
              ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
            `}
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium text-white truncate">
                  {profile?.display_name || 'User'}
                </p>
                <p className="text-[10px] text-blue-200/50 truncate">{profile?.role || 'owner'}</p>
              </div>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className={`absolute z-50 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-48
                  ${collapsed ? 'left-full ml-2' : 'left-2'}
                `}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm text-slate-800 font-medium truncate">{profile?.display_name}</p>
                  <p className="text-xs text-slate-500 truncate">{profile?.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-slate-50 transition flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={`
            w-full flex items-center gap-3 rounded-lg py-2 transition-all duration-200
            text-blue-100/50 hover:bg-white/10 hover:text-white
            ${collapsed ? 'justify-center px-2' : 'px-3'}
          `}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px]">Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
