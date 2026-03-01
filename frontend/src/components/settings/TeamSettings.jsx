import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Quản lý team trong trang Cài đặt
 */
export default function TeamSettings({ showToast }) {
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', displayName: '', role: 'agent' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await api.getTeamMembers();
      setMembers(data);
    } catch (err) {
      showToast?.('Lỗi tải danh sách team', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      const result = await api.inviteTeamMember(inviteForm);
      showToast?.(`Đã mời ${inviteForm.email}. Mật khẩu tạm: ${result.member?.tempPassword}`);
      setInviteOpen(false);
      setInviteForm({ email: '', displayName: '', role: 'agent' });
      loadMembers();
    } catch (err) {
      showToast?.('Lỗi mời: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId, newRole) {
    try {
      await api.changeTeamRole(memberId, newRole);
      showToast?.('Đã cập nhật role');
      loadMembers();
    } catch (err) {
      showToast?.('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    }
  }

  async function handleRemove(memberId, memberName) {
    if (!window.confirm(`Xóa ${memberName} khỏi team?`)) return;
    try {
      await api.removeTeamMember(memberId);
      showToast?.('Đã xóa thành viên');
      loadMembers();
    } catch (err) {
      showToast?.('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    }
  }

  const canManage = profile?.role === 'owner' || profile?.role === 'admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý nhân viên</h2>
          <p className="text-sm text-slate-500 mt-1">{members.length} thành viên</p>
        </div>
        {canManage && (
          <button
            onClick={() => setInviteOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition font-medium"
          >
            + Mời thành viên
          </button>
        )}
      </div>

      {/* Invite Form */}
      {inviteOpen && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Mời thành viên mới</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Email *</label>
              <input
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Tên hiển thị</label>
              <input
                value={inviteForm.displayName}
                onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Vai trò</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteForm.email}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {inviting ? 'Đang mời...' : 'Mời'}
            </button>
            <button
              onClick={() => setInviteOpen(false)}
              className="px-4 py-1.5 border border-slate-300 text-sm text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Đang tải...</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {(m.name || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-800 font-medium">{m.name}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] ${m.online ? 'text-green-600' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.online ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {m.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>

              {/* Role badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                m.role === 'owner' ? 'bg-amber-50 text-amber-600' :
                m.role === 'admin' ? 'bg-violet-50 text-violet-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {m.role}
              </span>

              {/* Actions */}
              {canManage && m.id !== profile?.id && m.role !== 'owner' && (
                <div className="flex gap-1 flex-shrink-0">
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.id, e.target.value)}
                    className="bg-white text-xs text-slate-700 rounded px-2 py-1 outline-none border border-slate-200"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRemove(m.id, m.name)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-500 hover:bg-slate-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
