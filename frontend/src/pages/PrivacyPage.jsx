import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3">
        <span className="text-lg font-bold text-blue-600">ChatOn</span>
        <Link to="/login" className="text-sm text-slate-600 hover:text-blue-600 transition">
          Quay lại
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Chính sách bảo mật</h1>
        <p className="text-sm text-slate-500 mb-2">
          ChatOn — Nền tảng quản lý hội thoại đa kênh
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Cập nhật lần cuối: 01/03/2026 &middot; Hoàng Nam Audio &middot;{' '}
          <a href="https://chat.hoangnamaudio.vn" className="text-blue-600 hover:underline">
            chat.hoangnamaudio.vn
          </a>
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">1. Giới thiệu</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ChatOn là nền tảng quản lý hội thoại đa kênh do Hoàng Nam Audio vận hành, giúp doanh nghiệp
              nhận và trả lời tin nhắn khách hàng từ Facebook Messenger, Zalo Official Account và Livechat
              website trong một giao diện duy nhất. Chính sách bảo mật này giải thích cách chúng tôi thu thập,
              sử dụng và bảo vệ dữ liệu của bạn.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">2. Dữ liệu chúng tôi thu thập</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>
                <strong>Thông tin tài khoản:</strong> tên, email, mật khẩu (được mã hóa) khi bạn đăng ký sử dụng ChatOn.
              </li>
              <li>
                <strong>Dữ liệu từ Facebook Messenger:</strong> tin nhắn, tên, ảnh đại diện của người dùng gửi tin nhắn
                đến Facebook Page của bạn. Chúng tôi nhận dữ liệu này thông qua quyền{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">pages_messaging</code> mà bạn cấp khi kết nối Page.
              </li>
              <li>
                <strong>Dữ liệu từ Zalo OA:</strong> tin nhắn, tên hiển thị, ảnh đại diện của người dùng
                gửi tin nhắn đến Zalo Official Account của bạn, nhận qua Zalo Webhook API.
              </li>
              <li>
                <strong>Dữ liệu Livechat:</strong> tên, số điện thoại, email (nếu khách hàng cung cấp)
                và nội dung tin nhắn từ widget chat trên website của bạn.
              </li>
              <li>
                <strong>Metadata:</strong> thời gian gửi tin nhắn, kênh gửi, trạng thái hội thoại.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">3. Mục đích sử dụng dữ liệu</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Hiển thị và quản lý hội thoại trong hộp thư ChatOn để bạn trả lời khách hàng.</li>
              <li>Hỗ trợ trả lời tự động bằng AI (nếu bạn bật tính năng này).</li>
              <li>Phân tích hội thoại, thống kê báo cáo phục vụ kinh doanh.</li>
              <li>Gửi tin nhắn trả lời từ bạn đến khách hàng thông qua Facebook Messenger hoặc Zalo OA.</li>
              <li>Đối soát đơn hàng và quản lý khách hàng liên quan đến hội thoại.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">4. Bảo mật dữ liệu</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Toàn bộ dữ liệu được truyền tải qua kết nối <strong>SSL/TLS</strong> mã hóa.</li>
              <li>Dữ liệu được lưu trữ trên server bảo mật (Supabase + PostgreSQL) với kiểm soát truy cập chặt chẽ.</li>
              <li>Chỉ chủ tài khoản và thành viên được mời mới có quyền truy cập dữ liệu của tài khoản đó.</li>
              <li>Token truy cập Facebook Page và Zalo OA được lưu trữ an toàn, không hiển thị cho người dùng cuối.</li>
              <li>Mật khẩu người dùng được mã hóa một chiều, không ai có thể đọc được.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">5. Chia sẻ dữ liệu</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">
              Chúng tôi <strong>không bán, cho thuê hoặc chia sẻ</strong> dữ liệu cá nhân của bạn
              hoặc khách hàng của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dữ liệu chỉ được truyền đến Facebook API và Zalo API với mục đích duy nhất là gửi và nhận
              tin nhắn theo yêu cầu của bạn. Chúng tôi có thể tiết lộ dữ liệu nếu có yêu cầu từ cơ quan
              pháp luật có thẩm quyền.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">6. Quyền Facebook — pages_messaging</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Khi kết nối Facebook Page với ChatOn, chúng tôi yêu cầu quyền{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">pages_messaging</code> để:
            </p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 list-disc list-inside mt-2">
              <li>Nhận tin nhắn từ khách hàng gửi đến Page của bạn qua Facebook Webhook.</li>
              <li>Gửi tin nhắn trả lời từ bạn (hoặc AI) đến khách hàng thông qua Facebook Send API.</li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed mt-2">
              Chúng tôi <strong>không</strong> đăng bài, chỉnh sửa Page, hoặc thực hiện bất kỳ hành động nào
              khác ngoài nhận/gửi tin nhắn. Bạn có thể ngắt kết nối Page bất kỳ lúc nào trong phần Cài đặt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">7. Quyền xóa dữ liệu</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có quyền yêu cầu xóa toàn bộ dữ liệu tài khoản và hội thoại bất kỳ lúc nào bằng cách
              gửi email đến{' '}
              <a href="mailto:hoangnamaudio@gmail.com" className="text-blue-600 hover:underline">
                hoangnamaudio@gmail.com
              </a>
              . Chúng tôi cam kết xóa dữ liệu trong vòng 30 ngày kể từ khi nhận được yêu cầu.
              Xem thêm tại trang{' '}
              <Link to="/deletion" className="text-blue-600 hover:underline">
                Yêu cầu xóa dữ liệu
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">8. Cookie</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ChatOn sử dụng cookie cần thiết để duy trì phiên đăng nhập của bạn. Chúng tôi không sử dụng
              cookie quảng cáo hoặc theo dõi bên thứ ba.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">9. Thay đổi chính sách</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Chúng tôi có thể cập nhật chính sách này theo thời gian. Mọi thay đổi quan trọng sẽ được
              thông báo qua email hoặc thông báo trong ứng dụng.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">10. Liên hệ</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật, vui lòng liên hệ:
            </p>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1 mt-2">
              <li><strong>Công ty:</strong> Hoàng Nam Audio</li>
              <li><strong>Email:</strong>{' '}
                <a href="mailto:hoangnamaudio@gmail.com" className="text-blue-600 hover:underline">
                  hoangnamaudio@gmail.com
                </a>
              </li>
              <li><strong>Website:</strong>{' '}
                <a href="https://chat.hoangnamaudio.vn" className="text-blue-600 hover:underline">
                  https://chat.hoangnamaudio.vn
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} ChatOn — Hoàng Nam Audio. Mọi quyền được bảo lưu.
      </footer>
    </div>
  );
}
