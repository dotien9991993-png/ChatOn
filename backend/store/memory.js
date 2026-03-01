const { v4: uuidv4 } = require('uuid');

/**
 * In-memory database
 * Dùng Map để lưu conversations + messages
 * Sau này thay bằng MongoDB / PostgreSQL
 */

// Map<conversationId, ConversationObject>
const conversations = new Map();

// Map<senderId, conversationId> — index nhanh theo Facebook PSID
const senderIndex = new Map();

// ========================
// CONVERSATIONS
// ========================

/**
 * Lấy tất cả conversations, sort theo lastMessageAt mới nhất
 */
function getAll() {
  const list = Array.from(conversations.values());
  list.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  return list;
}

/**
 * Lấy 1 conversation theo ID (kèm messages)
 */
function getById(id) {
  return conversations.get(id) || null;
}

/**
 * Tìm hoặc tạo conversation theo Facebook sender ID
 * profile: { name, avatar }
 */
function getOrCreate(senderId, profile = {}) {
  // Đã tồn tại → cập nhật profile nếu có thông tin mới
  if (senderIndex.has(senderId)) {
    const convId = senderIndex.get(senderId);
    const conv = conversations.get(convId);
    if (profile.name) conv.name = profile.name;
    if (profile.avatar) conv.avatar = profile.avatar;
    return { conversation: conv, isNew: false };
  }

  // Tạo mới
  const conv = {
    id: uuidv4(),
    senderId,                              // Facebook PSID
    name: profile.name || 'Khách hàng',
    avatar: profile.avatar || null,
    channel: 'facebook',
    phone: '',
    notes: '',
    status: 'active',                      // active | resolved | spam
    lastMessage: '',
    lastMessageAt: new Date().toISOString(),
    unread: 0,
    messages: [],
    createdAt: new Date().toISOString(),
  };

  conversations.set(conv.id, conv);
  senderIndex.set(senderId, conv.id);

  return { conversation: conv, isNew: true };
}

// ========================
// MESSAGES
// ========================

/**
 * Thêm tin nhắn vào conversation
 * msg: { from, text, type }
 * from: 'customer' | 'agent'
 */
function addMessage(conversationId, msg) {
  const conv = conversations.get(conversationId);
  if (!conv) return null;

  const message = {
    id: uuidv4(),
    from: msg.from,           // 'customer' hoặc 'agent'
    text: msg.text,
    type: msg.type || 'text',
    timestamp: new Date().toISOString(),
    status: msg.from === 'agent' ? 'sent' : undefined,
  };

  conv.messages.push(message);
  conv.lastMessage = msg.text;
  conv.lastMessageAt = message.timestamp;

  // Tăng unread nếu khách gửi
  if (msg.from === 'customer') {
    conv.unread += 1;
  }

  return message;
}

/**
 * Đánh dấu đã đọc
 */
function markAsRead(conversationId) {
  const conv = conversations.get(conversationId);
  if (conv) {
    conv.unread = 0;
  }
  return conv;
}

/**
 * Cập nhật thông tin conversation (phone, notes, status)
 */
function update(conversationId, data) {
  const conv = conversations.get(conversationId);
  if (!conv) return null;

  if (data.phone !== undefined) conv.phone = data.phone;
  if (data.notes !== undefined) conv.notes = data.notes;
  if (data.status !== undefined) conv.status = data.status;

  return conv;
}

module.exports = {
  getAll,
  getById,
  getOrCreate,
  addMessage,
  markAsRead,
  update,
};
