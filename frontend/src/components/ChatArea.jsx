import React, { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import CreateOrderPanel from './CreateOrderPanel';
import { formatDateDivider } from '../utils/formatTime';
import * as api from '../services/api';
import { Bot, Package, CheckCircle, AlertTriangle, RotateCcw, Info, Menu } from 'lucide-react';

/**
 * Vùng chat chính — header + tin nhắn + input
 * Nhóm tin nhắn theo ngày với divider
 */
export default function ChatArea({
  conversation,
  messages,
  onSend,
  onOpenSidebar,
  onOpenCustomer,
  onUpdateStatus,
  onConversationUpdated,
}) {
  const messagesEndRef = useRef(null);
  const [aiEnabled, setAiEnabled] = useState(conversation?.ai_enabled !== false);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);

  // Sync AI toggle with conversation data
  useEffect(() => {
    setAiEnabled(conversation?.ai_enabled !== false);
  }, [conversation?.id, conversation?.ai_enabled]);

  // Auto scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Toggle AI
  async function toggleAI() {
    const newVal = !aiEnabled;
    setAiEnabled(newVal);
    try {
      await api.updateConversation(conversation.id, { ai_enabled: newVal });
      onConversationUpdated?.({ ai_enabled: newVal });
    } catch (err) {
      setAiEnabled(!newVal); // revert
      console.error('Toggle AI error:', err);
    }
  }

  // Nhóm tin nhắn theo ngày → tạo date dividers
  function getDateKey(timestamp) {
    return new Date(timestamp).toDateString();
  }

  function isNewDay(index) {
    if (index === 0) return true;
    return getDateKey(messages[index].timestamp) !== getDateKey(messages[index - 1].timestamp);
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 min-h-0 relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white flex-shrink-0">
        {/* Nút mở sidebar (mobile) */}
        <button onClick={onOpenSidebar} className="md:hidden text-slate-600 hover:text-slate-900 transition">
          <Menu className="w-5 h-5" />
        </button>

        {/* Avatar + tên */}
        {conversation.avatar ? (
          <img src={conversation.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">
            {(conversation.name || 'K')[0].toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{conversation.name}</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              conversation.status === 'active' ? 'bg-green-500' :
              conversation.status === 'resolved' ? 'bg-slate-500' : 'bg-red-500'
            }`} />
            <span className="text-[11px] text-slate-500 capitalize">{conversation.status}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* AI Toggle */}
          <button
            onClick={toggleAI}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
              aiEnabled
                ? 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
            title={aiEnabled ? 'AI đang bật' : 'AI đang tắt'}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI</span>
            <span className={`w-7 h-4 rounded-full relative transition-colors duration-200 ${aiEnabled ? 'bg-violet-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${aiEnabled ? 'left-3.5' : 'left-0.5'}`} />
            </span>
          </button>

          {/* Create Order */}
          <button
            onClick={() => setOrderPanelOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo đơn</span>
          </button>

          {/* Status buttons */}
          {conversation.status === 'active' && (
            <>
              <button
                onClick={() => onUpdateStatus('resolved')}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đã xong</span>
              </button>
              <button
                onClick={() => onUpdateStatus('spam')}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Spam</span>
              </button>
            </>
          )}
          {conversation.status !== 'active' && (
            <button
              onClick={() => onUpdateStatus('active')}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở lại</span>
            </button>
          )}

          {/* Nút info (mobile) */}
          <button onClick={onOpenCustomer} className="lg:hidden text-slate-600 hover:text-blue-600 ml-1 transition">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Vùng tin nhắn */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
        {messages.map((msg, idx) => (
          <React.Fragment key={msg.id}>
            {/* Date divider */}
            {isNewDay(idx) && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-medium">
                  {formatDateDivider(msg.timestamp)}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            )}
            <MessageBubble
              message={msg}
              avatar={conversation.avatar}
              customerName={conversation.name}
            />
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={onSend} conversationId={conversation.id} />

      {/* Create Order Panel */}
      {orderPanelOpen && (
        <CreateOrderPanel
          conversation={conversation}
          onClose={() => setOrderPanelOpen(false)}
        />
      )}
    </div>
  );
}
