# Độ tin cậy

| Mức | Khi nào | Được dùng để |
|---|---|---|
| **cao** | Đọc trực tiếp trong code đang chạy (không comment), một nguồn rõ ràng, và (với chữ ký) vector local khớp | Sinh code |
| **trung bình** | Có nguồn nhưng: nhiều bản copy khác nhau, hoặc phụ thuộc cấu hình runtime, hoặc chưa có vector | Sinh code + ghi chú rủi ro + hỏi người dùng |
| **thấp** | Chỉ suy ra từ tên biến/comment, hoặc từ một app tham chiếu khác | **Không** sinh code — Câu hỏi mở |
| **không có** | Không tìm thấy | Placeholder + hỏi |

`aegis scan` tự chấm sơ bộ (`confidence` trong knowledge.json) — bạn phải chấm lại sau khi đọc tay.
