import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Eye, Send, Clock, XCircle, X } from 'lucide-react';
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign,
  sendCampaign, scheduleCampaign, cancelCampaign, previewCampaign,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

const STATUS_MAP = {
  draft: { label: 'Nháp', color: 'bg-slate-100 text-slate-600' },
  scheduled: { label: 'Đã lên lịch', color: 'bg-blue-50 text-blue-600' },
  sending: { label: 'Đang gửi', color: 'bg-yellow-50 text-yellow-600' },
  sent: { label: 'Đã gửi', color: 'bg-green-50 text-green-600' },
  failed: { label: 'Lỗi', color: 'bg-red-50 text-red-600' },
  cancelled: { label: 'Đã huỷ', color: 'bg-slate-100 text-slate-500' },
};

export default function CampaignsPage() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Create form state
  const [form, setForm] = useState({
    name: '', description: '', target_type: 'all', target_tags: [],
    target_channel: 'facebook', message_type: 'text', message_text: '',
  });
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getCampaigns(params);
      setCampaigns(data);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!form.name || !form.message_text) return;
    setCreating(true);
    try {
      await createCampaign(form);
      setShowCreate(false);
      setForm({ name: '', description: '', target_type: 'all', target_tags: [], target_channel: 'facebook', message_type: 'text', message_text: '' });
      fetchCampaigns();
    } catch (err) {
      toast.error('Lỗi tạo chiến dịch: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (id) => {
    if (!confirm('Bạn chắc chắn muốn gửi chiến dịch này?')) return;
    try {
      await sendCampaign(id);
      fetchCampaigns();
    } catch (err) {
      toast.error('Lỗi gửi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSchedule = async (id) => {
    const dateStr = prompt('Nhập thời gian gửi (YYYY-MM-DD HH:mm):');
    if (!dateStr) return;
    try {
      const scheduled_at = new Date(dateStr).toISOString();
      await scheduleCampaign(id, scheduled_at);
      fetchCampaigns();
    } catch (err) {
      toast.error('Lỗi lên lịch: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelCampaign(id);
      fetchCampaigns();
    } catch (err) {
      toast.error('Lỗi huỷ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePreview = async (id) => {
    try {
      const data = await previewCampaign(id);
      setPreview(data);
    } catch (err) {
      toast.error('Lỗi xem trước: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const data = await getCampaign(id);
      setSelectedCampaign(data);
    } catch (err) {
      console.error('Error fetching campaign detail:', err);
    }
  };

  const STATUS_TABS = [
    { label: 'Tất cả', value: '' },
    { label: 'Nháp', value: 'draft' },
    { label: 'Đã lên lịch', value: 'scheduled' },
    { label: 'Đang gửi', value: 'sending' },
    { label: 'Đã gửi', value: 'sent' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-600" />Chiến dịch tin nhắn</h1>
            <p className="text-sm text-slate-500">{campaigns.length} chiến dịch</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tạo chiến dịch
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1 rounded-full text-xs transition ${
                statusFilter === tab.value
                  ? 'bg-blue-50 text-blue-600 border border-blue-500/30'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-900 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">Chưa có chiến dịch nào</p>
            <p className="text-slate-400 text-sm mt-1">Tạo chiến dịch mới để gửi tin nhắn hàng loạt</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {campaigns.map((c) => {
              const st = STATUS_MAP[c.status] || STATUS_MAP.draft;
              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 hover:border-slate-200 transition cursor-pointer"
                  onClick={() => handleViewDetail(c.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-slate-800">{c.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-slate-500 mb-2">{c.description}</p>
                      )}
                      <p className="text-sm text-slate-600 line-clamp-2">{c.message_text}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                        <span>Đối tượng: {c.target_type === 'all' ? 'Tất cả' : c.target_type}</span>
                        {c.sent_count > 0 && <span>Đã gửi: {c.sent_count}</span>}
                        {c.failed_count > 0 && <span className="text-red-500">Lỗi: {c.failed_count}</span>}
                        <span>{new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <>
                          <button
                            onClick={() => handlePreview(c.id)}
                            className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] rounded hover:bg-slate-200 transition flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Xem trước
                          </button>
                          <button
                            onClick={() => handleSend(c.id)}
                            className="px-2 py-1 bg-green-50 text-green-700 text-[11px] rounded hover:bg-green-100 transition flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Gửi ngay
                          </button>
                          <button
                            onClick={() => handleSchedule(c.id)}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] rounded hover:bg-blue-100 transition flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> Lên lịch
                          </button>
                          <button
                            onClick={() => handleCancel(c.id)}
                            className="px-2 py-1 bg-red-50 text-red-600 text-[11px] rounded hover:bg-red-100 transition flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Huỷ
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Tạo chiến dịch mới</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Tên chiến dịch *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
                  placeholder="VD: Khuyến mãi tháng 2"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
                  placeholder="Mô tả ngắn"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Đối tượng</label>
                <select
                  value={form.target_type}
                  onChange={(e) => setForm({ ...form, target_type: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
                >
                  <option value="all">Tất cả khách hàng</option>
                  <option value="channel">Theo kênh</option>
                  <option value="tag">Theo tag</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nội dung tin nhắn *</label>
                <textarea
                  value={form.message_text}
                  onChange={(e) => setForm({ ...form, message_text: e.target.value })}
                  rows={4}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 resize-none"
                  placeholder="Nhập nội dung tin nhắn gửi đến khách hàng..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.name || !form.message_text}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {creating ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Xem trước người nhận</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tổng người nhận:</span>
                <span className="text-slate-800">{preview.totalRecipients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Đủ điều kiện:</span>
                <span className="text-green-600">{preview.eligibleRecipients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Không đủ điều kiện:</span>
                <span className="text-red-600">{preview.ineligibleRecipients}</span>
              </div>
              {preview.warning && (
                <p className="text-xs text-yellow-600 mt-2 p-2 bg-yellow-50 rounded">{preview.warning}</p>
              )}
            </div>
            <button
              onClick={() => setPreview(null)}
              className="w-full mt-4 px-4 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg hover:bg-slate-200 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">{selectedCampaign.name}</h2>
              <button onClick={() => setSelectedCampaign(null)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${(STATUS_MAP[selectedCampaign.status] || STATUS_MAP.draft).color}`}>
                    {(STATUS_MAP[selectedCampaign.status] || STATUS_MAP.draft).label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Tổng:</span>
                  <span className="ml-2 text-slate-800">{selectedCampaign.total_recipients || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500">Đã gửi:</span>
                  <span className="ml-2 text-green-600">{selectedCampaign.sent_count || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500">Lỗi:</span>
                  <span className="ml-2 text-red-600">{selectedCampaign.failed_count || 0}</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Nội dung:</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded p-3">{selectedCampaign.message_text}</p>
              </div>

              {/* Logs */}
              {selectedCampaign.logs?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Nhật ký ({selectedCampaign.logs.length})</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedCampaign.logs.slice(0, 50).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200">
                        <span className="text-slate-600">{log.platform_user_id}</span>
                        <span className={log.status === 'sent' ? 'text-green-600' : log.status === 'failed' ? 'text-red-600' : 'text-slate-500'}>
                          {log.status}
                        </span>
                        {log.error && <span className="text-red-500 text-[10px]">{log.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
