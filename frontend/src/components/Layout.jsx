import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import CustomerInfo from './CustomerInfo';
import EmptyState from './EmptyState';

/**
 * Layout chat — mobile: stack navigation (list → chat → info), desktop: 3 cột
 */
export default function Layout({
  conversations,
  activeConversation,
  messages,
  connected,
  connectedPages,
  onSelectConversation,
  onSendMessage,
  onUpdateStatus,
  onCustomerUpdated,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat' | 'info'

  function handleSelectConversation(conv) {
    onSelectConversation(conv);
    setMobileView('chat');
  }

  return (
    <>
      {/* ===== Mobile: stack navigation (chỉ hiện 1 view) ===== */}
      <div className="md:hidden flex-1 flex flex-col min-h-0">
        {mobileView === 'list' && (
          <Sidebar
            conversations={conversations}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
            onClose={() => {}}
            connectedPages={connectedPages}
          />
        )}

        {mobileView === 'chat' && (
          activeConversation ? (
            <ChatArea
              conversation={activeConversation}
              messages={messages}
              onSend={onSendMessage}
              onBack={() => setMobileView('list')}
              onOpenSidebar={() => setMobileView('list')}
              onOpenCustomer={() => setMobileView('info')}
              onUpdateStatus={onUpdateStatus}
              onConversationUpdated={onCustomerUpdated}
            />
          ) : (
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <EmptyState />
            </div>
          )
        )}

        {mobileView === 'info' && (
          <CustomerInfo
            conversation={activeConversation}
            onClose={() => setMobileView('chat')}
            onBack={() => setMobileView('chat')}
            onUpdated={onCustomerUpdated}
          />
        )}
      </div>

      {/* ===== Desktop: layout 3 cột (giữ nguyên 100%) ===== */}
      <div className="hidden md:flex flex-1 h-full min-h-0 overflow-hidden relative">
        {/* Sidebar (cột trái) */}
        <div className={`
          absolute inset-y-0 left-0 z-30 w-80 transform transition-transform duration-200 ease-out
          md:relative md:translate-x-0 md:flex-shrink-0 md:h-full
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar
            conversations={conversations}
            activeId={activeConversation?.id}
            onSelect={onSelectConversation}
            onClose={() => setSidebarOpen(false)}
            connectedPages={connectedPages}
          />
        </div>
        {sidebarOpen && (
          <div className="absolute inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Chat Area (cột giữa) */}
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={messages}
            onSend={onSendMessage}
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenCustomer={() => setCustomerOpen(true)}
            onUpdateStatus={onUpdateStatus}
            onConversationUpdated={onCustomerUpdated}
          />
        ) : (
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="md:hidden px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <EmptyState />
          </div>
        )}

        {/* Customer overlay mobile */}
        {customerOpen && (
          <div className="absolute inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setCustomerOpen(false)} />
        )}

        {/* Customer Info (cột phải) */}
        <div className={`
          absolute inset-y-0 right-0 z-30 w-72 transform transition-transform duration-200 ease-out
          lg:relative lg:translate-x-0 lg:flex-shrink-0 lg:h-full
          ${customerOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <CustomerInfo
            conversation={activeConversation}
            onClose={() => setCustomerOpen(false)}
            onUpdated={onCustomerUpdated}
          />
        </div>
      </div>
    </>
  );
}
