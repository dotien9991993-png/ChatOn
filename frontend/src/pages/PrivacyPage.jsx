import React from "react";
import { Link } from "react-router-dom";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <header className="sticky top-0 bg-white border-b flex items-center justify-between px-6 py-3">
        <span className="text-lg font-bold text-blue-600">SalesFlow AI</span>
        <Link to="/login" className="text-sm text-slate-600 hover:text-blue-600">
          Quay lại
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Chính sách bảo mật
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Cập nhật lần cuối: 01/01/2025
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            1. Thông tin chúng tôi thu thập
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Thông tin cá nhân (tên, email, số điện thoại). Dữ liệu cửa hàng và đơn hàng. Lịch sử chat với khách hàng. Dữ liệu sử dụng (cookies, IP, thiết bị).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            2. Cách sử dụng thông tin
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Cung cấp và cải thiện dịch vụ. Huấn luyện AI để trả lời chính xác hơn. Gửi thông báo quan trọng về dịch vụ. Phân tích và báo cáo kinh doanh.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            3. Chia sẻ thông tin
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Không bán thông tin cho bên thứ 3. Chỉ chia sẻ khi có yêu cầu pháp lý. Đối tác xử lý thanh toán (được mã hóa). Facebook/Zalo API (chỉ để gửi/nhận tin nhắn).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            4. Bảo mật dữ liệu
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Mã hóa dữ liệu truyền tải (SSL/TLS). Mã hóa dữ liệu lưu trữ (AES-256). Backup hàng ngày. Kiểm tra bảo mật định kỳ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            5. Quyền của người dùng
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Truy cập dữ liệu cá nhân. Yêu cầu sửa đổi thông tin. Yêu cầu xóa tài khoản và dữ liệu. Xuất dữ liệu (CSV, JSON).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            6. Cookie
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Sử dụng cookie cần thiết cho đăng nhập. Cookie phân tích (có thể tắt). Không sử dụng cookie quảng cáo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            7. Liên hệ
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Mọi thắc mắc: support@salesflow.ai. DPO: privacy@salesflow.ai.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPage;
