# Đọc một chức năng

## Bản đồ từ `aegis feature`

| Trường JSON | Dùng cho spec |
|---|---|
| `screens[].file` | danh sách màn (file kết thúc bằng Screen/Page/View) và component con |
| `fields` | bảng trường: `name` (field API/form), `label`, `required`, `component` (loại input) |
| `actions` + `actionIndex` | luồng API: key, mã, mô tả — **thứ tự** phải đọc tay trong code |
| `conditions` | ứng viên quy tắc nghiệp vụ (lọc: bỏ điều kiện kỹ thuật như null-check, timer) |
| `messages` kind `ui` | thông báo cố định cho người dùng (thường gắn với một quy tắc) |
| `messages` kind `ui-dynamic` | hiển thị message từ server (`expr`) |
| `messages` kind `server` | message server được so khớp để rẽ nhánh — quy tắc quan trọng |
| `navigation` | luồng màn hình, chức năng liên quan |
| `subFeatures` | chức năng con (mỗi cái có thể cần spec riêng) |

## Đọc tay — câu hỏi cho mỗi màn

1. Vào màn thì gọi gì (mount/focus)? Tham số lấy từ đâu (route params, store)?
2. Dữ liệu response nào được hiển thị, ở khối nào?
3. Mỗi nút: điều kiện bật/ẩn, validate, action gọi, xử lý thành công/thất bại, điều hướng sau đó.
4. Trạng thái hồ sơ nào cho phép thao tác gì? (tìm so sánh với trường trạng thái)
5. Phân quyền: điều kiện theo vai trò/quyền người dùng?
6. Danh mục (dropdown) lấy từ action nào, cache ở đâu?
7. Offline/nháp: có lưu tạm không?

## Lọc điều kiện

Giữ: so sánh trạng thái, số lượng, số tiền, ngày, quyền, message server. Bỏ: kiểm tra null kỹ thuật, timer, platform (trừ khi khác hành vi nghiệp vụ).
