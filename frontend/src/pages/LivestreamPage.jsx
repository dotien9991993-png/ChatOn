import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Video, Play, Square, ChevronRight, X } from 'lucide-react';
import {
  getLivestreams, getLivestreamDetail, startLivestream,
  stopLivestream, getLivestreamComments,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../contexts/ToastContext';

export default function LivestreamPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [comments, setComments] = useState([]);
  const [showSetup, setShowSetup] = useState(false);

  // Setup form
  const [fbVideoId, setFbVideoId] = useState('');
  const [title, setTitle] = useState('');
  const [orderSyntax, setOrderSyntax] = useState([]);
  const [syntaxRow, setSyntaxRow] = useState({ keyword: '', product_name: '', price: '' });
  const [starting, setStarting] = useState(false);

  const commentsEndRef = useRef(null);

  // Socket for real-time comments
  useSocket({
    onNewMessage: null,
    onMessageSent: null,
    onConversationUpdated: null,
    onNewOrder: null,
    onOrderStatusUpdate: null,
    onAgentNeeded: null,
    onAgentStatus: null,
  });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLivestreams();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching livestreams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Listen for real-time livestream comments via socket
  useEffect(() => {
    if (!activeSession) return;

    const handleComment = (event) => {
      if (event.detail?.livestreamId === activeSession.id) {
        setComments((prev) => [...prev, event.detail.comment]);
      }
    };

    window.addEventListener('livestream_comment', handleComment);
    return () => window.removeEventListener('livestream_comment', handleComment);
  }, [activeSession]);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleViewSession = async (id) => {
    try {
      const data = await getLivestreamDetail(id);
      setActiveSession(data);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching livestream detail:', err);
    }
  };

  const handleStart = async () => {
    if (!fbVideoId) return;
    setStarting(true);
    try {
      const data = await startLivestream({ fb_video_id: fbVideoId, title: title || 'Livestream', order_syntax: orderSyntax });
      setShowSetup(false);
      setActiveSession(data);
      setComments([]);
      setFbVideoId('');
      setTitle('');
      setOrderSyntax([]);
      fetchSessions();
    } catch (err) {
      toast.error('Lỗi bắt đầu: ' + (err.response?.data?.error || err.message));
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    if (!confirm('Bạn chắc chắn muốn kết thúc livestream?')) return;
    try {
      await stopLivestream(activeSession.id);
      setActiveSession((prev) => ({ ...prev, status: 'ended' }));
      fetchSessions();
    } catch (err) {
      toast.error('Lỗi kết thúc: ' + (err.response?.data?.error || err.message));
    }
  };

  const addSyntaxRow = () => {
    if (!syntaxRow.keyword) return;
    setOrderSyntax([...orderSyntax, { ...syntaxRow, price: Number(syntaxRow.price) || 0 }]);
    setSyntaxRow({ keyword: '', product_name: '', price: '' });
  };

  const removeSyntaxRow = (idx) => {
    setOrderSyntax(orderSyntax.filter((_, i) => i !== idx));
  };

  // Stats from active session
  const orderComments = comments.filter((c) => c.is_order);
  const totalRevenue = orderComments.reduce((sum, c) => {
    const syntax = (activeSession?.order_syntax || []).find((s) => s.keyword?.toUpperCase() === c.matched_keyword?.toUpperCase());
    return sum + (syntax?.price || 0) * (c.quantity || 1);
  }, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Video className="w-5 h-5 text-blue-600" />Livestream bán hàng</h1>
            <p className="text-sm text-slate-500">
              {activeSession ? (activeSession.status === 'live' ? 'Đang phát trực tiếp' : 'Đã kết thúc') : `${sessions.length} phiên`}
            </p>
          </div>
          <div className="flex gap-2">
            {activeSession && (
              <button
                onClick={() => { setActiveSession(null); setComments([]); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
              >
                Quay lại
              </button>
            )}
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Bắt đầu Livestream
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeSession ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Comment stream */}
          <div className="flex-1 flex flex-col border-r border-slate-200">
            {/* Stats bar */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-6">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">{comments.length}</p>
                <p className="text-[10px] text-slate-500">Bình luận</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{orderComments.length}</p>
                <p className="text-[10px] text-slate-500">Đơn hàng</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">
                  {totalRevenue.toLocaleString('vi-VN')}đ
                </p>
                <p className="text-[10px] text-slate-500">Doanh thu</p>
              </div>
              {activeSession.status === 'live' && (
                <button
                  onClick={handleStop}
                  className="ml-auto px-3 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100 transition flex items-center gap-1"
                >
                  <Square className="w-3 h-3" /> Kết thúc
                </button>
              )}
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-500">Đang chờ bình luận...</p>
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className={`flex items-start gap-2 p-2 rounded-lg ${
                      c.is_order ? 'bg-green-50 border border-green-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-medium flex-shrink-0">
                      {(c.user_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">{c.user_name}</span>
                        {c.is_order && (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] rounded font-medium">
                            ĐƠN HÀNG: {c.matched_keyword} x{c.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{c.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>

          {/* Right: Order panel */}
          <div className="w-72 flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Đơn hàng từ livestream</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {orderComments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Chưa có đơn nào</p>
              ) : (
                orderComments.map((c, idx) => {
                  const syntax = (activeSession.order_syntax || []).find(
                    (s) => s.keyword?.toUpperCase() === c.matched_keyword?.toUpperCase()
                  );
                  return (
                    <div key={c.id || idx} className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-800">{c.user_name}</span>
                        <span className="text-[10px] text-green-600 font-medium">
                          {((syntax?.price || 0) * (c.quantity || 1)).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {c.matched_product_name || c.matched_keyword} x{c.quantity}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order syntax reference */}
            <div className="px-4 py-3 border-t border-slate-200">
              <p className="text-[10px] text-slate-400 mb-1">Cú pháp đặt hàng:</p>
              {(activeSession.order_syntax || []).map((s, i) => (
                <p key={i} className="text-[11px] text-slate-500">
                  {s.keyword} = {s.product_name} ({(s.price || 0).toLocaleString('vi-VN')}đ)
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Session list */
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">Chưa có phiên livestream nào</p>
              <p className="text-slate-400 text-sm mt-1">Bắt đầu livestream để bán hàng trực tiếp</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 hover:border-slate-200 transition cursor-pointer"
                  onClick={() => handleViewSession(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-slate-800">{s.title || 'Livestream'}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          s.status === 'live'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.status === 'live' ? 'LIVE' : 'Đã kết thúc'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{s.total_comments || 0} bình luận</span>
                        <span>{s.total_orders || 0} đơn hàng</span>
                        <span>{new Date(s.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setup Livestream Modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Thiết lập Livestream</h2>
              <button onClick={() => setShowSetup(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Facebook Video ID *</label>
                <input
                  type="text"
                  value={fbVideoId}
                  onChange={(e) => setFbVideoId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
                  placeholder="VD: 123456789012345"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Tiêu đề</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
                  placeholder="VD: Sale cuối tuần - Giảm 50%"
                />
              </div>

              {/* Order syntax table */}
              <div>
                <label className="block text-xs text-slate-600 mb-2">Cú pháp đặt hàng</label>
                {orderSyntax.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {orderSyntax.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="text-blue-600 font-mono">{row.keyword}</span>
                        <span className="text-slate-500">=</span>
                        <span className="text-slate-800">{row.product_name}</span>
                        <span className="text-slate-500">({(row.price || 0).toLocaleString('vi-VN')}đ)</span>
                        <button onClick={() => removeSyntaxRow(idx)} className="text-red-500 hover:text-red-400 ml-auto">x</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={syntaxRow.keyword}
                    onChange={(e) => setSyntaxRow({ ...syntaxRow, keyword: e.target.value })}
                    placeholder="VD: SP01"
                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  />
                  <input
                    type="text"
                    value={syntaxRow.product_name}
                    onChange={(e) => setSyntaxRow({ ...syntaxRow, product_name: e.target.value })}
                    placeholder="Tên sản phẩm"
                    className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  />
                  <input
                    type="number"
                    value={syntaxRow.price}
                    onChange={(e) => setSyntaxRow({ ...syntaxRow, price: e.target.value })}
                    placeholder="Giá"
                    className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  />
                  <button
                    onClick={addSyntaxRow}
                    disabled={!syntaxRow.keyword}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSetup(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleStart}
                  disabled={starting || !fbVideoId}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {starting ? 'Đang bắt đầu...' : (
                    <>
                      <Play className="w-4 h-4" />
                      Bắt đầu LIVE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
