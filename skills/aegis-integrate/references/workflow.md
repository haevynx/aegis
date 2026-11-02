# Quy trình chi tiết

## 1–2. Học từ app tham chiếu

```bash
aegis ref add ~/path/to/app-cu --name app-cu     # hoặc git-url (clone chỉ đọc vào ~/.aegis/refs)
aegis scan                                       # → .aegis/knowledge/app-cu/
```

Đọc theo thứ tự: `knowledge.json` → `confidence` (mục nào `low`/`none` thì phải đọc tay), `environments.json` (tên biến `.env` cần), `http-files.json` (file tầng service), `actions.json`, `endpoints.json`, `server-messages.json`, `features/_index.json`.

Nhiều app tham chiếu (vd cùng backend, khác khách hàng): `aegis ref add` từng app → `aegis scan` → `aegis diff --ref a --ref b --verbose` → hỏi người dùng app nào là chuẩn.

## 4. Profile

`aegis profile learn` tạo `.aegis/learn/profile-sources.md` (bằng chứng có dòng) + khung `.aegis/profile/profile.json`. Mở **trực tiếp** các file nguồn trong app tham chiếu để đọc đủ ngữ cảnh. Điền profile theo `spec/profile-schema.md` của kit (ví dụ: `~/.aegis/kit/profiles/demo/profile.json`). Viết `protocol.md`: mỗi dòng một nguồn.

## Vector local (khuyến nghị mạnh)

Mục tiêu: chứng minh client mới ký **giống hệt** app cũ.

1. Trong scratch dir (không phải repo), viết script nhỏ gọi **đúng hàm ký của app cũ** (import từ source app cũ, hoặc chép nguyên thuật toán + dùng chính thư viện trong `node_modules` của app cũ) với **secret GIẢ** (vd `test-secret`), input cố định có tiếng Việt có dấu, `null`, số `0`, object lồng.
2. Ghi kết quả theo định dạng `profiles/demo/vectors.json` của kit vào `.aegis/vectors/<ref>.json` (secret giả nằm trong file là chấp nhận được; KHÔNG BAO GIỜ dùng secret thật).
3. `aegis vectors` → phải khớp 100%. Thêm test cùng vector vào test suite của project đích.

## 7–8. Sinh client

- Copy cấu trúc của `~/.aegis/kit/reference/ts` (TS/JS) hoặc `reference/dart` (Flutter); stack khác: dịch theo `aegis-stack-adapters/references/stacks/<stack>.md`.
- Đọc profile lúc build (import JSON) hoặc sinh hằng số từ profile — không chép tay giá trị.
- Cấu hình runtime (`baseUrl`, `secret`, `partner`, `env`) đọc từ `.env` theo `profile.env.vars`, qua cơ chế env của stack (vd `react-native-config`, `import.meta.env`, `--dart-define`, BuildConfig).
- Mã action: một file hằng số sinh từ `.aegis/knowledge/<ref>/actions.json` — giữ comment mô tả + nguồn. Không có trong knowledge → `<ACTION:KEY>`.

> ⚠️ Secret nằm trong app mobile đã build thì **luôn trích xuất được**. Đó là thiết kế của backend, không phải lỗi của bạn — nhưng hãy nói với người dùng nếu họ có thể chuyển việc ký sang server/BFF.

## 10. So request

Cùng một input (action, params, session, device, thời gian cố định, secret giả): request do client mới tạo ra (url, header, body) phải bằng request do code của app cũ tạo ra. Cách làm nhanh nhất: chính là vector local ở trên, thêm 2–3 case thực tế lấy từ màn hình (vd danh sách hồ sơ, chi tiết hồ sơ).

## 11. Smoke test

Chỉ khi người dùng đã điền `.env` và đồng ý: login → một action chỉ đọc (vd danh sách). Không gọi action ghi/xoá/duyệt. Không in token/response chứa dữ liệu cá nhân ra log.
