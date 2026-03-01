import React, { useState, useRef, useEffect } from 'react';
import * as api from '../services/api';
import { Send, Slash, StickyNote, MessageSquare } from 'lucide-react';

/**
 * Ô nhập tin nhắn + nút gửi + quick replies (/)
 * Enter = gửi, Shift+Enter = xuống dòng
 * Hỗ trợ 2 mode: message (gửi khách) và note (ghi chú nội bộ)
 */
export default function MessageInput({ onSend, disabled, conversationId }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [qrFilter, setQrFilter] = useState('');
  const [mode, setMode] = useState('message'); // 'message' | 'note'
  const inputRef = useRef(null);

  // Load quick replies once
  useEffect(() => {
    api.getQuickReplies().then(setQuickReplies).catch(() => {});
  }, []);

  // Focus ô input khi component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [disabled, conversationId]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      if (mode === 'note') {
        await api.sendNote(conversationId, trimmed);
      } else {
        await onSend(trimmed);
      }
      setText('');
      setShowQuickReplies(false);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (showQuickReplies && e.key === 'Escape') {
      setShowQuickReplies(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showQuickReplies && filteredQR.length > 0) {
        selectQuickReply(filteredQR[0]);
      } else {
        handleSend();
      }
    }
  }

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);

    // Check for "/" trigger (only in message mode)
    if (mode === 'message' && val.startsWith('/') && quickReplies.length > 0) {
      setShowQuickReplies(true);
      setQrFilter(val.slice(1).toLowerCase());
    } else {
      setShowQuickReplies(false);
    }
  }

  function selectQuickReply(qr) {
    setText(qr.text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  }

  const filteredQR = quickReplies.filter((qr) =>
    !qrFilter || qr.shortcut.toLowerCase().includes(qrFilter) || qr.text.toLowerCase().includes(qrFilter)
  );

  const isNote = mode === 'note';

  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-white relative">
      {/* Mode toggle bar */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setMode('message')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
            !isNote
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3 h-3" /> Tin nhắn
        </button>
        <button
          onClick={() => setMode('note')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
            isNote
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <StickyNote className="w-3 h-3" /> Ghi chú
        </button>
      </div>

      {/* Quick Replies dropdown */}
      {showQuickReplies && filteredQR.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-10">
          {filteredQR.map((qr, i) => (
            <button
              key={i}
              onClick={() => selectQuickReply(qr)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition border-b border-slate-200 last:border-0"
            >
              <span className="text-xs text-blue-600 font-mono">{qr.shortcut}</span>
              <p className="text-sm text-slate-700 truncate">{qr.text}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={isNote ? 'Ghi chú nội bộ (chỉ nhân viên thấy)...' : 'Nhập tin nhắn... (gõ / cho mẫu nhanh)'}
          disabled={disabled || sending}
          rows={1}
          className={`flex-1 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 outline-none resize-none max-h-28 border transition ${
            isNote
              ? 'border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
              : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
          } disabled:opacity-50`}
          style={{ minHeight: '42px' }}
        />
        {/* Nút gửi */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className={`flex-shrink-0 w-11 h-11 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md ${
            isNote
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
        Enter gửi &middot; Shift+Enter xuống dòng {!isNote && <><Slash className="w-3 h-3 inline" /> mẫu nhanh</>}
        {isNote && <span className="text-amber-500">Ghi chú chỉ hiện cho nhân viên</span>}
      </p>
    </div>
  );
}
