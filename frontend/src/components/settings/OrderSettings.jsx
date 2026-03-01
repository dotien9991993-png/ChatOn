import React, { useState, useEffect } from 'react';
import { Package, Eye, EyeOff, ClipboardCopy, Save, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import * as api from '../../services/api';

const DEMO_ORDERS = [
  { id: 'ĐH-0158', customer: 'Phạm Đức Anh', amount: '48.500k', status: 'success' },
  { id: 'ĐH-0157', customer: 'Võ Thanh Tùng', amount: '12.000k', status: 'success' },
  { id: 'ĐH-0156', customer: 'Nguyễn V.Minh', amount: '9.900k', status: 'retry' },
];

const DEFAULT_MAPPING = {
  customer_name: 'ten_khach_hang',
  customer_phone: 'so_dien_thoai',
  address: 'dia_chi',
  items: 'san_pham',
  total_amount: 'tong_tien',
  channel: 'nguon',
  note: 'ghi_chu',
};

/**
 * Cài đặt Đơn hàng & OMS
 */
export default function OrderSettings({ settings, onSettingsChange, showToast }) {
  const oms = settings?.oms || {};
  const [form, setForm] = useState({});
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setForm({ ...oms, fieldMapping: oms.fieldMapping || DEFAULT_MAPPING });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function updateMapping(chatField, omsField) {
    setForm((p) => ({
      ...p,
      fieldMapping: { ...p.fieldMapping, [chatField]: omsField },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateOMSSettings(form);
      showToast('Đã lưu cài đặt OMS!', 'success');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testOMS();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  }

  const webhookBase = window.location.hostname === 'localhost' ? 'https://your-domain.com' : window.location.origin;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Kết nối hệ thống đơn hàng</h2>
      <p className="text-sm text-slate-500 mb-6">Đẩy đơn hàng từ chatbot sang hệ thống in.hoangnamaudio.vn</p>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">Hệ thống xử lý đơn hàng</span>
        </div>

        {/* Connection info */}
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>Kết nối với: <span className="text-slate-700">in.hoangnamaudio.vn</span></span>
          {testResult?.success && (
            <span className="text-green-600">● Đã kết nối — Ping: {testResult.latency}ms</span>
          )}
        </div>

        {/* API Endpoint */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">API Endpoint</label>
          <input
            type="text"
            value={form.apiUrl || ''}
            onChange={(e) => updateField('apiUrl', e.target.value)}
            placeholder="https://in.hoangnamaudio.vn/api/external/orders"
            className="w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey || ''}
              onChange={(e) => updateField('apiKey', e.target.value)}
              placeholder="hna-oms-..."
              className="flex-1 bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
            />
            <button onClick={() => setShowKey(!showKey)} className="px-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Webhook callback */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">Webhook callback (OMS → SalesFlow)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${webhookBase}/webhook/oms-update`}
              readOnly
              className="flex-1 bg-slate-50 border border-slate-200 text-sm text-slate-600 rounded-lg px-3 py-2.5 font-mono"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`${webhookBase}/webhook/oms-update`)}
              className="px-2.5 bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 text-sm"
            >
              <ClipboardCopy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={handleTest} disabled={testing}
            className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition">
            {testing ? 'Đang test...' : 'Test kết nối'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition font-medium">
            {saving ? 'Đang lưu...' : <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Lưu</span>}
          </button>
        </div>

        {testResult && (
          <div className={`text-xs px-3 py-2 rounded-lg ${testResult.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {testResult.success ? <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Kết nối thành công ({testResult.latency}ms)</span> : <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {testResult.error}</span>}
          </div>
        )}

        {/* Toggles */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700">Tự động đẩy đơn khi AI chốt</span>
            <div className="relative">
              <input type="checkbox" checked={form.autoSync || false} onChange={(e) => updateField('autoSync', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700">Yêu cầu xác nhận trước khi đẩy</span>
            <div className="relative">
              <input type="checkbox" checked={form.requireConfirmation || false} onChange={(e) => updateField('requireConfirmation', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </div>
          </label>
        </div>

        {/* Field mapping */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3">Mapping trường dữ liệu</h3>
          <p className="text-xs text-slate-500 mb-3">Ánh xạ dữ liệu từ chatbot → format OMS</p>
          <div className="space-y-2">
            {Object.entries(form.fieldMapping || DEFAULT_MAPPING).map(([chatField, omsField]) => (
              <div key={chatField} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-32 font-mono">{chatField}</span>
                <span className="text-xs text-slate-400">→</span>
                <input
                  type="text"
                  value={omsField}
                  onChange={(e) => updateMapping(chatField, e.target.value)}
                  className="flex-1 bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Lịch sử */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3">Lịch sử đẩy đơn gần đây</h3>
          <div className="bg-slate-50 rounded-lg overflow-hidden">
            {DEMO_ORDERS.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 last:border-0 text-xs">
                <span className="text-blue-600 font-mono">#{order.id}</span>
                <span className="text-slate-700">{order.customer}</span>
                <span className="text-slate-600">{order.amount}</span>
                <span className={`flex items-center gap-1 ${order.status === 'success' ? 'text-green-600' : 'text-amber-600'}`}>
                  {order.status === 'success' ? <><CheckCircle className="w-3 h-3" /> Thành công</> : <><AlertTriangle className="w-3 h-3" /> Đang retry</>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
