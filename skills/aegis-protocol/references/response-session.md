# Response & phiên

## Phân loại

1. Không có JSON / sai dạng → `unexpected` (kèm httpStatus).
2. `get(statusPath) ∈ okValues` → `ok`, `data = get(dataPath)`.
3. Không có trạng thái → `unexpected`.
4. So `message` (trim, khớp chính xác) và `code` với `session.tokenExpired` → `sessionExpired` → `authInvalid`.
5. Còn lại → `business-error` (lỗi nghiệp vụ, có message để hiển thị).
6. Transport ném lỗi → `network`.

HTTP 4xx/5xx có body đúng dạng → vẫn phân loại theo body.

## Chính sách

| Kind | Hành động | Giới hạn |
|---|---|---|
| `token-expired` | refresh → ok: gọi lại; refresh trả `session-expired` → nhánh dưới; refresh lỗi khác (≠ network) → logout | 1 lần |
| `session-expired` | `relogin=stored-credentials` + có credentials → login → ok: gọi lại, lỗi: logout. `relogin=none` → `onSessionExpired` | 1 lần |
| `auth-invalid` | xoá session → `onLogout` | — |
| `business-error` | `onServerMessage` → UI hiển thị | — |

## Message nghiệp vụ đặc biệt

Một số message server mang ý nghĩa điều hướng (vd "chưa đặt lịch", "chưa đủ ảnh") — màn hình xử lý **riêng** thay vì alert chung. Danh sách nằm trong `.aegis/knowledge/<ref>/server-messages.json` và trong source (tìm `message === '…'`). Đưa vào spec chức năng, không vào lõi client.

## Lưu credentials

`stored-credentials` nghĩa là app cũ giữ tài khoản để tự login lại. Nếu giữ hành vi này: **secure storage** bắt buộc, và nói rõ rủi ro cho người dùng. Tốt hơn: hỏi backend có refresh token dài hạn không.
