import React from "react";
import { Link } from "react-router-dom";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <header className="sticky top-0 bg-white border-b flex items-center justify-between px-6 py-3">
        <span className="text-lg font-bold text-blue-600">ChatOn</span>
        <Link to="/login" className="text-sm text-slate-600 hover:text-blue-600">
          Quay lại
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Điều khoản dịch vụ
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Cập nhật lần cuối: 01/01/2025
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            1. Giới thiệu
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            ChatOn là nền tảng quản lý bán hàng đa kênh sử dụng AI. Khi sử dụng dịch vụ, bạn đồng ý tuân theo các điều khoản này.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            2. Điều kiện sử dụng
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Bạn phải từ 18 tuổi trở lên. Mỗi tài khoản chỉ dùng cho 1 cửa hàng. Không sử dụng cho mục đích bất hợp pháp.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            3. Tài khoản và bảo mật
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Bạn chịu trách nhiệm bảo mật tài khoản. Thông báo ngay nếu phát hiện truy cập trái phép. Mật khẩu phải đủ mạnh theo yêu cầu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            4. Quyền và trách nhiệm
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Chúng tôi cung cấp dịch vụ "as is". Không đảm bảo AI trả lời chính xác 100%. Bạn có quyền truy cập và xóa dữ liệu bất cứ lúc nào.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            5. Thanh toán và hoàn tiền
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Dùng thử miễn phí 14 ngày. Thanh toán theo tháng hoặc năm. Hoàn tiền trong 7 ngày đầu nếu không hài lòng.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            6. Chấm dứt dịch vụ
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Bạn có thể hủy bất cứ lúc nào. Dữ liệu được lưu trữ 30 ngày sau khi hủy. Chúng tôi có quyền đình chỉ tài khoản vi phạm.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
            7. Liên hệ
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Email: support@chaton.vn. Địa chỉ: TP. Hồ Chí Minh, Việt Nam.
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsPage;
