# Endpoint chung & route riêng

- **Endpoint chung (execute):** một URL, hành động chọn bằng header mã action. `routes.execute`.
- **Route riêng:** một số hành động có URL riêng (login, refresh, upload, xuất PDF, đối tác bên ngoài…). Khai báo `routes.<tên>` và gọi `execute(action, params, {route: '<tên>'})`.
- **Viết lại URL tự động:** có app cũ dùng interceptor đổi URL riêng thành endpoint chung, trừ một danh sách giữ lại. Khi tích hợp: không cần interceptor — gọi thẳng `routes.execute`, chỉ khai báo route riêng cho các ngoại lệ thật sự (đọc danh sách giữ lại trong code app cũ, ghi nguồn).
- URL của bên thứ ba (OCR, nhận dạng biển số, bản đồ…): không đi qua lõi client; client riêng, key riêng trong `.env`.
