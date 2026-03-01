import React, { useState } from 'react';
import { Eye, EyeOff, ClipboardCopy, CheckCircle, XCircle, Save, ChevronRight } from 'lucide-react';

/**
 * Card kết nối 1 kênh — reusable
 * Props: channel config, fields[], actions
 */
export default function ConnectionCard({
  icon,
  iconBg,
  name,
  connected,
  fields,         // [{ key, label, type, placeholder, copyable, readOnly }]
  values,         // { key: value }
  onChange,        // (key, value) => void
  onSave,
  onTest,
  onDisconnect,
  guideSteps,     // string[]
  guideUrl,
  note,
  stats,          // [{ label, value }]
  saving,
  testing,
  testResult,
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [visibleFields, setVisibleFields] = useState({});

  function toggleFieldVisibility(key) {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <span className="text-base font-semibold text-slate-800">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-400'}`} />
          <span className={`text-xs font-medium ${connected ? 'text-green-600' : 'text-slate-500'}`}>
            {connected ? 'Đã kết nối' : 'Chưa kết nối'}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stats nếu đã kết nối */}
        {connected && stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <p className="text-sm text-slate-700 font-medium">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Input fields */}
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-slate-600 font-medium block mb-1.5">{field.label}</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={field.type === 'password' && !visibleFields[field.key] ? 'password' : 'text'}
                  value={values[field.key] || ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  readOnly={field.readOnly}
                  className={`w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40 transition font-mono ${field.readOnly ? 'opacity-70' : ''}`}
                />
              </div>
              {/* Nút hiện/ẩn password */}
              {field.type === 'password' && (
                <button
                  onClick={() => toggleFieldVisibility(field.key)}
                  className="px-2.5 bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition text-sm"
                  title={visibleFields[field.key] ? 'Ẩn' : 'Hiện'}
                >
                  {visibleFields[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              {/* Nút copy */}
              {field.copyable && (
                <button
                  onClick={() => copyToClipboard(values[field.key] || '')}
                  className="px-2.5 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition text-sm"
                  title="Copy"
                >
                  <ClipboardCopy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Test result */}
        {testResult && (
          <div className={`text-xs px-3 py-2 rounded-lg ${testResult.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {testResult.success
              ? <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Kết nối thành công{testResult.latency ? ` (${testResult.latency}ms)` : ''}{testResult.pageInfo ? ` — Page: ${testResult.pageInfo.name}` : ''}</span>
              : <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Thất bại: {testResult.error}</span>
            }
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {guideUrl && (
            <a href={guideUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-500 transition">
              Hướng dẫn kết nối ↗
            </a>
          )}
          <div className="flex-1" />
          {onTest && (
            <button onClick={onTest} disabled={testing}
              className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition">
              {testing ? 'Đang test...' : 'Test kết nối'}
            </button>
          )}
          <button onClick={onSave} disabled={saving}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition font-medium">
            {saving ? 'Đang lưu...' : <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> {connected ? 'Lưu' : 'Lưu & Kết nối'}</span>}
          </button>
          {connected && onDisconnect && (
            <button onClick={onDisconnect}
              className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
              Ngắt kết nối
            </button>
          )}
        </div>

        {/* Note */}
        {note && (
          <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">{note}</p>
        )}

        {/* Hướng dẫn nhanh — collapsible */}
        {guideSteps && guideSteps.length > 0 && (
          <div className="border-t border-slate-200 pt-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
              Hướng dẫn nhanh
            </button>
            {showGuide && (
              <ol className="mt-2 space-y-1.5 text-xs text-slate-500 pl-4">
                {guideSteps.map((step, i) => (
                  <li key={i} className="list-decimal">{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
