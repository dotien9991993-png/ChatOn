import React from 'react';
import { formatMessageTime } from '../utils/formatTime';
import { Bot, Check } from 'lucide-react';

/**
 * 1 tin nhắn trong chat
 * - Khách (from: 'customer'): bubble trái, nền white với shadow
 * - Mình (from: 'agent'): bubble phải, bg blue-600, rounded-2xl
 * - AI (from: 'ai'): bubble phải, bg violet-50 với border, Bot badge
 * - System (from: 'system'): center, nền slate-50
 */
export default function MessageBubble({ message, avatar, customerName }) {
  const isAgent = message.from === 'agent';
  const isAI = message.from === 'ai' || message.ai_generated;
  const isSystem = message.from === 'system' || message.type === 'system';
  const isRight = isAgent || isAI;

  // System message — center aligned
  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <div className="max-w-[80%] bg-slate-50 border border-slate-200 rounded-full px-5 py-2 text-center">
          <p className="text-xs text-slate-500 whitespace-pre-wrap">{message.text}</p>
          <span className="text-[10px] text-slate-400">{formatMessageTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isRight ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar khách (chỉ hiện bên trái cho customer) */}
      {!isRight && (
        <div className="flex-shrink-0 mb-5">
          {avatar ? (
            <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-semibold">
              {(customerName || 'K')[0].toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div className="relative max-w-[70%]">
        {/* AI badge */}
        {isAI && (
          <span className="absolute -top-2.5 right-2 bg-violet-100 text-violet-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10 flex items-center gap-0.5 border border-violet-200">
            <Bot className="w-2.5 h-2.5" />
            AI
          </span>
        )}

        <div
          className={`
            px-4 py-2.5 text-sm leading-relaxed
            ${isAI
              ? 'bg-violet-50 border border-violet-200 text-slate-800 rounded-2xl rounded-br-md'
              : isAgent
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                : 'bg-white border border-slate-200 shadow-sm text-slate-800 rounded-2xl rounded-bl-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          <div className={`flex items-center gap-1 mt-1 ${isRight ? 'justify-end' : ''}`}>
            <span className={`text-[10px] ${isAI ? 'text-violet-500' : isAgent ? 'text-blue-200' : 'text-slate-500'}`}>
              {formatMessageTime(message.timestamp)}
            </span>
            {isRight && message.status === 'sent' && (
              <Check className={`w-3 h-3 ${isAI ? 'text-violet-500' : 'text-blue-200'}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
