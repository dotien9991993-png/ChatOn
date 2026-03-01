import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * Hiển thị khi chưa chọn conversation nào
 */
export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Icon chat */}
      <div className="w-28 h-28 rounded-full bg-blue-100 flex items-center justify-center mb-6 shadow-inner">
        <MessageSquare className="w-14 h-14 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        Chọn cuộc hội thoại để bắt đầu
      </h3>
      <p className="text-sm text-slate-400 text-center max-w-xs">
        Tin nhắn từ Facebook Messenger sẽ hiện ở sidebar bên trái khi có khách nhắn tin
      </p>
      <div className="mt-6 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
        <span className="text-amber-600 text-xs font-medium">Mẹo:</span>
        <span className="text-xs text-amber-700">Kết nối Facebook Page để nhận tin nhắn</span>
      </div>
    </div>
  );
}
