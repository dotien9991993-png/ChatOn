import React, { useState } from 'react';
import * as api from '../../services/api';

/**
 * Nút "Kết nối Facebook" — mở popup OAuth
 * Sau khi OAuth thành công, gọi onSuccess để hiện PageSelector
 */
export default function FacebookConnectButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);

    try {
      const { url } = await api.getFacebookOAuthUrl();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'fb-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        onError?.('Trình duyệt đã chặn popup. Vui lòng cho phép popup và thử lại.');
        setLoading(false);
        return;
      }

      // Lắng nghe postMessage từ popup callback
      function onMessage(event) {
        if (event.data?.type !== 'FB_OAUTH_CALLBACK') return;

        window.removeEventListener('message', onMessage);
        setLoading(false);

        if (event.data.success) {
          onSuccess?.();
        } else {
          onError?.(event.data.error || 'Kết nối thất bại');
        }
      }

      window.addEventListener('message', onMessage);

      // Fallback: khi popup đóng, kiểm tra OAuth bằng API
      // (postMessage không hoạt động cross-origin giữa backend và frontend)
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', onMessage);

          try {
            const data = await api.getFacebookPages();
            if (data?.pages?.length > 0) {
              setLoading(false);
              onSuccess?.();
              return;
            }
          } catch {
            // No pages found after popup close
          }

          setLoading(false);
        }
      }, 500);
    } catch (err) {
      console.error('[FB Connect]', err.response?.data?.error || err.message);
      setLoading(false);
      onError?.(err.response?.data?.error || err.message || 'Lỗi kết nối');
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2.5 px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl transition font-medium text-sm"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Đang kết nối...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Kết nối Facebook</span>
        </>
      )}
    </button>
  );
}
