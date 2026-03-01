require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Demo account credentials
const DEMO_EMAIL = 'demo@hoangnamaudio.vn';
const DEMO_PASSWORD = 'demo123456';
const DEMO_DISPLAY_NAME = 'Hoàng Nam Audio Admin';
const DEMO_SHOP_NAME = 'Hoàng Nam Audio';

// Tenant settings (from old store/settings.js)
const SHOP_INFO = {
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
};

const AI_CONFIG = {
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
  tone: 'friendly',
};

const OMS_CONFIG = {
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
};

const ACCOUNT_CONFIG = {
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
};

const PRODUCTS = [
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
];

// Demo conversations + messages (from old store/seed.js)
const DEMO_CUSTOMERS = [
  {
    senderId: 'fb_100001',
    name: 'Nguyễn Văn Minh',
    phone: '0912345678',
    messages: [
      { from: 'customer', text: 'Chào shop, cho mình hỏi bộ dàn karaoke tầm 15 triệu có những combo nào ạ?', ago: 45 },
      { from: 'agent', text: 'Chào anh Minh! Tầm 15 triệu bên em có combo rất hot:\n- Loa JBL Pasion 10 (đôi)\n- Đẩy AAP D-2600\n- Vang số AAP K-9800 II Plus\n- Micro không dây AAP K-800 II\nTổng combo: 14.900.000đ ạ!', ago: 43 },
      { from: 'customer', text: 'Loa JBL Pasion 10 bass bao nhiêu inch vậy shop?', ago: 40 },
      { from: 'agent', text: 'Bass 25cm (10 inch) ạ anh. Phù hợp phòng 20-30m², hát karaoke cực hay, treble sáng, mid dày ạ.', ago: 38 },
      { from: 'customer', text: 'OK shop, phòng mình khoảng 25m² thì bộ này OK chứ?', ago: 30 },
      { from: 'agent', text: 'Phòng 25m² thì bộ này vừa đẹp luôn anh ơi! Bass 10 inch đủ lực, không bị thiếu bass mà cũng không quá ồn cho hàng xóm. Em tư vấn thêm nếu anh cần lắp đặt thì bên em ship + lắp free trong nội thành nhé!', ago: 28 },
      { from: 'customer', text: 'Mình ở Quận 7, ship lắp free không?', ago: 5 },
    ],
    unread: 1,
    status: 'active',
  },
  {
    senderId: 'fb_100002',
    name: 'Trần Thị Hương',
    phone: '0987654321',
    notes: 'Khách VIP, đã mua loa 2 lần',
    messages: [
      { from: 'customer', text: 'Shop ơi, bên em có micro không dây nào hát hay mà giá tầm 3 triệu không?', ago: 180 },
      { from: 'agent', text: 'Chào chị Hương! Tầm 3 triệu chị tham khảo:\n1. AAP K-800 II: 2.900k — bắt sóng xa, chống hú tốt\n2. BIK BJ-U550: 3.200k — thiết kế sang, pin 8 tiếng\n3. Shure SVX24/PG58: 3.500k — thương hiệu Mỹ, bền bỉ\nChị thích style nào ạ?', ago: 175 },
      { from: 'customer', text: 'AAP K-800 II đi em. Mà nó có bị rè không? Micro cũ nhà chị hay bị rè lắm', ago: 170 },
      { from: 'agent', text: 'AAP K-800 II dùng sóng UHF nên rất ổn định chị ơi, không bị rè hay mất tiếng. Còn có chức năng chống hú tự động nữa. Chị yên tâm nhé!', ago: 168 },
      { from: 'customer', text: 'OK em ship cho chị nha. Chị chuyển khoản trước được không?', ago: 165 },
      { from: 'agent', text: 'Dạ được ạ! Em gửi thông tin TK:\nVietcombank: 0123456789\nCTK: HOANG NAM AUDIO\nNội dung CK: "Huong micro K800"\nChị CK xong báo em ship liền nhé!', ago: 163 },
      { from: 'customer', text: 'Chị CK rồi nha em, kiểm tra giúp chị', ago: 160 },
      { from: 'agent', text: 'Em nhận được rồi ạ! Sẽ đóng gói và ship trong hôm nay. Chị nhận hàng ngày mai nhé. Cảm ơn chị!', ago: 158 },
    ],
    unread: 0,
    status: 'resolved',
  },
  {
    senderId: 'fb_100003',
    name: 'Lê Hoàng Phúc',
    phone: '',
    messages: [
      { from: 'customer', text: 'Cho hỏi vang số AAP K-9800 II Plus giá bao nhiêu?', ago: 120 },
      { from: 'agent', text: 'Chào anh! AAP K-9800 II Plus hiện giá 4.500.000đ ạ. Vang này có:\n- 32bit DSP xử lý âm thanh\n- Chống hú Feedback\n- Bluetooth, Optical, USB\n- 99 preset karaoke\nAnh đang dùng hệ thống loa gì ạ?', ago: 118 },
      { from: 'customer', text: 'Mình đang dùng loa BMB 450, đẩy Jarguar 203N', ago: 100 },
      { from: 'agent', text: 'Bộ loa BMB + đẩy Jarguar là kinh điển rồi anh! Thêm vang K-9800 II Plus vào là hát karaoke lên level mới luôn. Vang này match rất tốt với hệ thống của anh ạ.', ago: 98 },
      { from: 'customer', text: 'Mình đặt 1 cái, khi nào có hàng?', ago: 15 },
      { from: 'customer', text: 'Alo shop?', ago: 3 },
    ],
    unread: 2,
    status: 'active',
  },
  {
    senderId: 'fb_100004',
    name: 'Phạm Đức Anh',
    phone: '0909112233',
    notes: 'Hỏi setup phòng karaoke kinh doanh',
    messages: [
      { from: 'customer', text: 'Shop ơi, mình muốn setup 1 phòng karaoke kinh doanh diện tích 30m², budget khoảng 40-50 triệu. Tư vấn giúp mình với!', ago: 300 },
      { from: 'agent', text: 'Chào anh Đức Anh! Phòng 30m² kinh doanh, budget 40-50tr thì em đề xuất:\n\nLoa:\n- JBL KP6012 (đôi): 12.000k\n- Sub Hơi AAP SW-18 (1 chiếc): 6.500k\n\nXử lý:\n- Vang số AAP K-9900: 6.800k\n- Đẩy AAP STD-18004: 8.500k\n\nMicro:\n- AAP K-900 II (2 tay): 4.200k\n\nMàn hình + Đầu:\n- Màn hình 43 inch: 5.000k\n- Đầu Hanet PlayX One: 5.500k\n\nTổng: ~48.500k ạ!', ago: 295 },
      { from: 'customer', text: 'Nghe ổn đó, mà loa JBL này xuất xứ đâu vậy?', ago: 290 },
      { from: 'agent', text: 'JBL KP6012 là hàng chính hãng nhập khẩu từ Mỹ ạ. Bên em là đại lý ủy quyền JBL nên anh yên tâm về nguồn gốc + bảo hành 12 tháng chính hãng nhé!', ago: 288 },
      { from: 'customer', text: 'OK, để cuối tuần mình qua showroom xem thực tế được không?', ago: 285 },
      { from: 'agent', text: 'Dạ anh qua bất kỳ lúc nào ạ! Showroom mở cửa 8h-21h hàng ngày. Địa chỉ: 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM. Anh đến em cho nghe thử luôn nhé!', ago: 283 },
    ],
    unread: 0,
    status: 'active',
  },
  {
    senderId: 'fb_100005',
    name: 'Võ Thanh Tùng',
    phone: '',
    messages: [
      { from: 'customer', text: 'cho hoi loa keo co khong shop', ago: 60 },
      { from: 'agent', text: 'Chào anh! Bên em có nhiều loa kéo lắm ạ:\n- Tầm 2-3tr: JBZ NE-108, bass 2 tấc\n- Tầm 4-5tr: Dalton TS-18G850, bass 5 tấc\n- Tầm 7-8tr: JBL PartyBox 310\nAnh cần dùng cho mục đích gì ạ?', ago: 55 },
      { from: 'customer', text: 'di picnic voi hat karaoke o nha, tam 3 trieu', ago: 50 },
      { from: 'agent', text: 'Tầm 3 triệu đi picnic + hát karaoke thì em recommend JBZ NE-108 ạ:\n- Bass 2 tấc, công suất 150W\n- Pin 6-8 tiếng\n- Kèm 2 micro không dây\n- Có bluetooth, USB, thẻ nhớ\n- Kéo bánh xe, nhẹ chỉ 8kg\nGiá: 2.800.000đ ạ!', ago: 48 },
      { from: 'customer', text: 'gui hinh thuc te duoc ko', ago: 2 },
    ],
    unread: 1,
    status: 'active',
  },
  {
    senderId: 'fb_100006',
    name: 'Ngô Bảo Ngọc',
    phone: '0933445566',
    messages: [
      { from: 'customer', text: 'Em mới mua bộ karaoke bên shop tuần trước mà hôm nay micro bị mất tiếng 1 cây', ago: 25 },
      { from: 'agent', text: 'Chị Ngọc ơi để em kiểm tra ạ! Chị cho em xin mã đơn hàng hoặc số điện thoại đặt hàng được không ạ?', ago: 23 },
      { from: 'customer', text: 'SĐT 0933445566, đặt ngày 12/02', ago: 22 },
      { from: 'agent', text: 'Em tra rồi ạ — đơn micro AAP K-800 II. Chị thử đổi pin mới xem sao ạ? Nếu đổi pin rồi vẫn mất tiếng thì bên em đổi mới cho chị luôn, bảo hành 12 tháng mà ạ!', ago: 20 },
      { from: 'customer', text: 'Đổi pin rồi vẫn vậy shop ơi. 1 cây OK, 1 cây không lên tiếng', ago: 18 },
      { from: 'agent', text: 'Vậy chị gửi hàng về shop hoặc mang ra showroom, em đổi mới ngay cho chị nhé! Nếu gửi ship thì shop chịu phí ship 2 chiều luôn ạ', ago: 16 },
      { from: 'customer', text: 'OK em, mai chị mang ra. Showroom mở mấy giờ?', ago: 14 },
      { from: 'agent', text: 'Dạ 8h-21h hàng ngày ạ! Chị mang ra em đổi liền, không phải chờ. Chị nhớ mang theo hộp + phụ kiện kèm theo nhé!', ago: 12 },
    ],
    unread: 0,
    status: 'active',
  },
];

