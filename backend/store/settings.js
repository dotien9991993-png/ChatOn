/**
 * Settings store — lưu in-memory (sau chuyển DB)
 * Cấu trúc: channels, ai, oms, account, shop
 */

// OAuth session tạm (lưu user token sau khi login, trước khi chọn page)
let oauthSession = null;

const settings = {
  channels: {
    facebook: {
      connected: true,
      pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
      appSecret: process.env.FB_APP_SECRET || '',
      verifyToken: process.env.FB_VERIFY_TOKEN || 'hoangnam_verify_2024',
      pageId: '',
      pageName: 'Hoàng Nam Audio',
      pagePicture: '',
      webhookUrl: '',
      messageCount: 1247,
      connectedAt: '2026-02-01T08:00:00.000Z',
      tokenExpiresAt: null,
      oauthConnected: false,
    },
    zalo: {
      connected: false,
      oaAccessToken: '',
      oaSecretKey: '',
      webhookUrl: '',
      oaName: '',
      connectedAt: null,
    },
    tiktok: {
      connected: false,
      clientKey: '',
      clientSecret: '',
      webhookUrl: '',
      connectedAt: null,
    },
    instagram: {
      connected: false,
      pageAccessToken: '',
      businessAccountId: '',
      webhookUrl: '',
      connectedAt: null,
    },
  },
  ai: {
    enabled: true,
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    systemPrompt: `Bạn là nhân viên tư vấn bán hàng của Hoàng Nam Audio — chuyên thiết bị âm thanh karaoke chính hãng.

NGUYÊN TẮC:
1. Trả lời thân thiện, tự nhiên như nhân viên thật
2. Tư vấn dựa trên thông tin sản phẩm thực tế
3. Luôn hỏi diện tích phòng, budget, mục đích sử dụng
4. Gợi ý combo tiết kiệm khi phù hợp
5. Thu thập Tên, SĐT, Địa chỉ khi khách muốn mua
6. Nếu không biết → chuyển cho nhân viên: "Em chuyển cho bộ phận chuyên môn hỗ trợ anh/chị nhé!"
7. Hotline: 0373 358 777
8. Website: hoangnamaudio.vn`,
    maxMessagesPerMinute: 30,
    tone: 'friendly', // friendly | professional | humorous | custom
  },
  oms: {
    apiUrl: 'https://in.hoangnamaudio.vn/api/external/orders',
    apiKey: '',
    callbackUrl: '',
    autoSync: true,
    requireConfirmation: false,
    fieldMapping: {
      customer_name: 'ten_khach_hang',
      customer_phone: 'so_dien_thoai',
      address: 'dia_chi',
      items: 'san_pham',
      total_amount: 'tong_tien',
      channel: 'nguon',
      note: 'ghi_chu',
    },
  },
  account: {
    displayName: 'Hoàng Nam Audio Admin',
    email: 'admin@hoangnamaudio.vn',
    verifySignature: true,
    rateLimiting: true,
    twoFactorAuth: false,
    apiKeys: ['hna-api-demo-key-xxxxx'],
    staff: [
      { id: '1', name: 'Admin', email: 'admin@hoangnamaudio.vn', role: 'owner' },
      { id: '2', name: 'Nhân viên 1', email: 'nv1@hoangnamaudio.vn', role: 'agent' },
    ],
  },
  shop: {
    name: 'Hoàng Nam Audio',
    hotline: '0373 358 777',
    email: 'hotro@hoangnamaudio.vn',
    website: 'https://hoangnamaudio.vn',
    address: '123 Nguyễn Thị Minh Khai, Q.1, TP.HCM',
    hours: { open: '08:00', close: '21:00' },
    policies: {
      shipping: 'Miễn phí giao hàng toàn quốc. Nội thành HCM nhận trong 24h. Tỉnh 2-3 ngày. Ship COD.',
      warranty: 'Bảo hành đổi mới 6 tháng. Bảo hành chính hãng 12 tháng. Hỗ trợ kỹ thuật trọn đời.',
      returns: 'Đổi trả trong 7 ngày nếu lỗi từ nhà sản xuất. Hoàn tiền 100% nếu sản phẩm lỗi.',
    },
    showrooms: [
      { id: '1', address: '123 Nguyễn Thị Minh Khai, Q.1, TP.HCM' },
      { id: '2', address: '456 Lê Văn Sỹ, Q.3, TP.HCM' },
    ],
  },
  // Dữ liệu sản phẩm demo
  products: [
    { name: 'Micro 7Acoustic G9 Plus', price: 3900000, category: 'Micro' },
    { name: 'Vang số 7Acoustic Z1000', price: 4500000, category: 'Vang số' },
    { name: 'Combo HN05 (4 thiết bị)', price: 9900000, category: 'Combo' },
    { name: 'Loa JBL Pasion 10 (đôi)', price: 7500000, category: 'Loa' },
    { name: 'Đẩy AAP D-2600', price: 3800000, category: 'Cục đẩy' },
    { name: 'Vang số AAP K-9800 II Plus', price: 4500000, category: 'Vang số' },
    { name: 'Micro AAP K-800 II', price: 2900000, category: 'Micro' },
    { name: 'Loa JBL KP6012 (đôi)', price: 12000000, category: 'Loa' },
    { name: 'Sub hơi AAP SW-18', price: 6500000, category: 'Sub' },
    { name: 'Đẩy AAP STD-18004', price: 8500000, category: 'Cục đẩy' },
    { name: 'Micro AAP K-900 II (2 tay)', price: 4200000, category: 'Micro' },
    { name: 'Loa kéo JBZ NE-108', price: 2800000, category: 'Loa kéo' },
    { name: 'Combo HN03 (3 thiết bị)', price: 7900000, category: 'Combo' },
    { name: 'Combo HN07 (5 thiết bị)', price: 14900000, category: 'Combo' },
    { name: 'Vang số AAP K-9900', price: 6800000, category: 'Vang số' },
  ],
};

