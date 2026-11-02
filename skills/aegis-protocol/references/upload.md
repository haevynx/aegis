# Upload file / ảnh / video

- Thường là route riêng, `multipart/form-data`, **không** đi qua endpoint chung (endpoint chung parse JSON).
- Chữ ký thường tính trên chuỗi `k=v&…` của vài field cố định (recipe `kv-string-hash`) thay vì JSON — đọc đúng danh sách + thứ tự field trong code app cũ.
- Ảnh: nén/resize trước khi gửi (đọc thông số trong app cũ: chất lượng, kích thước tối đa), gắn metadata (hạng mục, toạ độ, thời gian chụp) nếu app cũ gửi.
- Upload nhiều ảnh: tuần tự hay song song, retry từng ảnh, trạng thái từng ảnh trên UI — đọc từ app cũ.
- Lỗi upload thường **không** alert ở lõi (để màn hình hiển thị theo từng ảnh).
- Thêm route vào profile: `routes.upload = {path, signing: {recipe: 'kv-string-hash', fields: [...]}, headers: {...}}`; transport multipart riêng.
