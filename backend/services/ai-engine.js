const Anthropic = require('@anthropic-ai/sdk');
const { supabaseAdmin } = require('../config/supabase');
const { searchProducts, createOrder, handoffToAgent, checkShippingFee } = require('./ai-tools');

/**
 * AI Engine — bộ não chính: nhận tin nhắn khách, gọi Claude, trả reply
 */

// Format danh sách sản phẩm cho system prompt
function formatProductsForAI(products) {
  if (!products || products.length === 0) return 'Chưa có sản phẩm nào.';
  return products.map(p =>
    `- ${p.name} | Giá: ${p.price?.toLocaleString('vi-VN')}đ | Tồn: ${p.stock ?? '?'} | SKU: ${p.sku || 'N/A'} | ${p.description || ''}`
  ).join('\n');
}

// Tone instruction
function getToneInstruction(tone) {
  const tones = {
    friendly: 'Thân thiện, gần gũi, dùng emoji vừa phải, xưng em/anh chị',
    professional: 'Chuyên nghiệp, lịch sự, xưng chúng tôi/quý khách',
    humorous: 'Vui vẻ, hài hước nhẹ nhàng, dùng emoji nhiều hơn',
    custom: 'Theo hướng dẫn trong system prompt',
  };
  return tones[tone] || tones.friendly;
}

// Build system prompt
function buildSystemPrompt(tenant, products, customer) {
  const shopInfo = tenant.shop_info || {};
  const aiConfig = tenant.ai_config || {};

  return `
${aiConfig.systemPrompt || 'Bạn là nhân viên tư vấn bán hàng chuyên nghiệp.'}

THÔNG TIN CỬA HÀNG:
- Tên: ${shopInfo.shopName || tenant.name || 'Cửa hàng'}
- Hotline: ${shopInfo.hotline || 'Chưa cập nhật'}
- Địa chỉ: ${shopInfo.address || 'Chưa cập nhật'}
- Website: ${shopInfo.website || ''}
- Giờ làm việc: ${shopInfo.workingHours?.open || '08:00'} - ${shopInfo.workingHours?.close || '21:00'}

CHÍNH SÁCH:
- Vận chuyển: ${shopInfo.policies?.shipping || 'Liên hệ để biết chi phí ship'}
- Bảo hành: ${shopInfo.policies?.warranty || 'Theo chính sách nhà sản xuất'}
- Đổi trả: ${shopInfo.policies?.returns || 'Đổi trả trong 7 ngày'}

DANH SÁCH SẢN PHẨM:
${formatProductsForAI(products)}

THÔNG TIN KHÁCH ĐANG CHAT:
- Tên: ${customer?.name || 'Chưa biết'}
- SĐT: ${customer?.phone || 'Chưa có'}
- Địa chỉ: ${customer?.address || 'Chưa có'}

PHONG CÁCH: ${getToneInstruction(aiConfig.tone)}

QUY TẮC:
1. Trả lời ngắn gọn, thân thiện, đúng trọng tâm (tối đa 3-4 câu)
2. Luôn gợi ý sản phẩm phù hợp khi khách hỏi
3. Khi khách muốn mua → hỏi đủ: tên, SĐT, địa chỉ giao hàng → rồi gọi tool create_order
4. Trả lời giá chính xác từ danh sách sản phẩm, KHÔNG bịa
5. Nếu không chắc chắn hoặc câu hỏi phức tạp → gọi tool handoff_to_agent
6. Dùng emoji vừa phải
7. Nếu sản phẩm hết hàng (stock = 0) → thông báo và gợi ý SP tương tự
8. Nếu khách hỏi ngoài phạm vi → lịch sự từ chối, hướng về sản phẩm
`.trim();
}

