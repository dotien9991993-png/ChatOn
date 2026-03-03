import React, { useState, useEffect } from 'react';
import ConnectionCard from './ConnectionCard';
import FacebookConnectButton from './FacebookConnectButton';
import ZaloConnectButton from './ZaloConnectButton';
import PageSelector from './PageSelector';
import * as api from '../../services/api';
import { Copy, Check } from 'lucide-react';

/**
 * Trang cài đặt kết nối kênh chat
 * Facebook: OAuth flow (giống Harasocial)
 * Các kênh khác: nhập token thủ công
 */
export default function ChannelSettings({ settings, onSettingsChange, showToast }) {
  const channels = settings?.channels || {};

  // Multi-page Facebook state
  const [fbChannels, setFbChannels] = useState([]);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null); // pageId being disconnected

  // Zalo OA state
  const [zaloChannels, setZaloChannels] = useState([]);
  const [zaloDisconnecting, setZaloDisconnecting] = useState(null);
  const [zaloCopied, setZaloCopied] = useState(false);

  // Other channels state
  const [tiktokValues, setTiktokValues] = useState({});
  const [igValues, setIgValues] = useState({});

  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});

  // Sync settings → local state
  useEffect(() => {
    if (channels.tiktok) setTiktokValues(channels.tiktok);
    if (channels.instagram) setIgValues(channels.instagram);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load all channels
  useEffect(() => {
    loadFbChannels();
    loadZaloChannels();
  }, []);

  async function loadFbChannels() {
    try {
      const data = await api.getFacebookTokenStatus();
      setFbChannels(data.channels || []);
    } catch {
      setFbChannels([]);
    }
  }

  async function loadZaloChannels() {
    try {
      const data = await api.getZaloStatus();
      setZaloChannels(data.channels || []);
    } catch {
      setZaloChannels([]);
    }
  }

  // Zalo OA handlers
  async function handleZaloOAuthSuccess() {
    await loadZaloChannels();
    showToast('Kết nối Zalo OA thành công!', 'success');
  }

  async function handleZaloDisconnect(oaId, oaName) {
    if (!window.confirm(`Ngắt kết nối "${oaName}"?`)) return;
    setZaloDisconnecting(oaId);
    try {
      await api.disconnectZaloOA(oaId);
      showToast(`Đã ngắt kết nối ${oaName}`, 'info');
      await loadZaloChannels();
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setZaloDisconnecting(null);
    }
  }

  // OAuth thành công → hiện page selector
  function handleOAuthSuccess() {
    setShowPageSelector(true);
  }

  // Chọn page xong → reload
  async function handlePageConnected() {
    setShowPageSelector(false);
    await loadFbChannels();
    const updated = await api.getSettings();
    onSettingsChange(updated);
  }

  // Ngắt kết nối 1 Facebook Page
  async function handleFbDisconnect(pageId, pageName) {
    if (!window.confirm(`Ngắt kết nối "${pageName}"? Webhook sẽ bị hủy.`)) return;
    setDisconnecting(pageId);
    try {
      await api.disconnectFacebookPage(pageId);
      showToast(`Đã ngắt kết nối ${pageName}`, 'info');
      await loadFbChannels();
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setDisconnecting(null);
    }
  }

  // Lưu config kênh (cho Zalo, TikTok, IG)
  async function handleSave(channel, values) {
    setSaving((p) => ({ ...p, [channel]: true }));
    try {
      await api.updateChannel(channel, values);
      showToast('Đã lưu cài đặt!', 'success');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi lưu: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving((p) => ({ ...p, [channel]: false }));
    }
  }

  // Test kết nối
  async function handleTest(channel) {
    setTesting((p) => ({ ...p, [channel]: true }));
    setTestResults((p) => ({ ...p, [channel]: null }));
    try {
      const result = await api.testChannel(channel);
      setTestResults((p) => ({ ...p, [channel]: result }));
    } catch (err) {
      setTestResults((p) => ({ ...p, [channel]: { success: false, error: err.message } }));
    } finally {
      setTesting((p) => ({ ...p, [channel]: false }));
    }
  }

  // Ngắt kênh khác
  async function handleDisconnect(channel) {
    if (!window.confirm(`Bạn chắc chắn muốn ngắt kết nối ${channel}? Token sẽ bị xóa.`)) return;
    try {
      await api.disconnectChannel(channel);
      showToast('Đã ngắt kết nối', 'info');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  }

  const webhookBase = window.location.hostname === 'localhost'
    ? 'https://your-domain.com'
    : window.location.origin;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Kết nối kênh bán hàng</h2>
      <p className="text-sm text-slate-500 mb-6">Liên kết các trang mạng xã hội để nhận và trả lời tin nhắn khách hàng</p>

      <div className="space-y-5">
        {/* ======== FACEBOOK — Multi-Page Support ======== */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="text-base font-semibold text-slate-800">Facebook Messenger</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${fbChannels.length > 0 ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className={`text-xs font-medium ${fbChannels.length > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {fbChannels.length > 0 ? `${fbChannels.length} Page` : 'Chưa kết nối'}
              </span>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {fbChannels.length > 0 ? (
              <>
                {/* === Danh sách Pages đã kết nối === */}
                <div className="space-y-3">
                  {fbChannels.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      {ch.pagePicture ? (
                        <img src={ch.pagePicture} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                          {ch.pageName?.charAt(0) || 'P'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{ch.pageName || 'Facebook Page'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Page ID: {ch.pageId || '—'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[11px] font-medium ${
                            ch.critical ? 'text-red-600' :
                            ch.warning ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            Token: {ch.daysLeft != null
                              ? `Còn ${ch.daysLeft} ngày`
                              : ch.valid === false
                                ? 'Hết hạn'
                                : 'Vĩnh viễn'}
                          </span>
                          {ch.connectedAt && (
                            <span className="text-[11px] text-slate-400">
                              Kết nối: {new Date(ch.connectedAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleFbDisconnect(ch.pageId, ch.pageName)}
                        disabled={disconnecting === ch.pageId}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition flex-shrink-0"
                      >
                        {disconnecting === ch.pageId ? 'Đang ngắt...' : 'Ngắt'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Token warnings */}
                {fbChannels.some(ch => ch.warning) && (
                  <div className="text-xs px-3 py-2.5 rounded-lg flex items-center gap-2 bg-amber-50 text-amber-600 border border-amber-200">
                    <span>!</span>
                    <span>Có Page sắp hết hạn token. Kết nối lại để gia hạn.</span>
                  </div>
                )}

                {/* Kết nối thêm Page */}
                <div className="flex items-center justify-center pt-2">
                  <FacebookConnectButton
                    onSuccess={handleOAuthSuccess}
                    onError={(err) => showToast(err, 'error')}
                  />
                </div>
              </>
            ) : (
              <>
                {/* === Chưa kết nối: Hiện nút OAuth === */}
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Kết nối Facebook Messenger</h3>
                  <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                    Đăng nhập Facebook và chọn Page để tự động nhận tin nhắn từ khách hàng
                  </p>
                  <FacebookConnectButton
                    onSuccess={handleOAuthSuccess}
                    onError={(err) => showToast(err, 'error')}
                  />
                </div>

                {/* Hướng dẫn */}
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Yêu cầu: Bạn cần có quyền Admin trên Facebook Page muốn kết nối.
                    App sẽ xin quyền <span className="text-slate-500">pages_messaging</span> để nhận và gửi tin nhắn.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ======== ZALO OA — OAuth Flow ======== */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0068ff]">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <span className="text-base font-semibold text-slate-800">Zalo Official Account</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${zaloChannels.length > 0 ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className={`text-xs font-medium ${zaloChannels.length > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {zaloChannels.length > 0 ? `${zaloChannels.length} OA` : 'Chưa kết nối'}
              </span>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {zaloChannels.length > 0 ? (
              <>
                {/* Connected OAs */}
                <div className="space-y-3">
                  {zaloChannels.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      {ch.oaAvatar ? (
                        <img src={ch.oaAvatar} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#0068ff] flex items-center justify-center text-white font-bold text-lg">
                          Z
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{ch.oaName || 'Zalo OA'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">OA ID: {ch.oaId || '—'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[11px] font-medium ${
                            ch.tokenError ? 'text-red-600' :
                            ch.critical ? 'text-red-600' :
                            ch.warning ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {ch.tokenError ? 'Lỗi token' :
                             ch.hoursLeft != null ? `Token: còn ${ch.hoursLeft}h` : 'Token OK'}
                          </span>
                          {ch.connectedAt && (
                            <span className="text-[11px] text-slate-400">
                              Kết nối: {new Date(ch.connectedAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleZaloDisconnect(ch.oaId, ch.oaName)}
                        disabled={zaloDisconnecting === ch.oaId}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition flex-shrink-0"
                      >
                        {zaloDisconnecting === ch.oaId ? 'Đang ngắt...' : 'Ngắt'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Token warnings */}
                {zaloChannels.some(ch => ch.tokenError || ch.critical) && (
                  <div className="text-xs px-3 py-2.5 rounded-lg flex items-center gap-2 bg-red-50 text-red-600 border border-red-200">
                    <span>!</span>
                    <span>Có OA bị lỗi token. Kết nối lại để cập nhật.</span>
                  </div>
                )}

                {/* Webhook URL */}
                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1.5">Webhook URL (cấu hình trong Zalo OA Dashboard)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${webhookBase}/webhook/zalo`}
                      readOnly
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2.5 outline-none font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${webhookBase}/webhook/zalo`);
                        setZaloCopied(true);
                        setTimeout(() => setZaloCopied(false), 2000);
                      }}
                      className="px-3 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition flex items-center gap-1 text-xs"
                    >
                      {zaloCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                </div>

                {/* Connect more */}
                <div className="flex items-center justify-center pt-2">
                  <ZaloConnectButton
                    onSuccess={handleZaloOAuthSuccess}
                    onError={(err) => showToast(err, 'error')}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Not connected: show OAuth button */}
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <span className="text-3xl font-bold text-[#0068ff]">Z</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Kết nối Zalo Official Account</h3>
                  <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                    Đăng nhập Zalo và cấp quyền cho OA để tự động nhận tin nhắn từ khách hàng
                  </p>
                  <ZaloConnectButton
                    onSuccess={handleZaloOAuthSuccess}
                    onError={(err) => showToast(err, 'error')}
                  />
                </div>

                {/* Guide */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sau khi kết nối, cấu hình Webhook URL trong{' '}
                    <a href="https://developers.zalo.me" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Zalo Developer Console
                    </a>:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${webhookBase}/webhook/zalo`}
                      readOnly
                      className="flex-1 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 rounded-lg px-3 py-2 outline-none font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${webhookBase}/webhook/zalo`);
                        setZaloCopied(true);
                        setTimeout(() => setZaloCopied(false), 2000);
                      }}
                      className="px-2.5 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition text-[11px]"
                    >
                      {zaloCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ======== TIKTOK ======== */}
        <ConnectionCard
          icon={<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.18V11.2a4.85 4.85 0 01-3.59-1.57V6.69h3.59z" /></svg>}
          iconBg="bg-black border border-slate-200"
          name="TikTok Shop"
          connected={channels.tiktok?.connected}
          fields={[
            { key: 'clientKey', label: 'Client Key', type: 'password', placeholder: 'Paste client key...' },
            { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Paste client secret...' },
            { key: 'webhookUrl', label: 'Webhook URL', type: 'text', readOnly: true, copyable: true },
          ]}
          values={{ ...tiktokValues, webhookUrl: `${webhookBase}/webhook/tiktok` }}
          onChange={(key, val) => setTiktokValues((p) => ({ ...p, [key]: val }))}
          onSave={() => handleSave('tiktok', tiktokValues)}
          saving={saving.tiktok}
          guideUrl="https://partner.tiktokshop.com/"
          guideSteps={[
            'Truy cập TikTok Partner Center → tạo App',
            'Lấy Client Key + Client Secret',
            'Cấu hình Webhook URL',
            'Paste key vào ô trên → Lưu',
          ]}
        />

        {/* ======== INSTAGRAM ======== */}
        <ConnectionCard
          icon={<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>}
          iconBg="bg-gradient-to-br from-purple-600 to-pink-500"
          name="Instagram DM"
          connected={channels.instagram?.connected}
          fields={[
            { key: 'pageAccessToken', label: 'Page Access Token (dùng chung Facebook App)', type: 'password', placeholder: 'EAABxxxxxxxx...' },
            { key: 'businessAccountId', label: 'Instagram Business Account ID', type: 'text', placeholder: '17841400...' },
            { key: 'webhookUrl', label: 'Webhook URL', type: 'text', readOnly: true, copyable: true },
          ]}
          values={{ ...igValues, webhookUrl: `${webhookBase}/webhook/instagram` }}
          onChange={(key, val) => setIgValues((p) => ({ ...p, [key]: val }))}
          onSave={() => handleSave('instagram', igValues)}
          saving={saving.instagram}
          guideUrl="https://developers.facebook.com/docs/instagram-api/"
          note="Instagram DM API yêu cầu Facebook Business Account và Instagram Professional Account được liên kết."
          guideSteps={[
            'Tạo Facebook App (dùng chung với Messenger)',
            'Thêm sản phẩm Instagram → kết nối Business Account',
            'Generate Page Access Token',
            'Lấy Instagram Business Account ID',
            'Cấu hình Webhook → subscribe instagram_messaging',
          ]}
        />
        {/* ======== LIVECHAT WEBSITE ======== */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-600">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.257.26-2.453.727-3.418" />
                </svg>
              </div>
              <span className="text-base font-semibold text-slate-800">Livechat Website</span>
            </div>
          </div>

          <LivechatSettings
            settings={settings}
            onSettingsChange={onSettingsChange}
            showToast={showToast}
            webhookBase={webhookBase}
          />
        </div>
      </div>

      {/* Page Selector Modal */}
      {showPageSelector && (
        <PageSelector
          connectedPageIds={fbChannels.map(ch => ch.pageId)}
          onConnected={handlePageConnected}
          onClose={() => setShowPageSelector(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

/**
 * Livechat widget settings sub-component
 */
function LivechatSettings({ settings, onSettingsChange, showToast, webhookBase }) {
  const tenantSlug = settings?.shop?.slug || '';
  const livechatConfig = settings?.channels?.livechat?.widget_config || {};
  const [color, setColor] = useState(livechatConfig.color || '#3b82f6');
  const [position, setPosition] = useState(livechatConfig.position || 'right');
  const [welcomeText, setWelcomeText] = useState(livechatConfig.welcome_text || '');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (livechatConfig.color) setColor(livechatConfig.color);
    if (livechatConfig.position) setPosition(livechatConfig.position);
    if (livechatConfig.welcome_text) setWelcomeText(livechatConfig.welcome_text);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const embedCode = `<script src="${webhookBase}/widget/chaton-widget.js" data-tenant="${tenantSlug}"></script>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateChannel('livechat', {
        widget_config: {
          color,
          position,
          welcome_text: welcomeText,
        },
      });
      showToast('Đã lưu cài đặt Livechat!', 'success');
      const updated = await api.getSettings();
      onSettingsChange(updated);
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Embed Code */}
      <div>
        <label className="text-xs text-slate-600 font-medium block mb-1.5">Mã nhúng (dán vào website)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={embedCode}
            readOnly
            className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2.5 outline-none font-mono"
          />
          <button
            onClick={copyEmbed}
            className="px-3 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition flex items-center gap-1 text-xs"
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="text-xs text-slate-600 font-medium block mb-1.5">Màu chủ đạo</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none font-mono"
          />
          <div className="flex gap-2">
            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#000000'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition ${color === c ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Position */}
      <div>
        <label className="text-xs text-slate-600 font-medium block mb-1.5">Vị trí widget</label>
        <div className="flex gap-2">
          <button
            onClick={() => setPosition('right')}
            className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${position === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            Phải
          </button>
          <button
            onClick={() => setPosition('left')}
            className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${position === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            Trái
          </button>
        </div>
      </div>

      {/* Welcome Text */}
      <div>
        <label className="text-xs text-slate-600 font-medium block mb-1.5">Lời chào trên form</label>
        <input
          type="text"
          value={welcomeText}
          onChange={(e) => setWelcomeText(e.target.value)}
          placeholder="VD: Vui lòng nhập thông tin để bắt đầu chat"
          className="w-full bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/40"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition"
      >
        {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
      </button>
    </div>
  );
}
