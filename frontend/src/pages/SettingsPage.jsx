import React, { useState, useEffect } from 'react';
import SettingsLayout from '../components/settings/SettingsLayout';
import Toast from '../components/Toast';
import * as api from '../services/api';

/**
 * Trang Cài đặt — load settings từ API, quản lý toast
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getSettings()
      .then((data) => { setSettings(data); setLoading(false); })
      .catch((err) => { console.error('Lỗi load settings:', err); setLoading(false); });
  }, []);

  function showToast(message, type = 'success') {
    setToast({ message, type, key: Date.now() });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-slate-500 text-sm">Đang tải cài đặt...</div>
      </div>
    );
  }

  return (
    <>
      <SettingsLayout
        settings={settings}
        onSettingsChange={setSettings}
        showToast={showToast}
      />
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