async function seed() {
  console.log('[Seed] Starting...');

  // 1. Create demo user (or get existing)
  let userId;
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`[Seed] Demo user already exists: ${userId}`);
  } else {
    // Try creating user — trigger may or may not work
    const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: DEMO_DISPLAY_NAME, shop_name: DEMO_SHOP_NAME },
    });

    if (userErr) {
      console.error('[Seed] Error from createUser:', userErr.message);
      // If trigger failed, try without metadata trigger
      console.log('[Seed] Retrying with manual tenant+profile creation...');
      const { data: retry, error: retryErr } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (retryErr) {
        console.error('[Seed] Fatal: Cannot create user:', retryErr.message);
        process.exit(1);
      }
      userId = retry.user.id;
    } else {
      userId = newUser.user.id;
    }
    console.log(`[Seed] Created demo user: ${userId}`);
  }

  // 2. Wait for trigger (if it exists)
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Get or create tenant + profile manually
  let { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (!profile) {
    console.log('[Seed] Profile not found, creating tenant + profile manually...');
    // Create tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .insert({ name: DEMO_SHOP_NAME })
      .select('id')
      .single();

    if (tErr) {
      console.error('[Seed] Error creating tenant:', tErr.message);
      process.exit(1);
    }

    // Create profile
    const { error: pErr } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, tenant_id: tenant.id, display_name: DEMO_DISPLAY_NAME, role: 'owner' });

    if (pErr) {
      console.error('[Seed] Error creating profile:', pErr.message);
      process.exit(1);
    }

    profile = { tenant_id: tenant.id };
    console.log(`[Seed] Manually created tenant + profile`);
  }

  const tenantId = profile.tenant_id;
  console.log(`[Seed] Tenant ID: ${tenantId}`);

  // 4. Update tenant with settings
  const { error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .update({
      shop_info: SHOP_INFO,
      ai_config: AI_CONFIG,
      oms_config: OMS_CONFIG,
      account_config: ACCOUNT_CONFIG,
      products: PRODUCTS,
    })
    .eq('id', tenantId);

  if (tenantErr) {
    console.error('[Seed] Error updating tenant:', tenantErr.message);
  } else {
    console.log('[Seed] Tenant settings updated');
  }

  // 5. Create facebook channel
  const { error: chErr } = await supabaseAdmin
    .from('channels')
    .upsert({
      tenant_id: tenantId,
      type: 'facebook',
      connected: true,
      connected_at: '2026-02-01T08:00:00.000Z',
      page_id: '',
      page_name: 'Hoàng Nam Audio',
      page_access_token: process.env.FB_PAGE_ACCESS_TOKEN || '',
      config: {
        verifyToken: 'hoangnam_verify_2024',
        oauthConnected: false,
      },
    }, { onConflict: 'tenant_id,type' });

  if (chErr) {
    console.error('[Seed] Error creating channel:', chErr.message);
  } else {
    console.log('[Seed] Facebook channel created');
  }

  // 6. Clear old demo data for this tenant
  await supabaseAdmin.from('messages').delete().in(
    'conversation_id',
    (await supabaseAdmin.from('conversations').select('id').eq('tenant_id', tenantId)).data?.map((c) => c.id) || []
  );
  await supabaseAdmin.from('conversations').delete().eq('tenant_id', tenantId);
  await supabaseAdmin.from('customers').delete().eq('tenant_id', tenantId);

  // 7. Create demo customers + conversations + messages
  for (const cust of DEMO_CUSTOMERS) {
    // Create customer
    const { data: customer, error: custErr } = await supabaseAdmin
      .from('customers')
      .insert({
        tenant_id: tenantId,
        channel_type: 'facebook',
        external_id: cust.senderId,
        name: cust.name,
        phone: cust.phone || null,
        notes: cust.notes || null,
        avatar: null,
      })
      .select('id')
      .single();

    if (custErr) {
      console.error(`[Seed] Error creating customer ${cust.name}:`, custErr.message);
      continue;
    }

    // Create conversation
    const lastMsg = cust.messages[cust.messages.length - 1];
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        channel: 'facebook',
        status: cust.status || 'active',
        last_message: lastMsg.text,
        last_message_at: new Date(Date.now() - lastMsg.ago * 60 * 1000).toISOString(),
        unread: cust.unread || 0,
      })
      .select('id')
      .single();

    if (convErr) {
      console.error(`[Seed] Error creating conversation for ${cust.name}:`, convErr.message);
      continue;
    }

    // Create messages
    const messages = cust.messages.map((msg) => ({
      conversation_id: conv.id,
      sender: msg.from,
      text: msg.text,
      type: 'text',
      created_at: new Date(Date.now() - msg.ago * 60 * 1000).toISOString(),
    }));

    const { error: msgErr } = await supabaseAdmin.from('messages').insert(messages);
    if (msgErr) {
      console.error(`[Seed] Error creating messages for ${cust.name}:`, msgErr.message);
    }

    console.log(`[Seed]   + ${cust.name} — ${cust.messages.length} messages`);
  }

  console.log(`\n[Seed] Done! ${DEMO_CUSTOMERS.length} conversations created.`);
  console.log(`[Seed] Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed().catch((err) => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
