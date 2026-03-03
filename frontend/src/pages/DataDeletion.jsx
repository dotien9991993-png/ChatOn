import React from 'react';
import { Link } from 'react-router-dom';

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3">
        <span className="text-lg font-bold text-blue-600">ChatOn</span>
        <Link to="/login" className="text-sm text-slate-600 hover:text-blue-600 transition">
          Quay lại
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Yêu cầu xóa dữ liệu</h1>
        <p className="text-sm text-slate-500 mb-2">
          ChatOn — Nền tảng quản lý hội thoại đa kênh
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Hoàng Nam Audio &middot;{' '}
          <a href="https://chat.hoangnamaudio.vn" className="text-blue-600 hover:underline">
            chat.hoangnamaudio.vn
          </a>
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Quyền xóa dữ liệu của bạn</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Theo chính sách bảo mật của ChatOn, bạn có quyền yêu cầu xóa toàn bộ dữ liệu cá nhân
              và dữ liệu hội thoại liên quan đến tài khoản của bạn bất kỳ lúc nào.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Dữ liệu sẽ được xóa</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Thông tin tài khoản (tên, email)</li>
              <li>Toàn bộ hội thoại và tin nhắn từ Facebook Messenger, Zalo OA, Livechat</li>
              <li>Thông tin khách hàng liên quan đến tài khoản của bạn</li>
              <li>Đơn hàng, sản phẩm và cài đặt</li>
              <li>Token kết nối Facebook Page và Zalo OA (sẽ bị thu hồi)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Cách yêu cầu xóa dữ liệu</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">Gửi email yêu cầu xóa dữ liệu</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Gửi email đến{' '}
                    <a href="mailto:hoangnamaudio@gmail.com" className="text-blue-600 hover:underline font-medium">
                      hoangnamaudio@gmail.com
                    </a>{' '}
                    với tiêu đề <strong>"Yêu cầu xóa dữ liệu ChatOn"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">Cung cấp thông tin xác minh</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Trong email, vui lòng cung cấp: địa chỉ email đăng ký tài khoản ChatOn và
                    tên Facebook Page / Zalo OA đã kết nối (nếu có).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">Xác nhận và xử lý</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Chúng tôi sẽ xác nhận yêu cầu qua email và tiến hành xóa dữ liệu. Toàn bộ dữ liệu
                    sẽ được xóa vĩnh viễn trong vòng <strong>30 ngày</strong> kể từ khi nhận được yêu cầu.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Lưu ý</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
              <li>Sau khi xóa, dữ liệu <strong>không thể khôi phục</strong>.</li>
              <li>Việc xóa dữ liệu trên ChatOn không ảnh hưởng đến dữ liệu trên Facebook hoặc Zalo của bạn.</li>
              <li>Nếu bạn chỉ muốn ngắt kết nối Facebook Page hoặc Zalo OA (không xóa tài khoản),
                bạn có thể thực hiện trong phần <strong>Cài đặt &rarr; Kênh bán hàng</strong> của ChatOn.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Liên hệ</h2>
            <ul className="text-sm text-slate-600 leading-relaxed space-y-1">
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

          <section>
            <p className="text-sm text-slate-500">
              Xem thêm{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Chính sách bảo mật
              </Link>{' '}
              của ChatOn.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} ChatOn — Hoàng Nam Audio. Mọi quyền được bảo lưu.
      </footer>
    </div>
  );
}
