import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Edit3, Save, X, Upload, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import * as api from '../../services/api';

const MATCH_TYPES = [
  { id: 'contains', label: 'Chứa từ khóa' },
  { id: 'exact', label: 'Khớp chính xác' },
  { id: 'starts_with', label: 'Bắt đầu bằng' },
];

const TEMPLATES = [
  { id: 'general', label: 'Tổng quát' },
  { id: 'fashion', label: 'Thời trang' },
  { id: 'cosmetics', label: 'Mỹ phẩm' },
  { id: 'phone', label: 'Điện thoại' },
  { id: 'food', label: 'Đồ ăn' },
  { id: 'karaoke', label: 'Karaoke/Âm thanh' },
  { id: 'furniture', label: 'Nội thất' },
  { id: 'baby', label: 'Mẹ & Bé' },
];

export default function ChatbotRulesSettings({ showToast }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '',
    keywords: [],
    match_type: 'contains',
    response_text: '',
    response_buttons: [],
    is_active: true,
    priority: 0,
  };

  const [form, setForm] = useState({ ...emptyForm });
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      const data = await api.getChatbotRules();
      setRules(data);
    } catch (err) {
      console.error('Load rules error:', err);
    }
    setLoading(false);
  }

  function startAdd() {
    setForm({ ...emptyForm, priority: rules.length + 1 });
    setEditingRule(null);
    setShowForm(true);
    setKeywordInput('');
  }

  function startEdit(rule) {
    setForm({
      name: rule.name,
      keywords: rule.keywords || [],
      match_type: rule.match_type || 'contains',
      response_text: rule.response_text || '',
      response_buttons: rule.response_buttons || [],
      is_active: rule.is_active,
      priority: rule.priority || 0,
    });
    setEditingRule(rule);
    setShowForm(true);
    setKeywordInput('');
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (!kw || form.keywords.includes(kw)) return;
    setForm(p => ({ ...p, keywords: [...p.keywords, kw] }));
    setKeywordInput('');
  }

  function removeKeyword(idx) {
    setForm(p => ({ ...p, keywords: p.keywords.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name || !form.response_text) {
      showToast('Vui lòng nhập tên và nội dung phản hồi', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingRule) {
        await api.updateChatbotRule(editingRule.id, form);
        showToast('Đã cập nhật kịch bản!');
      } else {
        await api.createChatbotRule(form);
        showToast('Đã tạo kịch bản mới!');
      }
      setShowForm(false);
      setEditingRule(null);
      loadRules();
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Xóa kịch bản này?')) return;
    try {
      await api.deleteChatbotRule(id);
      showToast('Đã xóa kịch bản');
      loadRules();
    } catch (err) {
      showToast('Lỗi xóa', 'error');
    }
  }

  async function handleToggle(rule) {
    try {
      await api.updateChatbotRule(rule.id, { is_active: !rule.is_active });
      loadRules();
    } catch (err) {
      showToast('Lỗi cập nhật', 'error');
    }
  }

  async function handleImportTemplate(templateId) {
    try {
      const result = await api.importChatbotTemplate(templateId);
      showToast(`Đã import ${result.count} kịch bản mẫu!`);
      loadRules();
    } catch (err) {
      showToast('Lỗi import: ' + (err.response?.data?.error || err.message), 'error');
    }
  }

  if (loading) {
    return <div className="text-slate-500 text-sm p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            Chatbot kịch bản
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kịch bản trả lời tự động theo từ khóa (ưu tiên trước AI)
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Thêm kịch bản
        </button>
      </div>

      {/* Import Templates */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Import mẫu theo ngành</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleImportTemplate(t.id)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full hover:bg-blue-50 hover:border-blue-300 text-slate-600"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingRule ? 'Sửa kịch bản' : 'Thêm kịch bản mới'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tên kịch bản</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="VD: Hỏi giá"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kiểu khớp</label>
              <select
                value={form.match_type}
                onChange={e => setForm(p => ({ ...p, match_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {MATCH_TYPES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Từ khóa kích hoạt</label>
            <div className="flex gap-2 mb-2">
              <input
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Nhập từ khóa rồi Enter"
              />
              <button onClick={addKeyword} className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.keywords.map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  {kw}
                  <button onClick={() => removeKeyword(i)} className="text-blue-400 hover:text-blue-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Response */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nội dung phản hồi</label>
            <textarea
              value={form.response_text}
              onChange={e => setForm(p => ({ ...p, response_text: e.target.value }))}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Nội dung bot sẽ trả lời..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Chưa có kịch bản nào. Bấm "Thêm kịch bản" hoặc import mẫu để bắt đầu.
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
              <div className="text-slate-300 cursor-grab mt-1">
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">{rule.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rule.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {rule.is_active ? 'Bật' : 'Tắt'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {MATCH_TYPES.find(m => m.id === rule.match_type)?.label || rule.match_type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {(rule.keywords || []).slice(0, 5).map((kw, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                      {kw}
                    </span>
                  ))}
                  {(rule.keywords || []).length > 5 && (
                    <span className="text-[10px] text-slate-400">+{rule.keywords.length - 5}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{rule.response_text}</p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(rule)} className="p-1.5 rounded hover:bg-slate-100">
                  {rule.is_active
                    ? <ToggleRight className="w-5 h-5 text-green-500" />
                    : <ToggleLeft className="w-5 h-5 text-slate-400" />
                  }
                </button>
                <button onClick={() => startEdit(rule)} className="p-1.5 rounded hover:bg-slate-100">
                  <Edit3 className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded hover:bg-red-50">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
