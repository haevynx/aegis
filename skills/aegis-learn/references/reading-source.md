# Đọc tầng service của app tham chiếu

Không giả định bố cục. Tìm theo **tín hiệu**, xác nhận bằng cách đọc.

## Tìm

| Cần tìm | Tín hiệu (grep) |
|---|---|
| HTTP client | `axios.create`, `fetch(`, `Dio(`, `Retrofit.Builder`, `URLSession`, `interceptors` |
| Hàm ký | `sha256`, `hmac`, `jws`/`JWS.sign`, `createHash`, `CryptoJS`, `base64url`/`b64u`, tên header có chữ `sign` |
| Header | object gán vào `headers:` trong lời gọi HTTP; interceptor request |
| Envelope | object được `post(url, <đây>)` — các key cấp 1 |
| Tham số mặc định | hàm được spread vào dữ liệu trước params (`{...defaults(), ...params}`) — thứ tự spread quyết định ai ghi đè ai |
| Response | so sánh trạng thái sau khi nhận (`=== 'OK'`, `status.code`, `success`) |
| Phiên | nhánh xử lý message/code hết hạn → refresh → gọi lại; login lại; logout |
| Môi trường | object cấu hình có base URL (thường nhiều bản: DEV/UAT/PROD), nơi chọn bản đang dùng (runtime setting / build flag) |
| Mã action | bảng hằng số `KEY: 'CODE' // mô tả` — dùng `aegis scan`, đã có trong `actions.json` |
| Route riêng | URL không đi qua endpoint chung; cơ chế viết lại URL tự động (interceptor đổi `url`) |

## Đọc kỹ những chỗ hay sai

1. **Chuỗi được ký là gì, chính xác?** `JSON.stringify(x)` của object nào (data hay cả body)? Có `base64url` trước khi hash không? Nối với secret bằng ký tự gì? Hex hay base64?
2. **Login có ký khác không?** Thường dùng JWS/HMAC riêng, không gộp tham số mặc định.
3. **Upload FormData** thường ký trên chuỗi `k=v&…` của vài field cố định.
4. **Nhiều bản copy của cùng một helper** (mỗi file endpoint một bản) có thể **khác nhau** — so sánh, ghi khác biệt.
5. **Code bị comment** là lịch sử, không phải hành vi hiện tại.
6. **Ngoại lệ theo action:** danh sách action được xử lý lỗi riêng (không alert, trả về cho màn hình tự xử lý) — đưa vào `protocol.md` mục Biến thể, và vào spec chức năng liên quan.
7. **Ngữ nghĩa JS ngầm trong tham số mặc định** — ảnh hưởng trực tiếp chữ ký:
   - `a?.b || null` → template `{…b || null}` (chuỗi rỗng/0/false → `null`);
   - `a?.b` không có `|| null` → template `{…b?}` (thiếu thì **key biến mất** khỏi JSON, vì `JSON.stringify` bỏ `undefined`);
   - `a?.b ?? null` → `{…b}`.
   Luôn thêm vector cho trường hợp **chưa đăng nhập** và **trường rỗng**.
8. **Message so khớp chính xác** (có dấu chấm cuối, có dấu tiếng Việt) — chép đúng từng ký tự vào `session.*.messages`.

## Ghi nguồn

Định dạng `đường/dẫn/tương-đối:dòng` tính từ gốc app tham chiếu. Một quy tắc có nhiều nguồn → liệt kê tất cả. Không có nguồn → không ghi như sự thật.
