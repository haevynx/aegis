# Vue / Nuxt

- **Lõi:** `reference/ts` dùng nguyên.
- **Nuxt:** ký ở `server/api/aegis.post.ts` (Nitro), secret qua `runtimeConfig` (không đặt trong `public`). Client gọi `$fetch('/api/aegis', {method: 'POST', body: {action, params}})`. Session trong cookie `httpOnly` (`useCookie` phía server).
- **Vue SPA:** như React SPA — secret lộ ở browser, cảnh báo người dùng.
- **State:** Pinia (xem state/pinia.md).
