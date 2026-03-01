import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';

/**
 * Modal chọn Facebook Page sau khi OAuth thành công
 * Hiển thị danh sách pages → user chọn 1 → connect
 */
export default function PageSelector({ onConnected, onClose, showToast }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // pageId đang connect
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPages();
  }, []);

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

  async function handleSelectPage(page) {
    setConnecting(page.id);
    try {
      await api.connectFacebookPage({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.accessToken,
        pagePicture: page.picture,
      });
      showToast?.(`Đã kết nối page "${page.name}" thành công!`, 'success');
      onConnected?.();
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Lỗi kết nối Page', 'error');
    } finally {
      setConnecting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Chọn Facebook Page</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chọn page bạn muốn nhận tin nhắn từ khách hàng</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
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

          {!loading && !error && pages.length > 0 && (
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  disabled={connecting !== null}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition text-left disabled:opacity-50"
                >
                  {/* Avatar */}
                  {page.picture ? (
                    <img src={page.picture} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
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

                  {/* Connect indicator */}
                  {connecting === page.id ? (
                    <svg className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 text-slate-500 hover:text-slate-800 transition"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
