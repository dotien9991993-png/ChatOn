import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FB_ICON = (
  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

/**
 * PageDropdown — dropdown chọn Pages giống Harasocial
 */
export default function PageDropdown({ connectedPages, selectedPageIds, onSelectionChange, conversations, maxPages = 5 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState(new Set(selectedPageIds));
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Sync localSelected when prop changes
  useEffect(() => {
    setLocalSelected(new Set(selectedPageIds));
  }, [selectedPageIds]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!connectedPages || connectedPages.length === 0) return null;

  const allPageIds = connectedPages.map(p => p.pageId || p.page_id);
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => localSelected.has(id));
  const someSelected = allPageIds.some(id => localSelected.has(id)) && !allSelected;

  // Filter pages by search
  const filteredPages = connectedPages.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (p.pageName || p.page_name || '').toLowerCase();
    const id = (p.pageId || p.page_id || '').toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  // Count conversations per page
  const countByPage = {};
  let totalCount = conversations.length;
  for (const conv of conversations) {
    if (conv.page_id) {
      countByPage[conv.page_id] = (countByPage[conv.page_id] || 0) + 1;
    }
  }

  // Filtered conversation count — conversations without page_id count for all pages
  const filteredCount = localSelected.size === 0 || localSelected.size === allPageIds.length
    ? totalCount
    : conversations.filter(c => !c.page_id || localSelected.has(c.page_id)).length;

  function toggleAll() {
    if (allSelected) {
      setLocalSelected(new Set());
    } else {
      setLocalSelected(new Set(allPageIds));
    }
  }

  function togglePage(pageId) {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }

  function applyFilter() {
    onSelectionChange([...localSelected]);
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleOpen() {
    setLocalSelected(new Set(selectedPageIds));
    setSearchQuery('');
    setIsOpen(!isOpen);
  }

  // Trigger label
  function getTriggerLabel() {
    if (selectedPageIds.length === 0 || selectedPageIds.length === allPageIds.length) {
      return 'Tất cả trang';
    }
    if (selectedPageIds.length === 1) {
      const p = connectedPages.find(p => (p.pageId || p.page_id) === selectedPageIds[0]);
      return p?.pageName || p?.page_name || 'Page';
    }
    return `${selectedPageIds.length} trang đã chọn`;
  }

  // Avatar stack for trigger
  function getAvatarStack() {
    const show = selectedPageIds.length === 0 || selectedPageIds.length === allPageIds.length
      ? connectedPages.slice(0, 3)
      : connectedPages.filter(p => selectedPageIds.includes(p.pageId || p.page_id)).slice(0, 3);

    return show.map((p, i) => {
      const pic = p.pagePicture || p.config?.pagePicture;
      const name = p.pageName || p.page_name || '';
      return (
        <div key={p.pageId || p.page_id} className="relative" style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }}>
          {pic ? (
            <img src={pic} alt="" className="w-6 h-6 rounded-full object-cover border-2 border-white" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold border-2 border-white">
              {name.charAt(0) || 'P'}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white hover:bg-slate-50 border-b border-slate-200 transition"
      >
        <div className="flex items-center flex-shrink-0">
          {getAvatarStack()}
        </div>
        <span className="text-sm font-medium text-slate-800 truncate flex-1 text-left">
          {getTriggerLabel()}
        </span>
        <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0 bg-white rounded-b-xl shadow-xl border border-slate-200 border-t-0 w-full max-h-[480px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chọn trang</p>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm trang theo tên hoặc ID"
                className="w-full bg-slate-50 text-xs text-slate-700 placeholder-slate-400 rounded-lg pl-8 pr-3 py-2 outline-none border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
                autoFocus
              />
            </div>
          </div>

          {/* Select all */}
          <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
            <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
            <span className="text-sm font-medium text-slate-700">Chọn tất cả các trang</span>
          </label>

          {/* Page list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPages.map((page) => {
              const pageId = page.pageId || page.page_id;
              const pageName = page.pageName || page.page_name || 'Page';
              const pic = page.pagePicture || page.config?.pagePicture;
              const isChecked = localSelected.has(pageId);

              return (
                <label key={pageId} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                  <Checkbox checked={isChecked} onChange={() => togglePage(pageId)} />

                  {/* Avatar with FB badge */}
                  <div className="relative flex-shrink-0">
                    {pic ? (
                      <img src={pic} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {pageName.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center border border-white">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{pageName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">ID: {pageId}</p>
                  </div>
                </label>
              );
            })}

            {filteredPages.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Không tìm thấy trang nào
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-slate-200 p-3 space-y-2">
            {/* Apply button */}
            <button
              onClick={applyFilter}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-500 transition"
            >
              Xem hội thoại ({filteredCount}/{totalCount})
            </button>

            {/* Connect new page */}
            <button
              onClick={() => { setIsOpen(false); navigate('/settings'); }}
              className="w-full py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Kết nối trang mới ({connectedPages.length}/{maxPages})
            </button>

            {/* Info */}
            <p className="text-[11px] text-slate-400 flex items-start gap-1.5 px-1">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Bạn đã kết nối {connectedPages.length}/{maxPages} trang.{' '}
                {connectedPages.length >= maxPages && (
                  <button onClick={() => { setIsOpen(false); navigate('/settings'); }} className="text-blue-500 hover:underline">
                    Nâng cấp gói
                  </button>
                )}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Custom checkbox with indeterminate support
 */
function Checkbox({ checked, indeterminate, onChange }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); onChange(); }}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
        checked || indeterminate
          ? 'bg-blue-500 border-blue-500'
          : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {indeterminate && !checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      )}
    </button>
  );
}
