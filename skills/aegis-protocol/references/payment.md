# Thanh toán

Mẫu hay gặp ở app bán bảo hiểm:

1. Tạo đơn (action nghiệp vụ) → nhận mã đơn + số tiền.
2. Yêu cầu link/QR thanh toán từ backend (backend ký với cổng thanh toán — **không** ký ở app).
3. Mở link (in-app browser) hoặc hiển thị QR (chuẩn QR ngân hàng).
4. Nhận kết quả qua deep link return URL **và** xác minh lại trạng thái với backend (không tin tham số trên URL).
5. Màn hình kết quả: thành công / thất bại / đang xử lý (polling có giới hạn).

Khoá bí mật của cổng thanh toán **không bao giờ** nằm trong app. Nếu app cũ có → báo người dùng.