function getAll() {
  // Trả về bản copy, mask các token nhạy cảm
  return JSON.parse(JSON.stringify(settings));
}

function getSection(section) {
  return settings[section] ? JSON.parse(JSON.stringify(settings[section])) : null;
}

function updateChannel(channel, data) {
  if (!settings.channels[channel]) return null;
  Object.assign(settings.channels[channel], data);
  // Cập nhật process.env nếu là Facebook
  if (channel === 'facebook') {
    if (data.pageAccessToken) process.env.FB_PAGE_ACCESS_TOKEN = data.pageAccessToken;
    if (data.appSecret) process.env.FB_APP_SECRET = data.appSecret;
    if (data.verifyToken) process.env.FB_VERIFY_TOKEN = data.verifyToken;
  }
  return settings.channels[channel];
}

function disconnectChannel(channel) {
  if (!settings.channels[channel]) return null;
  const ch = settings.channels[channel];
  // Reset tokens
  Object.keys(ch).forEach((key) => {
    if (key === 'connected') ch[key] = false;
    else if (key === 'connectedAt') ch[key] = null;
    else if (typeof ch[key] === 'string' && key !== 'webhookUrl' && key !== 'verifyToken') ch[key] = '';
  });
  return ch;
}

function updateAI(data) {
  Object.assign(settings.ai, data);
  return settings.ai;
}

function updateOMS(data) {
  Object.assign(settings.oms, data);
  return settings.oms;
}

function updateShop(data) {
  Object.assign(settings.shop, data);
  return settings.shop;
}

function updateAccount(data) {
  Object.assign(settings.account, data);
  return settings.account;
}

function getProducts() {
  return settings.products;
}

function setProducts(products) {
  settings.products = products;
  return settings.products;
}

function getOAuthSession() {
  return oauthSession;
}

function setOAuthSession(data) {
  oauthSession = data;
}

function clearOAuthSession() {
  oauthSession = null;
}

module.exports = {
  getAll,
  getSection,
  updateChannel,
  disconnectChannel,
  updateAI,
  updateOMS,
  updateShop,
  updateAccount,
  getProducts,
  setProducts,
  getOAuthSession,
  setOAuthSession,
  clearOAuthSession,
};
