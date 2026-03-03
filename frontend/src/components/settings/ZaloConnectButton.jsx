import React, { useState } from 'react';
import * as api from '../../services/api';

/**
 * Nut "Ket noi Zalo OA" — mo popup OAuth
 * Sau khi OAuth thanh cong, goi onSuccess de reload channels
 */
export default function ZaloConnectButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);

    try {
      const { url } = await api.getZaloOAuthUrl();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'zalo-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        onError?.('Trinh duyet da chan popup. Vui long cho phep popup va thu lai.');
        setLoading(false);
        return;
      }

      // Listen for postMessage from popup callback
      function onMessage(event) {
        if (event.data?.type !== 'ZALO_OAUTH_CALLBACK') return;

        window.removeEventListener('message', onMessage);
        setLoading(false);

        if (event.data.success) {
          onSuccess?.();
        } else {
          onError?.(event.data.error || 'Ket noi that bai');
        }
      }

      window.addEventListener('message', onMessage);

      // Fallback: poll for popup close then check status
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', onMessage);

          try {
            const data = await api.getZaloStatus();
            if (data?.channels?.length > 0) {
              setLoading(false);
              onSuccess?.();
              return;
            }
          } catch {
            // No channels found after popup close
          }

          setLoading(false);
        }
      }, 500);
    } catch (err) {
      console.error('[Zalo Connect]', err.response?.data?.error || err.message);
      setLoading(false);
      onError?.(err.response?.data?.error || err.message || 'Loi ket noi');
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2.5 px-5 py-3 bg-[#0068ff] hover:bg-[#0054cc] disabled:opacity-60 text-white rounded-xl transition font-medium text-sm"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Dang ket noi...</span>
        </>
      ) : (
        <>
          <span className="w-5 h-5 flex items-center justify-center font-bold text-sm">Z</span>
          <span>Ket noi Zalo OA</span>
        </>
      )}
    </button>
  );
}
