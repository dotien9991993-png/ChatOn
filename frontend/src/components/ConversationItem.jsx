import React from 'react';
import { timeAgo } from '../utils/formatTime';

const CHANNEL_BADGE = {
  facebook: {
    bg: 'bg-blue-600',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  zalo: {
    bg: 'bg-blue-500',
    icon: <span className="text-[8px] font-bold text-white leading-none">Z</span>,
  },
  instagram: {
    bg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  tiktok: {
    bg: 'bg-black',
    icon: <span className="text-[8px] font-bold text-white leading-none">TT</span>,
  },
};

/**
 * 1 item trong sidebar danh sách chat
 * Hiện: avatar, tên, tin nhắn cuối, thời gian, badge unread, channel icon
 */
export default function ConversationItem({ conversation, isActive, onClick }) {
  const { name, avatar, lastMessage, lastMessageAt, unread, channel } = conversation;
  const badge = CHANNEL_BADGE[channel];

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-150
        border-l-2
        ${isActive
          ? 'bg-blue-50 border-l-blue-500'
          : 'border-l-transparent hover:bg-slate-50'
        }
      `}
    >
      {/* Avatar + icon kênh */}
      <div className="relative flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {(name || 'K')[0].toUpperCase()}
          </div>
        )}

        {/* Channel badge (dynamic) */}
        {badge && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${badge.bg} rounded-full flex items-center justify-center ring-2 ring-white`}>
            {badge.icon}
          </div>
        )}

        {/* Badge unread */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 badge-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      {/* Thông tin */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
            {name}
          </span>
          <span className="text-[11px] text-slate-500 flex-shrink-0">
            {timeAgo(lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className={`text-xs truncate flex-1 ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
            {lastMessage || 'Bắt đầu trò chuyện...'}
          </p>
          {conversation.assigned_name && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0 truncate max-w-[60px]">
              {conversation.assigned_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
