const store = require('./memory');

/**
 * Dữ liệu demo — fake conversations + messages
 * Nội dung thực tế về thiết bị âm thanh karaoke cho Hoàng Nam Audio
 */

const DEMO_CUSTOMERS = [
  {
    senderId: 'fb_100001',
    name: 'Nguyễn Văn Minh',
    avatar: null,
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
    avatar: null,
    phone: '0987654321',
    notes: 'Khách VIP, đã mua loa 2 lần',
    messages: [
      { from: 'customer', text: 'Shop ơi, bên em có micro không dây nào hát hay mà giá tầm 3 triệu không?', ago: 180 },
      { from: 'agent', text: 'Chào chị Hương! Tầm 3 triệu chị tham khảo:\n1. AAP K-800 II: 2.900k — bắt sóng xa, chống hú tốt\n2. BIK BJ-U550: 3.200k — thiết kế sang, pin 8 tiếng\n3. Shure SVX24/PG58: 3.500k — thương hiệu Mỹ, bền bỉ\nChị thích style nào ạ?', ago: 175 },
      { from: 'customer', text: 'AAP K-800 II đi em. Mà nó có bị rè không? Micro cũ nhà chị hay bị rè lắm 😢', ago: 170 },
      { from: 'agent', text: 'AAP K-800 II dùng sóng UHF nên rất ổn định chị ơi, không bị rè hay mất tiếng. Còn có chức năng chống hú tự động nữa. Chị yên tâm nhé! 🎤', ago: 168 },
      { from: 'customer', text: 'OK em ship cho chị nha. Chị chuyển khoản trước được không?', ago: 165 },
      { from: 'agent', text: 'Dạ được ạ! Em gửi thông tin TK:\nVietcombank: 0123456789\nCTK: HOANG NAM AUDIO\nNội dung CK: "Huong micro K800"\nChị CK xong báo em ship liền nhé!', ago: 163 },
      { from: 'customer', text: 'Chị CK rồi nha em, kiểm tra giúp chị', ago: 160 },
      { from: 'agent', text: 'Em nhận được rồi ạ! Sẽ đóng gói và ship trong hôm nay. Chị nhận hàng ngày mai nhé. Cảm ơn chị! 🙏', ago: 158 },
    ],
    unread: 0,
    status: 'resolved',
  },
  {
    senderId: 'fb_100003',
    name: 'Lê Hoàng Phúc',
    avatar: null,
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
    avatar: null,
    phone: '0909112233',
    notes: 'Hỏi setup phòng karaoke kinh doanh',
    messages: [
      { from: 'customer', text: 'Shop ơi, mình muốn setup 1 phòng karaoke kinh doanh diện tích 30m², budget khoảng 40-50 triệu. Tư vấn giúp mình với!', ago: 300 },
      { from: 'agent', text: 'Chào anh Đức Anh! Phòng 30m² kinh doanh, budget 40-50tr thì em đề xuất:\n\n🔊 Loa:\n- JBL KP6012 (đôi): 12.000k\n- Sub Hơi AAP SW-18 (1 chiếc): 6.500k\n\n🎛️ Xử lý:\n- Vang số AAP K-9900: 6.800k\n- Đẩy AAP STD-18004: 8.500k\n\n🎤 Micro:\n- AAP K-900 II (2 tay): 4.200k\n\n📺 Màn hình + Đầu:\n- Màn hình 43 inch: 5.000k\n- Đầu Hanet PlayX One: 5.500k\n\nTổng: ~48.500k ạ!', ago: 295 },
      { from: 'customer', text: 'Nghe ổn đó, mà loa JBL này xuất xứ đâu vậy?', ago: 290 },
      { from: 'agent', text: 'JBL KP6012 là hàng chính hãng nhập khẩu từ Mỹ ạ. Bên em là đại lý ủy quyền JBL nên anh yên tâm về nguồn gốc + bảo hành 12 tháng chính hãng nhé!', ago: 288 },
      { from: 'customer', text: 'OK, để cuối tuần mình qua showroom xem thực tế được không?', ago: 285 },
      { from: 'agent', text: 'Dạ anh qua bất kỳ lúc nào ạ! Showroom mở cửa 8h-21h hàng ngày. Địa chỉ: 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM. Anh đến em cho nghe thử luôn nhé! 🏠', ago: 283 },
    ],
    unread: 0,
    status: 'active',
  },
  {
    senderId: 'fb_100005',
    name: 'Võ Thanh Tùng',
    avatar: null,
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
    avatar: null,
    phone: '0933445566',
    messages: [
      { from: 'customer', text: 'Em mới mua bộ karaoke bên shop tuần trước mà hôm nay micro bị mất tiếng 1 cây 😭', ago: 25 },
      { from: 'agent', text: 'Chị Ngọc ơi để em kiểm tra ạ! Chị cho em xin mã đơn hàng hoặc số điện thoại đặt hàng được không ạ?', ago: 23 },
      { from: 'customer', text: 'SĐT 0933445566, đặt ngày 12/02', ago: 22 },
      { from: 'agent', text: 'Em tra rồi ạ — đơn micro AAP K-800 II. Chị thử đổi pin mới xem sao ạ? Nếu đổi pin rồi vẫn mất tiếng thì bên em đổi mới cho chị luôn, bảo hành 12 tháng mà ạ!', ago: 20 },
      { from: 'customer', text: 'Đổi pin rồi vẫn vậy shop ơi. 1 cây OK, 1 cây không lên tiếng', ago: 18 },
      { from: 'agent', text: 'Vậy chị gửi hàng về shop hoặc mang ra showroom, em đổi mới ngay cho chị nhé! Nếu gửi ship thì shop chịu phí ship 2 chiều luôn ạ 🙏', ago: 16 },
      { from: 'customer', text: 'OK em, mai chị mang ra. Showroom mở mấy giờ?', ago: 14 },
      { from: 'agent', text: 'Dạ 8h-21h hàng ngày ạ! Chị mang ra em đổi liền, không phải chờ. Chị nhớ mang theo hộp + phụ kiện kèm theo nhé!', ago: 12 },
    ],
    unread: 0,
    status: 'active',
  },
];

/**
 * Seed dữ liệu demo vào store
 */
function seedDemoData() {
  console.log('[Seed] Đang tạo dữ liệu demo...');

  for (const customer of DEMO_CUSTOMERS) {
    // Tạo conversation
    const { conversation } = store.getOrCreate(customer.senderId, {
      name: customer.name,
      avatar: customer.avatar,
    });

    // Cập nhật phone, notes, status
    if (customer.phone) store.update(conversation.id, { phone: customer.phone });
    if (customer.notes) store.update(conversation.id, { notes: customer.notes });
    if (customer.status) store.update(conversation.id, { status: customer.status });

    // Thêm messages (tính timestamp từ "ago" phút trước)
    for (const msg of customer.messages) {
      const timestamp = new Date(Date.now() - msg.ago * 60 * 1000).toISOString();
      const message = store.addMessage(conversation.id, {
        from: msg.from,
        text: msg.text,
        type: 'text',
      });
      // Override timestamp để có thời gian thực tế
      message.timestamp = timestamp;
      conversation.lastMessageAt = timestamp;
      conversation.lastMessage = msg.text;
    }

    // Set unread
    conversation.unread = customer.unread || 0;

    console.log(`[Seed]   ✓ ${customer.name} — ${customer.messages.length} tin nhắn`);
  }

  console.log(`[Seed] Hoàn tất! ${DEMO_CUSTOMERS.length} conversations.`);
}

module.exports = seedDemoData;
