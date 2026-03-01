import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, RefreshCw, Search, Reply, Mail, Eye, EyeOff } from 'lucide-react';
import {
  getComments, getCommentPosts, replyComment, hideComment,
  unhideComment, privateReplyComment, syncComments,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function CommentsPage() {
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [postList, setPostList] = useState([]);

  // Filters
  const [selectedPostId, setSelectedPostId] = useState('');
  const [filterReply, setFilterReply] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterHidden, setFilterHidden] = useState('');
  const [search, setSearch] = useState('');

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPostId, setSyncPostId] = useState('');

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getCommentPosts();
      setPostList(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (selectedPostId) params.post_id = selectedPostId;
      if (filterReply) params.is_replied = filterReply;
      if (filterPhone === 'true') params.has_phone = 'true';
      if (filterHidden) params.is_hidden = filterHidden;
      if (search) params.search = search;

      const data = await getComments(params);
      setPosts(data.posts || []);
      setComments(data.comments || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedPostId, filterReply, filterPhone, filterHidden, search]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await replyComment(commentId, replyText);
      setReplyingTo(null);
      setReplyText('');
      fetchComments();
    } catch (err) {
      toast.error('Lỗi trả lời: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleHide = async (commentId) => {
    try {
      await hideComment(commentId);
      fetchComments();
    } catch (err) {
      toast.error('Lỗi ẩn bình luận: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnhide = async (commentId) => {
    try {
      await unhideComment(commentId);
      fetchComments();
    } catch (err) {
      toast.error('Lỗi hiện bình luận: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePrivateReply = async (commentId) => {
    const msg = prompt('Nhập tin nhắn inbox:');
    if (!msg) return;
    try {
      await privateReplyComment(commentId, msg);
      fetchComments();
    } catch (err) {
      toast.error('Lỗi gửi inbox riêng: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSync = async () => {
    if (!syncPostId) return;
    setSyncing(true);
    try {
      const result = await syncComments(syncPostId);
      toast.success(`Đã đồng bộ ${result.synced} bình luận`);
      fetchComments();
    } catch (err) {
      toast.error('Lỗi đồng bộ: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const FILTER_TABS = [
    { label: 'Tất cả', value: '' },
    { label: 'Chưa trả lời', value: 'false', field: 'reply' },
    { label: 'Có SĐT', value: 'true', field: 'phone' },
    { label: 'Đã ẩn', value: 'true', field: 'hidden' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-600" />Quản lý bình luận</h1>
            <p className="text-sm text-slate-500">{total} bình luận</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Post ID để sync..."
              value={syncPostId}
              onChange={(e) => setSyncPostId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 w-48"
            />
            <button
              onClick={handleSync}
              disabled={syncing || !syncPostId}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 inline-block mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Đang sync...' : 'Đồng bộ'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {FILTER_TABS.map((tab) => {
              const isActive =
                (tab.field === 'reply' && filterReply === tab.value) ||
                (tab.field === 'phone' && filterPhone === tab.value) ||
                (tab.field === 'hidden' && filterHidden === tab.value) ||
                (!tab.field && !filterReply && !filterPhone && !filterHidden);

              return (
                <button
                  key={tab.label}
                  onClick={() => {
                    setFilterReply(tab.field === 'reply' ? tab.value : '');
                    setFilterPhone(tab.field === 'phone' ? tab.value : '');
                    setFilterHidden(tab.field === 'hidden' ? tab.value : '');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-500/30'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Post filter */}
          <select
            value={selectedPostId}
            onChange={(e) => { setSelectedPostId(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm text-slate-800"
          >
            <option value="">Tất cả bài viết</option>
            {postList.map((p) => (
              <option key={p.post_id} value={p.post_id}>
                {(p.post_content || p.post_id).slice(0, 50)}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bình luận..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 w-52"
            />
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">Chưa có bình luận nào</p>
            <p className="text-slate-400 text-sm mt-1">Đồng bộ bình luận từ Facebook hoặc kết nối webhook</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {comments.map((c) => (
              <div
                key={c.id}
                className={`bg-white border rounded-lg p-4 shadow-sm ${
                  c.is_hidden ? 'border-red-300 opacity-70' : c.has_phone ? 'border-yellow-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">{c.user_name || 'Unknown'}</span>
                      {c.has_phone && (
                        <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] rounded">
                          SĐT: {c.extracted_phone}
                        </span>
                      )}
                      {c.is_hidden && (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded">Đã ẩn</span>
                      )}
                      {c.is_replied && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded">Đã trả lời</span>
                      )}
                      {c.auto_hidden && (
                        <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[10px] rounded">Tự động ẩn</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {c.created_time ? new Date(c.created_time).toLocaleString('vi-VN') : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setReplyingTo(c.comment_id); setReplyText(''); }}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                      title="Trả lời"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePrivateReply(c.comment_id)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-400 transition"
                      title="Inbox riêng"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    {c.is_hidden ? (
                      <button
                        onClick={() => handleUnhide(c.comment_id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-green-400 transition"
                        title="Hiện lại"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleHide(c.comment_id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-400 transition"
                        title="Ẩn bình luận"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reply input */}
                {replyingTo === c.comment_id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Nhập phản hồi..."
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleReply(c.comment_id); }}
                    />
                    <button
                      onClick={() => handleReply(c.comment_id)}
                      disabled={sending || !replyText.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 transition"
                    >
                      {sending ? '...' : 'Gửi'}
                    </button>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm rounded-lg transition"
                    >
                      Huỷ
                    </button>
                  </div>
                )}

                {/* Show reply sent */}
                {c.reply_sent && (
                  <div className="mt-2 pl-4 border-l-2 border-blue-300">
                    <p className="text-xs text-slate-500">Đã trả lời:</p>
                    <p className="text-sm text-blue-600">{c.reply_sent}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded disabled:opacity-40 text-sm hover:bg-slate-200 transition"
            >
              Trước
            </button>
            <span className="text-sm text-slate-500">
              Trang {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded disabled:opacity-40 text-sm hover:bg-slate-200 transition"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
