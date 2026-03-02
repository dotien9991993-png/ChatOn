import React, { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Edit3, Save, X, Play, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import * as api from '../../services/api';

const TRIGGER_EVENTS = [
  { id: 'order_created', label: 'Sau khi tạo đơn hàng' },
  { id: 'first_message', label: 'Tin nhắn đầu tiên' },
  { id: 'manual', label: 'Thủ công (chọn khách)' },
];

export default function DripCampaignSettings({ showToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '',
    trigger_event: 'order_created',
    is_active: true,
    steps: [{ delay_days: 1, message: '', type: 'text' }],
  };
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await api.getDripCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error('Load campaigns error:', err);
    }
    setLoading(false);
  }

  function startAdd() {
    setForm({ ...emptyForm });
    setEditingCampaign(null);
    setShowForm(true);
  }

  function startEdit(campaign) {
    setForm({
      name: campaign.name,
      trigger_event: campaign.trigger_event,
      is_active: campaign.is_active,
      steps: campaign.steps || [{ delay_days: 1, message: '', type: 'text' }],
    });
    setEditingCampaign(campaign);
    setShowForm(true);
  }

  function addStep() {
    setForm(p => ({
      ...p,
      steps: [...p.steps, { delay_days: p.steps.length + 1, message: '', type: 'text' }],
    }));
  }

  function updateStep(idx, field, value) {
    setForm(p => ({
      ...p,
      steps: p.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  }

  function removeStep(idx) {
    if (form.steps.length <= 1) return;
    setForm(p => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name || form.steps.some(s => !s.message)) {
      showToast('Vui lòng nhập tên và nội dung cho tất cả bước', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingCampaign) {
        await api.updateDripCampaign(editingCampaign.id, form);
        showToast('Đã cập nhật chiến dịch!');
      } else {
        await api.createDripCampaign(form);
        showToast('Đã tạo chiến dịch mới!');
      }
      setShowForm(false);
      loadCampaigns();
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Xóa chiến dịch này?')) return;
    try {
      await api.deleteDripCampaign(id);
      showToast('Đã xóa chiến dịch');
      loadCampaigns();
    } catch (err) {
      showToast('Lỗi xóa', 'error');
    }
  }

  async function handleToggle(campaign) {
    try {
      await api.updateDripCampaign(campaign.id, { is_active: !campaign.is_active });
      loadCampaigns();
    } catch (err) {
      showToast('Lỗi cập nhật', 'error');
    }
  }

  if (loading) return <div className="text-slate-500 text-sm p-4">Đang tải...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Chăm sóc tự động
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Chuỗi tin nhắn chăm sóc khách hàng theo lịch trình
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Tạo chiến dịch
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingCampaign ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tên chiến dịch</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="VD: Chăm sóc sau mua hàng"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kích hoạt khi</label>
              <select
                value={form.trigger_event}
                onChange={e => setForm(p => ({ ...p, trigger_event: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {TRIGGER_EVENTS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Các bước gửi tin</label>
              <button onClick={addStep} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Thêm bước
              </button>
            </div>

            <div className="space-y-3">
              {form.steps.map((step, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-slate-500 w-16">Bước {idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">Sau</span>
                      <input
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)}
                        className="w-14 border border-slate-200 rounded px-2 py-1 text-xs text-center"
                      />
                      <span className="text-xs text-slate-500">ngày</span>
                    </div>
                    {form.steps.length > 1 && (
                      <button onClick={() => removeStep(idx)} className="ml-auto text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={step.message}
                    onChange={e => updateStep(idx, 'message', e.target.value)}
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Nội dung tin nhắn..."
                  />
                </div>
              ))}
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

      {/* Campaign List */}
      <div className="space-y-2">
        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Chưa có chiến dịch nào. Bấm "Tạo chiến dịch" để bắt đầu.
          </div>
        ) : (
          campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${campaign.is_active ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <Zap className={`w-4 h-4 ${campaign.is_active ? 'text-amber-500' : 'text-slate-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-900">{campaign.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${campaign.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {campaign.is_active ? 'Bật' : 'Tắt'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{TRIGGER_EVENTS.find(t => t.id === campaign.trigger_event)?.label || campaign.trigger_event}</span>
                  <span>{campaign.steps?.length || 0} bước</span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(campaign)} className="p-1.5 rounded hover:bg-slate-100">
                  {campaign.is_active
                    ? <ToggleRight className="w-5 h-5 text-green-500" />
                    : <ToggleLeft className="w-5 h-5 text-slate-400" />
                  }
                </button>
                <button onClick={() => startEdit(campaign)} className="p-1.5 rounded hover:bg-slate-100">
                  <Edit3 className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => handleDelete(campaign.id)} className="p-1.5 rounded hover:bg-red-50">
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
