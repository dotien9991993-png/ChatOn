const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API quản lý chatbot rules (kịch bản rule-based)
 */

// GET /api/chatbot-rules — Danh sách rules
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('chatbot_rules')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('priority', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('[ChatbotRules] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chatbot-rules — Tạo rule mới
router.post('/', async (req, res) => {
  try {
    const { name, trigger_type, keywords, match_type, response_text, response_buttons, response_image_url, is_active, priority } = req.body;

    if (!name || !response_text) {
      return res.status(400).json({ error: 'Thiếu name hoặc response_text' });
    }

    const { data, error } = await supabaseAdmin
      .from('chatbot_rules')
      .insert({
        tenant_id: req.tenantId,
        name,
        trigger_type: trigger_type || 'keyword',
        keywords: keywords || [],
        match_type: match_type || 'contains',
        response_text,
        response_buttons: response_buttons || [],
        response_image_url: response_image_url || null,
        is_active: is_active !== false,
        priority: priority || 0,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[ChatbotRules] POST / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/chatbot-rules/:id — Cập nhật rule
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    const fields = ['name', 'trigger_type', 'keywords', 'match_type', 'response_text', 'response_buttons', 'response_image_url', 'is_active', 'priority'];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const { data, error } = await supabaseAdmin
      .from('chatbot_rules')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Rule not found' });
    res.json(data);
  } catch (err) {
    console.error('[ChatbotRules] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/chatbot-rules/:id — Xóa rule
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('chatbot_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[ChatbotRules] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chatbot-rules/import-template — Import mẫu theo ngành
router.post('/import-template', async (req, res) => {
  try {
    const { template } = req.body;
    const templates = getIndustryTemplates();
    const rules = templates[template];
    if (!rules) return res.status(400).json({ error: 'Template không tồn tại' });

    const rows = rules.map((r, i) => ({
      tenant_id: req.tenantId,
      name: r.name,
      trigger_type: 'keyword',
      keywords: r.keywords,
      match_type: 'contains',
      response_text: r.response_text,
      response_buttons: r.response_buttons || [],
      is_active: true,
      priority: rules.length - i,
    }));

    const { data, error } = await supabaseAdmin
      .from('chatbot_rules')
      .insert(rows)
      .select('*');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, count: data.length });
  } catch (err) {
    console.error('[ChatbotRules] POST /import-template error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chatbot-rules/reorder — Cập nhật thứ tự priority
router.post('/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds phải là mảng' });

    for (let i = 0; i < orderedIds.length; i++) {
      await supabaseAdmin
        .from('chatbot_rules')
        .update({ priority: orderedIds.length - i })
        .eq('id', orderedIds[i])
        .eq('tenant_id', req.tenantId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ChatbotRules] POST /reorder error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

function getIndustryTemplates() {
  return {
    karaoke: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu', 'giá tiền'], response_text: 'Dạ anh/chị vui lòng cho em biết sản phẩm cần hỏi giá ạ? Em sẽ báo giá chi tiết ngay!' },
      { name: 'Vận chuyển', keywords: ['ship', 'vận chuyển', 'giao hàng'], response_text: 'Shop ship toàn quốc ạ! Nội thành 25-30k, tỉnh 30-50k. Đơn trên 2 triệu FREE ship!' },
      { name: 'Bảo hành', keywords: ['bảo hành', 'warranty'], response_text: 'Sản phẩm bảo hành chính hãng 12 tháng, đổi mới trong 7 ngày đầu ạ!' },
      { name: 'Loa karaoke', keywords: ['loa', 'karaoke', 'âm thanh'], response_text: 'Shop có nhiều dòng loa karaoke từ 1-20 triệu ạ. Anh/chị cần loa xách tay hay dàn âm thanh ạ?' },
      { name: 'Micro', keywords: ['mic', 'micro', 'không dây'], response_text: 'Shop có micro không dây chất lượng cao từ 500k-3 triệu. Anh/chị cần micro cho karaoke gia đình hay sân khấu ạ?' },
    ],
    fashion: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu', 'giá tiền'], response_text: 'Dạ anh/chị cho em biết sản phẩm cần hỏi giá, em báo chi tiết ngay ạ!' },
      { name: 'Size', keywords: ['size', 'cỡ', 'kích thước', 'bảng size'], response_text: 'Shop có size S-M-L-XL-XXL ạ. Anh/chị cao bao nhiêu, nặng bao nhiêu để em tư vấn size phù hợp ạ?' },
      { name: 'Vận chuyển', keywords: ['ship', 'vận chuyển', 'giao hàng'], response_text: 'Shop giao toàn quốc ạ! COD nhận hàng mới thanh toán. Nội thành 1-2 ngày, tỉnh 3-5 ngày.' },
      { name: 'Đổi trả', keywords: ['đổi', 'trả', 'hoàn'], response_text: 'Shop hỗ trợ đổi size/màu trong 3 ngày nếu còn nguyên tem mác. Hoàn tiền nếu lỗi từ shop ạ!' },
      { name: 'Chất liệu', keywords: ['chất liệu', 'vải', 'cotton', 'material'], response_text: 'Sản phẩm shop 100% chất lượng, chất liệu cao cấp ạ. Anh/chị quan tâm sản phẩm nào để em mô tả chi tiết ạ?' },
    ],
    cosmetics: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu'], response_text: 'Dạ anh/chị quan tâm sản phẩm nào ạ? Em báo giá chi tiết ngay!' },
      { name: 'Chính hãng', keywords: ['chính hãng', 'auth', 'real', 'thật'], response_text: 'Shop cam kết 100% chính hãng, có bill + check code ạ. Nếu phát hiện giả đền gấp 10 lần!' },
      { name: 'Da dầu', keywords: ['da dầu', 'mụn', 'kiềm dầu'], response_text: 'Cho da dầu, em khuyên dùng sữa rửa mặt + toner không cồn + kem dưỡng gel ạ. Anh/chị cần em tư vấn combo không ạ?' },
      { name: 'Da khô', keywords: ['da khô', 'khô da', 'dưỡng ẩm'], response_text: 'Da khô cần cấp ẩm sâu ạ! Em gợi ý serum HA + kem dưỡng đặc trị. Để em tư vấn chi tiết ạ!' },
      { name: 'Vận chuyển', keywords: ['ship', 'giao hàng'], response_text: 'Ship COD toàn quốc ạ. Đơn từ 300k FREE ship!' },
    ],
    phone: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu'], response_text: 'Dạ anh/chị quan tâm dòng máy nào ạ? Em báo giá tốt nhất luôn!' },
      { name: 'Trả góp', keywords: ['trả góp', 'góp', 'installment'], response_text: 'Shop hỗ trợ trả góp 0% qua thẻ tín dụng và công ty tài chính ạ. Chỉ cần CCCD + Bằng lái!' },
      { name: 'Bảo hành', keywords: ['bảo hành', 'warranty'], response_text: 'BH chính hãng 12 tháng + BH shop thêm 6 tháng. Lỗi phần cứng đổi mới trong 30 ngày ạ!' },
      { name: 'So sánh', keywords: ['so sánh', 'vs', 'hay', 'nên mua'], response_text: 'Anh/chị đang phân vân giữa những dòng nào ạ? Cho em biết ngân sách + nhu cầu sử dụng để em tư vấn ạ!' },
      { name: 'Phụ kiện', keywords: ['ốp', 'kính', 'sạc', 'tai nghe', 'phụ kiện'], response_text: 'Shop có đầy đủ phụ kiện chính hãng ạ. Mua kèm máy giảm 20-50%!' },
    ],
    food: [
      { name: 'Đặt hàng', keywords: ['đặt', 'order', 'mua'], response_text: 'Dạ anh/chị muốn đặt món gì ạ? Cho em SĐT + địa chỉ giao hàng để em xử lý nhanh ạ!' },
      { name: 'Menu', keywords: ['menu', 'thực đơn', 'món gì'], response_text: 'Anh/chị xem menu trên page shop nhé! Hoặc cho em biết anh/chị thích ăn gì, em gợi ý ạ!' },
      { name: 'Giao hàng', keywords: ['giao', 'ship', 'bao lâu'], response_text: 'Giao trong 30-45 phút nội thành ạ. Đơn từ 200k FREE ship!' },
      { name: 'Khuyến mãi', keywords: ['giảm', 'khuyến mãi', 'sale', 'ưu đãi'], response_text: 'Hiện shop đang có nhiều ưu đãi hấp dẫn ạ! Anh/chị inbox để em báo chi tiết!' },
    ],
    furniture: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu'], response_text: 'Dạ anh/chị cho em biết sản phẩm quan tâm, em báo giá chi tiết + phí ship ạ!' },
      { name: 'Vận chuyển', keywords: ['ship', 'vận chuyển', 'giao'], response_text: 'Shop giao + lắp đặt tận nơi nội thành. Tỉnh ship qua nhà xe, phí tùy khu vực ạ!' },
      { name: 'Kích thước', keywords: ['kích thước', 'size', 'đo'], response_text: 'Anh/chị cho em kích thước phòng, em tư vấn nội thất phù hợp ạ!' },
      { name: 'Bảo hành', keywords: ['bảo hành', 'warranty'], response_text: 'BH 12-24 tháng tùy sản phẩm. Bảo trì trọn đời giá ưu đãi ạ!' },
    ],
    baby: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu'], response_text: 'Dạ mẹ cho em biết sản phẩm cần hỏi, em báo giá + ưu đãi ngay ạ!' },
      { name: 'Chính hãng', keywords: ['chính hãng', 'auth', 'nhập khẩu'], response_text: 'Shop cam kết 100% chính hãng, nhập khẩu trực tiếp, có đầy đủ giấy tờ ạ!' },
      { name: 'Tháng tuổi', keywords: ['tháng', 'tuổi', 'bé'], response_text: 'Bé nhà mình bao nhiêu tháng tuổi ạ? Để em tư vấn sản phẩm phù hợp theo độ tuổi!' },
      { name: 'Vận chuyển', keywords: ['ship', 'giao hàng'], response_text: 'Giao COD toàn quốc, nhận hàng kiểm tra mới thanh toán ạ. Đơn từ 500k FREE ship!' },
    ],
    general: [
      { name: 'Hỏi giá', keywords: ['giá', 'bao nhiêu', 'giá tiền', 'how much'], response_text: 'Dạ anh/chị vui lòng cho em biết sản phẩm cần hỏi giá ạ?' },
      { name: 'Vận chuyển', keywords: ['ship', 'vận chuyển', 'giao hàng', 'shipping'], response_text: 'Shop ship toàn quốc ạ. Nội thành 25-30k, tỉnh 30-50k.' },
      { name: 'Bảo hành', keywords: ['bảo hành', 'warranty'], response_text: 'Sản phẩm bảo hành chính hãng 12 tháng ạ.' },
      { name: 'Thanh toán', keywords: ['thanh toán', 'payment', 'chuyển khoản', 'cod'], response_text: 'Shop nhận COD (thanh toán khi nhận hàng) và chuyển khoản ngân hàng ạ!' },
      { name: 'Giờ làm việc', keywords: ['mấy giờ', 'giờ làm', 'khi nào', 'mở cửa'], response_text: 'Shop hoạt động từ 8h-21h hàng ngày ạ. Ngoài giờ anh/chị inbox, em sẽ trả lời sớm nhất!' },
      { name: 'Khuyến mãi', keywords: ['giảm giá', 'khuyến mãi', 'sale', 'ưu đãi', 'voucher'], response_text: 'Hiện shop đang có nhiều ưu đãi hấp dẫn! Anh/chị quan tâm sản phẩm nào để em báo giá tốt nhất ạ?' },
      { name: 'Đổi trả', keywords: ['đổi', 'trả hàng', 'hoàn tiền', 'return'], response_text: 'Shop hỗ trợ đổi trả trong 7 ngày nếu sản phẩm bị lỗi từ nhà sản xuất ạ!' },
      { name: 'Cảm ơn', keywords: ['cảm ơn', 'thanks', 'thank you', 'ok'], response_text: 'Dạ không có gì ạ! Nếu cần hỗ trợ thêm, anh/chị cứ nhắn tin cho shop nhé! 😊' },
      { name: 'Chào hỏi', keywords: ['xin chào', 'hello', 'hi', 'chào shop', 'alo'], response_text: 'Chào anh/chị! 😊 Shop có thể giúp gì cho anh/chị ạ?' },
      { name: 'Tư vấn', keywords: ['tư vấn', 'giúp', 'hỏi', 'advise'], response_text: 'Dạ anh/chị cần tư vấn về sản phẩm nào ạ? Em sẵn sàng hỗ trợ!' },
    ],
  };
}

module.exports = router;
