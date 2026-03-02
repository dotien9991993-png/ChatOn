import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import SettingsSidebar from './SettingsSidebar';
import ChannelSettings from './ChannelSettings';
import AISettings from './AISettings';
import ChatbotRulesSettings from './ChatbotRulesSettings';
import DripCampaignSettings from './DripCampaignSettings';
import SegmentsSettings from './SegmentsSettings';
import OrderSettings from './OrderSettings';
import QuickRepliesSettings from './QuickRepliesSettings';
import AccountSettings from './AccountSettings';
import ShopSettings from './ShopSettings';
import TeamSettings from './TeamSettings';
import CommentSettings from './CommentSettings';
import BillingSettings from './BillingSettings';
import NotificationSettings from './NotificationSettings';

/**
 * Layout trang Cài đặt: sidebar trái + nội dung phải
 */
export default function SettingsLayout({ settings, onSettingsChange, showToast }) {
  const [activeSection, setActiveSection] = useState('channels');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sectionComponents = {
    channels: ChannelSettings,
    ai: AISettings,
    chatbot_rules: ChatbotRulesSettings,
    drip_campaigns: DripCampaignSettings,
    segments: SegmentsSettings,
    oms: OrderSettings,
    quick_replies: QuickRepliesSettings,
    comments: CommentSettings,
    team: TeamSettings,
    account: AccountSettings,
    shop: ShopSettings,
    billing: BillingSettings,
    notifications: NotificationSettings,
  };

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Sidebar */}
      <div className={`
        absolute inset-y-0 left-0 z-30 w-56 transform transition-transform duration-200
        md:relative md:translate-x-0 md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SettingsSidebar
          activeSection={activeSection}
          onSelect={setActiveSection}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      {sidebarOpen && (
        <div className="absolute inset-0 z-20 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Nội dung */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {/* Mobile: nút mở sidebar */}
        <div className="md:hidden px-4 py-3 border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm">
            <Menu className="w-5 h-5" />
            Menu cài đặt
          </button>
        </div>

        <div className="p-6 max-w-4xl">
          {ActiveComponent && (
            <ActiveComponent
              settings={settings}
              onSettingsChange={onSettingsChange}
              showToast={showToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}
