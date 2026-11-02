---
name: aegis-protocol
description: Kiến thức tổng quát về giao thức API kiểu "signed envelope" hay gặp ở backend bảo hiểm/tài chính — đóng gói body, header, các công thức ký (hash-b64url-dot-secret, JWS HS256, HMAC, chuỗi k=v), phân loại response, chính sách phiên (refresh → gọi lại, login lại, logout), upload file, gom route về endpoint chung, SSO/OIDC, thanh toán, push. Dùng khi sinh hoặc review lõi client theo .aegis/profile/profile.json, hoặc khi chữ ký/vector không khớp.
---

# aegis-protocol — lõi client chạy theo profile

Profile (`.aegis/profile/profile.json`) là cấu hình; lõi client là code **không đổi** giữa các backend. Implementation mẫu có test: `~/.aegis/kit/reference/ts/` (TS) và `reference/dart/` (Dart).

## Kiến trúc bắt buộc

```
App UI ──► feature code ──► AegisClient.execute(action, params) ──► Result
                                  │
             profile.json ───────►├─ buildRequest: envelope + defaults + headers + signature
             .env (config) ──────►├─ transport (fetch/axios/dio/…)  ── network → Result{network}
             SessionStore ◄──────►├─ classify(response) → ok | business-error | token-expired | session-expired | auth-invalid | unexpected
             hooks ◄──────────────┴─ session policy: refresh→retry (1 lần) · relogin→retry (1 lần) · logout
```

- `execute(action, params, {route?})`, `login(credentials)`, `refresh()`, `logout()`, `buildRequest(...)` (để test/vector).
- `Result = {kind, data?, message?, code?, httpStatus?, raw?}` — UI quyết định hiển thị; lõi **không** Alert/toast/điều hướng.
- `SessionStore {get, set, clear}` — state manager implement (xem aegis-stack-adapters/references/state).
- Hooks: `onLogout`, `onSessionExpired`, `onServerMessage`.
- Crypto inject được (WebCrypto mặc định; RN cần provider).

## Tài liệu

| Chủ đề | File |
|---|---|
| Đóng gói body, defaults, meta, template | [references/envelope.md](references/envelope.md) |
| Công thức ký + bẫy serialize | [references/signing.md](references/signing.md) |
| Phân loại response + chính sách phiên | [references/response-session.md](references/response-session.md) |
| Upload file / ảnh / video | [references/upload.md](references/upload.md) |
| Endpoint chung, route riêng, viết lại URL | [references/routing.md](references/routing.md) |
| SSO / OIDC | [references/sso-oidc.md](references/sso-oidc.md) |
| Thanh toán (cổng thanh toán, QR) | [references/payment.md](references/payment.md) |
| Push notification (đăng ký token thiết bị) | [references/push.md](references/push.md) |

## Quy tắc khi sinh code

1. Giá trị (tên header, path, recipe, message) **đọc từ profile**, không hardcode lại trong code.
2. Giữ **đúng thứ tự key** của header/body như profile — chữ ký có thể phụ thuộc thứ tự.
3. Mỗi recipe có unit test bằng vector (`.aegis/vectors` hoặc `profiles/demo/vectors.json`).
4. Retry tối đa 1 lần mỗi bước; không vòng lặp refresh.
5. Log: không in secret, token, mật khẩu, dữ liệu cá nhân; chỉ in action + kind + message.
