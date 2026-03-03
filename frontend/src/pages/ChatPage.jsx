import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { useSocket } from '../hooks/useSocket';
import * as api from '../services/api';

/**
 * Notification sound — Web Audio API
 */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 830;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1050;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

/**
 * Trang Hộp thư — quản lý chat Facebook Messenger
 */
export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connectedPages, setConnectedPages] = useState([]);

  const activeConvIdRef = useRef(activeConvId);
  activeConvIdRef.current = activeConvId;

  useEffect(() => {
    api.getConversations()
      .then(setConversations)
      .catch((err) => console.error('Lỗi load conversations:', err));
    api.getConnectedPages()
      .then(setConnectedPages)
      .catch(() => {});
  }, []);

  const handleNewMessage = useCallback((data) => {
    const { conversation, message } = data;
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversation.id);
      const updated = idx >= 0
        ? prev.map((c) => (c.id === conversation.id ? { ...c, ...conversation, messageCount: (c.messageCount || 0) + 1 } : c))
        : [{ ...conversation, messageCount: 1 }, ...prev];
      updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      return updated;
    });
    if (activeConvIdRef.current === conversation.id) {
      setMessages((prev) => (prev.find((m) => m.id === message.id) ? prev : [...prev, message]));
    }
    if (activeConvIdRef.current !== conversation.id) playNotificationSound();
  }, []);

  const handleMessageSent = useCallback((data) => {
    const { conversationId, message } = data;
    setConversations((prev) =>
      prev.map((c) => c.id === conversationId ? { ...c, lastMessage: message.text, lastMessageAt: message.timestamp, messageCount: (c.messageCount || 0) + 1 } : c)
    );
    if (activeConvIdRef.current === conversationId) {
      setMessages((prev) => (prev.find((m) => m.id === message.id) ? prev : [...prev, message]));
    }
  }, []);

  const handleConversationUpdated = useCallback((data) => {
    setConversations((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)));
  }, []);

  const { connected } = useSocket({
    onNewMessage: handleNewMessage,
    onMessageSent: handleMessageSent,
    onConversationUpdated: handleConversationUpdated,
  });

  async function selectConversation(convId) {
    setActiveConvId(convId);
    try {
      const data = await api.getConversation(convId);
      setMessages(data.messages || []);
      api.markAsRead(convId).catch(() => {});
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread: 0, messageCount: data.messageCount } : c)));
    } catch (err) {
      console.error('Lỗi load messages:', err);
    }
  }

  async function sendMessage(text, imageUrl) {
    if (!activeConvId) return;
    await api.sendMessage(activeConvId, text || null, imageUrl || null);
  }

  async function updateStatus(status) {
    if (!activeConvId) return;
    try {
      await api.updateConversation(activeConvId, { status });
      setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, status } : c)));
    } catch (err) {
      console.error('Lỗi cập nhật status:', err);
    }
  }

  function handleCustomerUpdated(data) {
    setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, ...data } : c)));
  }

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  return (
    <Layout
      conversations={conversations}
      activeConversation={activeConversation}
      messages={messages}
      connected={connected}
      connectedPages={connectedPages}
      onSelectConversation={selectConversation}
      onSendMessage={sendMessage}
      onUpdateStatus={updateStatus}
      onCustomerUpdated={handleCustomerUpdated}
    />
  );
}
