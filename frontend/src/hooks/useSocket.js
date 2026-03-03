import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { supabase } from '../lib/supabase';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook kết nối Socket.IO (with auth token for tenant-scoped rooms)
 * Lắng nghe: new_message, message_sent, conversation_updated, new_order, order_status_update, agent_needed, agent_status,
 *            new_comment, campaign_progress, campaign_complete, livestream_comment, livestream_ended
 */
export function useSocket({ onNewMessage, onMessageSent, onConversationUpdated, onNewOrder, onOrderStatusUpdate, onAgentNeeded, onAgentStatus,
  onNewComment, onCampaignProgress, onCampaignComplete, onLivestreamComment, onLivestreamEnded }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket;

    async function connect() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socketRef.current = socket;

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socket.on('new_message', (data) => {
        onNewMessage?.(data);
      });

      socket.on('message_sent', (data) => {
        onMessageSent?.(data);
      });

      socket.on('conversation_updated', (data) => {
        onConversationUpdated?.(data);
      });

      socket.on('new_order', (data) => {
        onNewOrder?.(data);
      });

      socket.on('order_status_update', (data) => {
        onOrderStatusUpdate?.(data);
      });

      socket.on('agent_needed', (data) => {
        onAgentNeeded?.(data);
      });

      socket.on('agent_status', (data) => {
        onAgentStatus?.(data);
      });

      socket.on('new_comment', (data) => {
        onNewComment?.(data);
      });

      socket.on('campaign_progress', (data) => {
        onCampaignProgress?.(data);
      });

      socket.on('campaign_complete', (data) => {
        onCampaignComplete?.(data);
      });

      socket.on('livestream_comment', (data) => {
        onLivestreamComment?.(data);
        // Also dispatch custom event for LivestreamPage
        window.dispatchEvent(new CustomEvent('livestream_comment', { detail: data }));
      });

      socket.on('livestream_ended', (data) => {
        onLivestreamEnded?.(data);
      });
    }

    connect();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { socket: socketRef.current, connected };
}
