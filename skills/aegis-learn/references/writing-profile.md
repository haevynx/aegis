# Viết profile.json

Schema: `~/.aegis/kit/spec/profile-schema.md`. Ví dụ đầy đủ: `~/.aegis/kit/profiles/demo/profile.json`. Công thức ký: `~/.aegis/kit/spec/signing-recipes.md`.

## Ánh xạ từ code sang profile

| Trong code app cũ | Trong profile |
|---|---|
| Key bọc dữ liệu nghiệp vụ trong body | `envelope.dataKey` |
| Key/khối thông tin thiết bị–thời gian | `envelope.metaKey`, `envelope.meta` (template `{device.*}`, `{now:fmt}`) |
| Hàm tham số mặc định (spread trước params) | `envelope.defaults` (template `{session.*}`, `{device.*}`, `{config.*}`; `x \|\| null` → `{x \|\| null}`; `x` có thể undefined → `{x?}`) |
| Object header (giữ **đúng thứ tự + chính tả**, kể cả lỗi chính tả của backend) | `headers` |
| Hàm ký | `signing.recipe` + `over` + `alg`/`encoding`/`fields`/`jwsHeader` |
| URL endpoint chung | `routes.execute.path` |
| Login / refresh | `routes.login` (`action`, `defaults:false`, `signing`, `headers`), `routes.refresh` (`body`, `headers`) |
| Kiểm tra thành công | `response.statusPath` + `okValues` |
| Đọc message/mã lỗi/dữ liệu | `response.messagePath` / `codePath` / `dataPath` |
| Token trong response login/refresh | `session.fromLogin` / `fromRefresh` |
| Nhánh hết hạn / sai thiết bị | `session.tokenExpired` / `sessionExpired` / `authInvalid` |
| Login lại bằng tài khoản đã lưu | `session.relogin: "stored-credentials"` (bắt buộc secure storage — ghi chú cho người dùng) |
| Biến môi trường | `env.vars` (tên biến `.env`), `env.environments` |

Không có recipe phù hợp → **không ép**. Ghi vào Câu hỏi mở, mô tả thuật toán bằng toán học, đề xuất thêm recipe mới vào kit (PR không chứa dữ liệu công ty).

## Cổng duyệt

Trình bày cho người dùng: bảng 1 dòng/mục (giá trị — nguồn — độ tin cậy) + câu hỏi mở. Chỉ sau khi họ duyệt mới sinh client.
