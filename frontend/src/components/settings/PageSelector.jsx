import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

/**
 * Modal chọn Facebook Pages — hỗ trợ multi-select
 * Hiện checkbox cho mỗi Page, user tích nhiều rồi bấm "Kết nối"
 */
export default function PageSelector({ connectedPageIds = [], onConnected, onClose, showToast }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [connecting, setConnecting] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(null); // { success: number, failed: number }

  useEffect(() => {
    loadPages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPages() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFacebookPages();
      setPages(data.pages || []);
      if ((data.pages || []).length === 0) {
        setError('Không tìm thấy Page nào. Bạn cần có quyền Admin trên ít nhất 1 Facebook Page.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Không lấy được danh sách Pages.');
    } finally {
      setLoading(false);
    }
  }

  function togglePage(pageId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }

  // Pages mới được tích (chưa kết nối)
  const newSelected = pages.filter(p => selectedIds.has(p.id) && !connectedPageIds.includes(p.id));
  const allConnected = pages.length > 0 && pages.every(p => connectedPageIds.includes(p.id));

  async function handleConnectSelected() {
    if (newSelected.length === 0) return;
    setConnecting(true);
    setDone(null);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < newSelected.length; i++) {
      const page = newSelected[i];
      setProgress(`Đang kết nối ${i + 1}/${newSelected.length}: ${page.name}...`);
      try {
        await api.connectFacebookPage({
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.accessToken,
          pagePicture: page.picture,
        });
        success++;
      } catch (err) {
        console.error('Failed to connect page:', page.name, err);
        failed++;
      }
    }

    setConnecting(false);
    setProgress('');
    setDone({ success, failed });

    if (success > 0) {
      showToast?.(`Đã kết nối ${success} Page thành công!${failed > 0 ? ` (${failed} thất bại)` : ''}`, 'success');
      // Short delay so user sees result, then close
      setTimeout(() => onConnected?.(), 800);
    } else {
      showToast?.('Không kết nối được Page nào. Vui lòng thử lại.', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Chọn Pages để kết nối</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tích chọn các Pages bạn muốn nhận tin nhắn</p>
          </div>
          <button
            onClick={onClose}
            disabled={connecting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-sm text-slate-600">Đang tải danh sách Pages...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                onClick={loadPages}
                className="text-xs px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && allConnected && !done && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-800">Tất cả Pages đã được kết nối</p>
              <p className="text-xs text-slate-500 mt-1">Bạn đã kết nối tất cả {pages.length} Pages từ tài khoản Facebook.</p>
            </div>
          )}

          {/* Page list with checkboxes */}
          {!loading && !error && pages.length > 0 && !allConnected && (
            <div className="space-y-2">
              {pages.map((page) => {
                const isConnected = connectedPageIds.includes(page.id);
                const isChecked = isConnected || selectedIds.has(page.id);

                return (
                  <label
                    key={page.id}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition cursor-pointer ${
                      isConnected
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-default'
                        : isChecked
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-slate-50 border-transparent hover:bg-blue-50/50 hover:border-blue-100'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isConnected || connecting}
                      onChange={() => !isConnected && togglePage(page.id)}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 disabled:opacity-50 flex-shrink-0"
                    />

                    {/* Avatar */}
                    {page.picture ? (
                      <img src={page.picture} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {page.name?.charAt(0) || 'P'}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{page.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {page.category || 'Page'} &middot; ID: {page.id}
                      </p>
                    </div>

                    {/* Status badge */}
                    {isConnected && (
                      <span className="text-[11px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        đã kết nối
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {/* Progress */}
          {connecting && progress && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-lg">
              <svg className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-blue-700 font-medium">{progress}</span>
            </div>
          )}

          {/* Done result */}
          {done && (
            <div className={`mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg ${
              done.failed === 0 ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              <svg className={`w-4 h-4 flex-shrink-0 ${done.failed === 0 ? 'text-green-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className={`text-xs font-medium ${done.failed === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                Đã kết nối {done.success} Page thành công
                {done.failed > 0 ? `, ${done.failed} thất bại` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={connecting}
            className="text-xs px-4 py-2 text-slate-500 hover:text-slate-800 transition disabled:opacity-50"
          >
            {done ? 'Đóng' : 'Hủy'}
          </button>

          {!done && !allConnected && (
            <button
              onClick={handleConnectSelected}
              disabled={newSelected.length === 0 || connecting}
              className="text-xs px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {connecting
                ? 'Đang kết nối...'
                : newSelected.length > 0
                  ? `Kết nối ${newSelected.length} Page đã chọn`
                  : 'Chọn Page để kết nối'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
