import React from 'react';

/**
 * PageFilter — thanh lọc theo Facebook Page trong Inbox
 * Hiện dạng horizontal pills với avatar
 */
export default function PageFilter({ pages, selectedPageId, onSelect, conversations }) {
  if (!pages || pages.length <= 1) return null;

  // Count unread per page
  const unreadByPage = {};
  let totalUnread = 0;
  for (const conv of conversations) {
    const u = conv.unread || 0;
    totalUnread += u;
    const pid = conv.page_id;
    if (pid) {
      unreadByPage[pid] = (unreadByPage[pid] || 0) + u;
    }
  }

  return (
    <div className="px-3 py-2 border-b border-slate-200 flex gap-1.5 overflow-x-auto scrollbar-hide">
      {/* Tất cả */}
      <button
        onClick={() => onSelect('all')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition whitespace-nowrap flex-shrink-0 ${
          selectedPageId === 'all'
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'
        }`}
      >
        Tất cả
        {totalUnread > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] leading-none font-bold">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Per-page pills */}
      {pages.map((page) => {
        const isActive = selectedPageId === page.page_id;
        const unread = unreadByPage[page.page_id] || 0;
        const pic = page.config?.pagePicture || page.pagePicture;

        return (
          <button
            key={page.page_id}
            onClick={() => onSelect(page.page_id)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition whitespace-nowrap flex-shrink-0 ${
              isActive
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100'
            }`}
          >
            {/* Avatar */}
            {pic ? (
              <img
                src={pic}
                alt=""
                className={`w-5 h-5 rounded-full object-cover flex-shrink-0 ${isActive ? 'ring-1 ring-blue-400' : ''}`}
              />
            ) : (
              <div className={`w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 ${isActive ? 'ring-1 ring-blue-400' : ''}`}>
                {page.page_name?.charAt(0) || 'P'}
              </div>
            )}

            {/* Name — truncate */}
            <span className="max-w-[100px] truncate">{page.page_name || 'Page'}</span>

            {/* Unread badge */}
            {unread > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] leading-none font-bold">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
