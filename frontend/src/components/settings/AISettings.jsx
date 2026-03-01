import React, { useState, useEffect } from 'react';
import { Bot, Eye, EyeOff, CheckCircle, XCircle, FileText, Save } from 'lucide-react';
import * as api from '../../services/api';

const TONE_OPTIONS = [
  { id: 'friendly', label: 'Thân thiện' },
  { id: 'professional', label: 'Chuyên nghiệp' },
  { id: 'humorous', label: 'Hài hước' },
  { id: 'custom', label: 'Tùy chỉnh' },
];

const PROVIDER_OPTIONS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', recommended: true },
  { id: 'openai', label: 'OpenAI (GPT)' },
];

const MODEL_OPTIONS = {
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-haiku-4-5-20251001',
  ],
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
  ],
};

/**
 * Cài đặt AI Chatbot
 */
export default function AISettings({ settings, onSettingsChange, showToast }) {
  const ai = settings?.ai || {};
  const [form, setForm] = useState({});
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [promptExpanded, setPromptExpanded] = useState(false);

  useEffect(() => {
    setForm({ ...ai });
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load sản phẩm
  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateAISettings(form);
      showToast('Đã lưu cài đặt AI!', 'success');
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
      const result = await api.testAI();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  }

  const models = MODEL_OPTIONS[form.provider] || MODEL_OPTIONS.anthropic;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Cài đặt AI Chatbot</h2>
      <p className="text-sm text-slate-500 mb-6">Cấu hình AI tự động trả lời tin nhắn khách hàng</p>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-5">
        {/* Toggle bật/tắt */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">AI Engine</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.enabled || false} onChange={(e) => updateField('enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            <span className="ml-2 text-xs text-slate-600">{form.enabled ? 'AI đang BẬT' : 'AI đang TẮT'}</span>
          </label>
        </div>

        {/* Provider */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">API Provider</label>
          <select
            value={form.provider || 'anthropic'}
            onChange={(e) => { updateField('provider', e.target.value); updateField('model', MODEL_OPTIONS[e.target.value]?.[0]); }}
            className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40"
          >
            {PROVIDER_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}{p.recommended ? ' ← khuyến nghị' : ''}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey || ''}
              onChange={(e) => updateField('apiKey', e.target.value)}
              placeholder={form.provider === 'anthropic' ? 'sk-ant-api03-...' : 'sk-proj-...'}
              className="flex-1 bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
            />
            <button onClick={() => setShowKey(!showKey)} className="px-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={handleTest} disabled={testing} className="px-3 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 text-xs disabled:opacity-50">
              {testing ? '...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${testResult.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {testResult.success
                ? <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Hoạt động tốt! ({testResult.latency}ms) — &quot;{testResult.response}&quot;</span>
                : <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Lỗi: {testResult.error}</span>}
            </div>
          )}
        </div>

        {/* Model */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">Model</label>
          <select
            value={form.model || models[0]}
            onChange={(e) => updateField('model', e.target.value)}
            className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40"
          >
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Rate limit */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">Giới hạn tin nhắn AI / phút</label>
          <input
            type="number"
            value={form.maxMessagesPerMinute || 30}
            onChange={(e) => updateField('maxMessagesPerMinute', parseInt(e.target.value, 10))}
            className="w-32 bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40"
          />
        </div>

        {/* Phong cách */}
        <div className="border-t border-slate-200 pt-4">
          <label className="text-xs text-slate-600 font-medium block mb-2.5">Chọn giọng điệu</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => updateField('tone', t.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${form.tone === t.id ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-300 text-slate-500 hover:border-slate-400'}`}
              >
                {form.tone === t.id ? '● ' : '○ '}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1.5">System Prompt (hướng dẫn AI cách trả lời)</label>
          <textarea
            value={form.systemPrompt || ''}
            onChange={(e) => updateField('systemPrompt', e.target.value)}
            rows={promptExpanded ? 16 : 6}
            className="w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none font-mono leading-relaxed"
          />
          <button onClick={() => setPromptExpanded(!promptExpanded)} className="text-[11px] text-slate-500 hover:text-slate-700 mt-1">
            {promptExpanded ? '↕ Thu gọn' : '↕ Mở rộng'}
          </button>
        </div>

        {/* Dữ liệu sản phẩm */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3">Dữ liệu sản phẩm (để AI tư vấn chính xác)</h3>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-slate-600 flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> products.json — {products.length} sản phẩm</span>
          </div>

          {/* Preview */}
          {products.length > 0 && (
            <div className="bg-slate-50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Sản phẩm</th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 5).map((p, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="px-3 py-2 text-slate-700">{p.name}</td>
                      <td className="px-3 py-2 text-slate-600 text-right">{(p.price || 0).toLocaleString('vi-VN')}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length > 5 && (
                <p className="px-3 py-2 text-[11px] text-slate-500">... xem thêm {products.length - 5} sản phẩm</p>
              )}
            </div>
          )}
        </div>

        {/* Nút lưu */}
        <div className="pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition">
            {saving ? 'Đang lưu...' : <span className="flex items-center gap-1.5"><Save className="w-4 h-4" /> Lưu cài đặt AI</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
