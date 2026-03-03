import React, { useState } from 'react';
import { formatMessageTime } from '../utils/formatTime';
import { Bot, Check, StickyNote, X } from 'lucide-react';

/**
 * 1 tin nhắn trong chat
 * - Khách (from: 'customer'): bubble trái, nền white với shadow
 * - Mình (from: 'agent'): bubble phải, bg blue-600, rounded-2xl
 * - AI (from: 'ai'): bubble phải, bg violet-50 với border, Bot badge
 * - System (from: 'system'): center, nền slate-50
 * - Internal note (type: 'internal_note'): center, amber bg, italic
 * - Welcome (type: 'welcome'): center, blue-50 bg
 */
export default function MessageBubble({ message, avatar, customerName }) {
  const [lightbox, setLightbox] = useState(false);
  const isAgent = message.from === 'agent';
  const isAI = message.from === 'ai' || message.ai_generated;
  const isSystem = message.from === 'system' || message.type === 'system';
  const isNote = message.type === 'internal_note';
  const isWelcome = message.type === 'welcome';
  const isRight = isAgent || isAI;
  const hasImage = !!message.media_url;

  // Internal note — center aligned, amber styling
  if (isNote) {
    return (
      <div className="flex justify-center py-1">
        <div className="max-w-[80%] bg-amber-50 border border-amber-200 rounded-xl px-5 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <StickyNote className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-600">
              {message.author || 'Agent'}
            </span>
          </div>
          <p className="text-xs text-amber-800 italic whitespace-pre-wrap">{message.text}</p>
          <span className="text-[10px] text-amber-400">{formatMessageTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  // Welcome message — center aligned, blue styling
  if (isWelcome) {
    return (
      <div className="flex justify-center py-1">
        <div className="max-w-[80%] bg-blue-50 border border-blue-200 rounded-full px-5 py-2 text-center">
          <p className="text-xs text-blue-600 whitespace-pre-wrap">{message.text}</p>
          <span className="text-[10px] text-blue-400">{formatMessageTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

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
    <>
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
              text-sm leading-relaxed overflow-hidden
              ${hasImage && !message.text ? 'p-1' : 'px-4 py-2.5'}
              ${isAI
                ? 'bg-violet-50 border border-violet-200 text-slate-800 rounded-2xl rounded-br-md'
                : isAgent
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                  : 'bg-white border border-slate-200 shadow-sm text-slate-800 rounded-2xl rounded-bl-md'
              }
            `}
          >
            {/* Image */}
            {hasImage && (
              <img
                src={message.media_url}
                alt=""
                className={`max-w-full rounded-xl cursor-pointer hover:opacity-90 transition ${
                  message.text ? 'mb-2' : ''
                }`}
                style={{ maxHeight: '240px' }}
                onClick={() => setLightbox(true)}
                loading="lazy"
              />
            )}

            {/* Text */}
            {message.text && (
              <p className={`whitespace-pre-wrap break-words ${hasImage ? 'px-2 pb-1' : ''}`}>{message.text}</p>
            )}

            <div className={`flex items-center gap-1 mt-1 ${isRight ? 'justify-end' : ''} ${hasImage && !message.text ? 'px-2 pb-1' : ''}`}>
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

      {/* Lightbox */}
      {lightbox && hasImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={message.media_url}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
