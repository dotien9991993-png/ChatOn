import React, { useState, useEffect } from 'react';
import { Filter, Plus, Trash2, Edit3, Save, X, Users, RefreshCw } from 'lucide-react';
import * as api from '../../services/api';

const CONDITION_FIELDS = [
  { id: 'total_spent', label: 'Tổng chi tiêu', type: 'number' },
  { id: 'orders_count', label: 'Số đơn hàng', type: 'number' },
  { id: 'has_phone', label: 'Có SĐT', type: 'boolean' },
  { id: 'has_email', label: 'Có email', type: 'boolean' },
  { id: 'tag', label: 'Tag', type: 'text' },
  { id: 'channel_type', label: 'Kênh', type: 'text' },
  { id: 'days_since_first_contact', label: 'Ngày kể từ liên hệ đầu', type: 'number' },
  { id: 'days_since_last_order', label: 'Ngày kể từ đơn cuối', type: 'number' },
];

const NUMBER_OPERATORS = [
  { id: '>', label: '>' },
  { id: '>=', label: '>=' },
  { id: '<', label: '<' },
  { id: '<=', label: '<=' },
  { id: '=', label: '=' },
];

export default function SegmentsSettings({ showToast }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(null);

  const emptyForm = {
    name: '',
    description: '',
    conditions: [{ field: 'orders_count', operator: '>=', value: '1' }],
    match_type: 'all',
  };
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    try {
      const data = await api.getSegments();
      setSegments(data);
    } catch (err) {
      console.error('Load segments error:', err);
    }
    setLoading(false);
  }

  function startAdd() {
    setForm({ ...emptyForm });
    setEditingSegment(null);
    setShowForm(true);
  }

  function startEdit(segment) {
    setForm({
      name: segment.name,
      description: segment.description || '',
      conditions: segment.conditions || [{ field: 'orders_count', operator: '>=', value: '1' }],
      match_type: segment.match_type || 'all',
    });
    setEditingSegment(segment);
    setShowForm(true);
  }

  function addCondition() {
    setForm(p => ({
      ...p,
      conditions: [...p.conditions, { field: 'orders_count', operator: '>=', value: '' }],
    }));
  }

  function updateCondition(idx, key, value) {
    setForm(p => ({
      ...p,
      conditions: p.conditions.map((c, i) => i === idx ? { ...c, [key]: value } : c),
    }));
  }

  function removeCondition(idx) {
    if (form.conditions.length <= 1) return;
    setForm(p => ({ ...p, conditions: p.conditions.filter((_, i) => i !== idx) }));
  }

  function getFieldConfig(fieldId) {
    return CONDITION_FIELDS.find(f => f.id === fieldId) || {};
  }

  async function handleSave() {
    if (!form.name) {
      showToast('Vui lòng nhập tên segment', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingSegment) {
        await api.updateSegment(editingSegment.id, form);
        showToast('Đã cập nhật segment!');
      } else {
        await api.createSegment(form);
        showToast('Đã tạo segment mới!');
      }
      setShowForm(false);
      loadSegments();
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Xóa segment này?')) return;
    try {
      await api.deleteSegment(id);
      showToast('Đã xóa segment');
      loadSegments();
    } catch (err) {
      showToast('Lỗi xóa', 'error');
    }
  }

  async function handleRefresh(id) {
    setRefreshing(id);
    try {
      const result = await api.refreshSegment(id);
      showToast(`Segment có ${result.customer_count} khách hàng`);
      loadSegments();
    } catch (err) {
      showToast('Lỗi refresh', 'error');
    }
    setRefreshing(null);
  }

  if (loading) return <div className="text-slate-500 text-sm p-4">Đang tải...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-violet-500" />
            Phân nhóm khách hàng
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tạo segment dựa trên điều kiện để gửi chiến dịch marketing
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Tạo segment
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingSegment ? 'Sửa segment' : 'Tạo segment mới'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tên segment</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="VD: Khách VIP"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Logic điều kiện</label>
              <select
                value={form.match_type}
                onChange={e => setForm(p => ({ ...p, match_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">Thỏa TẤT CẢ điều kiện (AND)</option>
                <option value="any">Thỏa BẤT KỲ điều kiện (OR)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả (tùy chọn)</label>
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Mô tả segment..."
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Điều kiện</label>
              <button onClick={addCondition} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Thêm điều kiện
              </button>
            </div>

            <div className="space-y-2">
              {form.conditions.map((cond, idx) => {
                const fieldConfig = getFieldConfig(cond.field);
                return (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <select
                      value={cond.field}
                      onChange={e => updateCondition(idx, 'field', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs"
                    >
                      {CONDITION_FIELDS.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>

                    {fieldConfig.type === 'boolean' ? (
                      <select
                        value={cond.operator}
                        onChange={e => updateCondition(idx, 'operator', e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1.5 text-xs"
                      >
                        <option value="is_true">Có</option>
                        <option value="is_false">Không</option>
                      </select>
                    ) : fieldConfig.type === 'text' ? (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => updateCondition(idx, 'operator', e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="contains">Chứa</option>
                          <option value="=">Bằng</option>
                        </select>
                        <input
                          value={cond.value || ''}
                          onChange={e => updateCondition(idx, 'value', e.target.value)}
                          className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-xs"
                          placeholder="Giá trị..."
                        />
                      </>
                    ) : (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => updateCondition(idx, 'operator', e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          {NUMBER_OPERATORS.map(op => (
                            <option key={op.id} value={op.id}>{op.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={cond.value || ''}
                          onChange={e => updateCondition(idx, 'value', e.target.value)}
                          className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs"
                          placeholder="Giá trị"
                        />
                      </>
                    )}

                    {form.conditions.length > 1 && (
                      <button onClick={() => removeCondition(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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

      {/* Segment List */}
      <div className="space-y-2">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Chưa có segment nào. Bấm "Tạo segment" để bắt đầu.
          </div>
        ) : (
          segments.map(segment => (
            <div key={segment.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-violet-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-900">{segment.name}</span>
                  {segment.customer_count != null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                      {segment.customer_count} khách
                    </span>
                  )}
                </div>
                {segment.description && (
                  <p className="text-xs text-slate-500 mb-1">{segment.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(segment.conditions || []).slice(0, 3).map((c, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                      {CONDITION_FIELDS.find(f => f.id === c.field)?.label || c.field} {c.operator} {c.value || ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleRefresh(segment.id)}
                  disabled={refreshing === segment.id}
                  className="p-1.5 rounded hover:bg-slate-100"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing === segment.id ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => startEdit(segment)} className="p-1.5 rounded hover:bg-slate-100">
                  <Edit3 className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => handleDelete(segment.id)} className="p-1.5 rounded hover:bg-red-50">
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