// Claude tools definition
const TOOLS = [
  {
    name: 'search_products',
    description: 'Tìm sản phẩm theo từ khóa, danh mục, khoảng giá. Dùng khi khách hỏi về sản phẩm cụ thể.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa tìm kiếm' },
        category: { type: 'string', description: 'Danh mục sản phẩm (optional)' },
        min_price: { type: 'number', description: 'Giá tối thiểu (optional)' },
        max_price: { type: 'number', description: 'Giá tối đa (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_order',
    description: 'Tạo đơn hàng khi khách XÁC NHẬN muốn mua và đã cung cấp đủ SĐT + địa chỉ giao hàng. Đơn sẽ được đẩy sang hệ thống kho/OMS để xử lý.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Tên khách hàng' },
        customer_phone: { type: 'string', description: 'Số điện thoại' },
        customer_address: { type: 'string', description: 'Địa chỉ giao hàng' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_name: { type: 'string' },
              product_id: { type: 'string' },
              quantity: { type: 'number', default: 1 },
              price: { type: 'number' },
            },
            required: ['product_name', 'quantity', 'price'],
          },
        },
        note: { type: 'string', description: 'Ghi chú đơn hàng (optional)' },
      },
      required: ['customer_phone', 'customer_address', 'items'],
    },
  },
  {
    name: 'check_shipping_fee',
    description: 'Tra cứu phí vận chuyển theo tỉnh/thành phố và cân nặng. Dùng khi khách hỏi về phí ship, giá vận chuyển.',
    input_schema: {
      type: 'object',
      properties: {
        province: { type: 'string', description: 'Tỉnh/thành phố giao hàng' },
        district: { type: 'string', description: 'Quận/huyện (optional)' },
        weight_kg: { type: 'number', description: 'Cân nặng ước tính (kg), mặc định 1kg' },
      },
      required: ['province'],
    },
  },
  {
    name: 'handoff_to_agent',
    description: 'Chuyển cho nhân viên khi: câu hỏi phức tạp, khiếu nại, yêu cầu đặc biệt, hoặc AI không đủ thông tin trả lời',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Lý do chuyển cho nhân viên' },
      },
      required: ['reason'],
    },
  },
];

/**
 * Main function: processWithAI
 * @returns {{ reply: string, orderCreated: object|null, handoff: boolean }}
 */
async function processWithAI({ tenantId, conversationId, customerMessage, io }) {
  const startTime = Date.now();
  let toolsUsed = [];

  try {
    // 1. Get tenant config
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (!tenant) throw new Error('Tenant not found');

    const aiConfig = tenant.ai_config || {};
    const apiKey = aiConfig.apiKey;
    if (!apiKey) throw new Error('AI API key not configured');

    // 2. Get products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    // 3. Get recent messages (last 20)
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. Get customer info
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('*, customers(*)')
      .eq('id', conversationId)
      .single();

    const customer = conv?.customers;

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(tenant, products || [], customer);

    // 6. Build conversation history
    const messages = (recentMessages || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((msg) => ({
        role: msg.sender === 'customer' ? 'user' : 'assistant',
        content: msg.text || '',
      }))
      .filter((m) => m.content);

    // Add current message
    messages.push({ role: 'user', content: customerMessage });

    // 7. Call Claude API
    const anthropic = new Anthropic({ apiKey });
    const model = aiConfig.model || 'claude-sonnet-4-20250514';

    let response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    let orderCreated = null;
    let handoff = false;

    // 8. Tool call loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        toolsUsed.push(toolUse.name);
        let result;

        switch (toolUse.name) {
          case 'search_products':
            result = await searchProducts(tenantId, toolUse.input);
            break;
          case 'create_order':
            result = await createOrder(tenantId, conversationId, toolUse.input, io);
            if (result.success) orderCreated = result;
            break;
          case 'check_shipping_fee':
            result = await checkShippingFee(tenantId, toolUse.input);
            break;
          case 'handoff_to_agent':
            result = await handoffToAgent(tenantId, conversationId, toolUse.input, io);
            handoff = true;
            break;
          default:
            result = { error: 'Unknown tool' };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Call Claude again with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    }

    // 9. Extract final text reply
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const duration = Date.now() - startTime;

    // 10. Log AI call
    await supabaseAdmin.from('ai_logs').insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      customer_message: customerMessage,
      ai_response: reply,
      tools_used: toolsUsed.length > 0 ? toolsUsed : null,
      model,
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      duration_ms: duration,
    });

    return { reply, orderCreated, handoff };
  } catch (err) {
    const duration = Date.now() - startTime;

    // Log error
    await supabaseAdmin.from('ai_logs').insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      customer_message: customerMessage,
      error: err.message,
      tools_used: toolsUsed.length > 0 ? toolsUsed : null,
      duration_ms: duration,
    }).catch(() => {});

    // Retry on 429 (rate limit) with exponential backoff
    if (err.status === 429) {
      console.warn('[AI] Rate limited, retrying in 5s...');
      await new Promise((r) => setTimeout(r, 5000));
      // One retry attempt
      try {
        return await processWithAI({ tenantId, conversationId, customerMessage, io });
      } catch (retryErr) {
        console.error('[AI] Retry failed:', retryErr.message);
        throw retryErr;
      }
    }

    throw err;
  }
}

module.exports = { processWithAI };
