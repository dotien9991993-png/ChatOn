import React, { useState } from 'react';
import ConversationItem from './ConversationItem';
import PageFilter from './PageFilter';
import { useAuth } from '../contexts/AuthContext';
import { Search, X } from 'lucide-react';

const CHANNEL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'facebook', label: 'FB', icon: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  )},
  { key: 'zalo', label: 'Zalo' },
  { key: 'instagram', label: 'IG' },
  { key: 'livechat', label: 'Web' },
];

const INBOX_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'mine', label: 'Của tôi' },
  { key: 'unassigned', label: 'Chưa phân' },
  { key: 'ai', label: 'AI xử lý' },
];

/**
 * Sidebar — status tabs + ô tìm kiếm + inbox filter + channel filter + danh sách conversations
 */
export default function Sidebar({ conversations, activeId, onSelect, onClose, connectedPages = [] }) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [statusTab, setStatusTab] = useState('active'); // 'active' | 'resolved' | 'all'
  const [selectedPageId, setSelectedPageId] = useState('all');

  // Count by status
  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const resolvedCount = conversations.filter((c) => c.status === 'resolved').length;

  // Filter by status tab first
  let filtered = conversations;
  if (statusTab === 'active') {
    filtered = filtered.filter((c) => c.status === 'active');
  } else if (statusTab === 'resolved') {
    filtered = filtered.filter((c) => c.status === 'resolved');
  }

  // Lọc conversations theo inbox filter
  if (inboxFilter === 'mine') {
    filtered = filtered.filter((c) => c.assigned_to === profile?.id);
  } else if (inboxFilter === 'unassigned') {
    filtered = filtered.filter((c) => !c.assigned_to && c.status === 'active');
  } else if (inboxFilter === 'ai') {
    filtered = filtered.filter((c) => c.ai_enabled && c.status === 'active');
  }

  // Lọc theo channel
  if (channelFilter !== 'all') {
    filtered = filtered.filter((c) => c.channel === channelFilter);
  }
  // Lọc theo Page
  if (selectedPageId !== 'all') {
    filtered = filtered.filter((c) => c.page_id === selectedPageId);
  }
  // Lọc theo search
  if (search.trim()) {
    filtered = filtered.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Status tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setStatusTab('active')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition ${
            statusTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Đang mở <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px]">{activeCount}</span>
        </button>
        <button
          onClick={() => setStatusTab('resolved')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition ${
            statusTab === 'resolved'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Đã xong <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 text-[10px]">{resolvedCount}</span>
        </button>
        <button
          onClick={() => setStatusTab('all')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition ${
            statusTab === 'all'
              ? 'text-slate-800 border-b-2 border-slate-600 bg-slate-50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Tất cả <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{conversations.length}</span>
        </button>
      </div>

      {/* Page filter */}
      <PageFilter
        pages={connectedPages}
        selectedPageId={selectedPageId}
        onSelect={setSelectedPageId}
        conversations={conversations}
      />

      {/* Search + filters */}
      <div className="px-4 py-3 border-b border-slate-200">
        {/* Ô tìm kiếm */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            className="w-full bg-slate-50 text-sm text-slate-700 placeholder-slate-400 rounded-lg pl-9 pr-8 py-2.5 outline-none border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Inbox filter */}
        <div className="mt-2.5 flex gap-1">
          {INBOX_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setInboxFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                inboxFilter === f.key
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Channel filter bar */}
        <div className="mt-1.5 flex gap-1">
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setChannelFilter(f.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                channelFilter === f.key
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách conversations */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            {search || channelFilter !== 'all' || selectedPageId !== 'all' ? 'Không tìm thấy kết quả' : 'Chưa có tin nhắn nào'}
          </div>
        )}
        {filtered.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={activeId === conv.id}
            onClick={() => {
              onSelect(conv.id);
              onClose?.();
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 text-[11px] text-slate-400">
        {filtered.length === conversations.length
          ? `${conversations.length} cuộc hội thoại`
          : `${filtered.length} / ${conversations.length} cuộc hội thoại`
        }
      </div>
    </div>
  );
}
