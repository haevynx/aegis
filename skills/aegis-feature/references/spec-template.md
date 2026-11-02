# Mẫu spec (rút gọn)

Bản đầy đủ: `~/.aegis/kit/templates/feature-spec.md`. Các mục bắt buộc:

1. Mục đích & người dùng
2. Vị trí trong vòng đời hồ sơ
3. Màn hình — bảng trường (field API · kiểu · bắt buộc · nguồn danh mục · **nguồn**)
4. Luồng API theo thứ tự (khi · action · tham số · field response dùng · **nguồn**)
5. Quy tắc nghiệp vụ (quy tắc · hệ quả · **nguồn**) + message server xử lý riêng
6. Khác biệt giữa các app tham chiếu
7. Câu hỏi mở

Ví dụ một dòng quy tắc:

| Quy tắc | Hệ quả | Nguồn |
|---|---|---|
| Phải có ≥ 4 ảnh tổn thất mới được kết thúc giám định | chặn, thông báo "Cần chụp tối thiểu 4 ảnh tổn thất" | `src/screens/ClaimInspection/ClaimInspectionScreen.tsx:18` |
