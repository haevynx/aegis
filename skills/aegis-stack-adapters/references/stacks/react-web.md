# React web / Next.js

- **Lõi:** dùng nguyên `reference/ts` (WebCrypto có sẵn trong browser và Node ≥ 19).
- **Secret trong browser = công khai.** Ưu tiên ký ở server:
  - **Next.js:** đặt client trong `app/api/aegis/route.ts` (Route Handler) hoặc Server Action; browser gọi `/api/aegis` với `{action, params}`; server ký bằng `process.env.AEGIS_SECRET_KEY` (không có tiền tố `NEXT_PUBLIC_`). Session (token) lưu cookie `httpOnly`, `SessionStore` đọc/ghi cookie.
  - **SPA (Vite/CRA) không có server:** secret sẽ nằm trong bundle → báo người dùng; đề xuất BFF nhỏ.
- **Env:** Next `process.env.*` (server); Vite `import.meta.env.VITE_*` (lộ ra browser).
- **Device id:** web không có id thiết bị ổn định → sinh UUID lưu `localStorage` (hoặc theo yêu cầu backend — hỏi người dùng).
- **Transport:** `fetch`.
