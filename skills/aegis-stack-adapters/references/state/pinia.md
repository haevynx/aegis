# Pinia

```ts
export const useAuth = defineStore('auth', {state: () => ({session: null as Session | null})});
export const piniaSessionStore = (secure): SessionStore => ({
  async get() { return useAuth().session ?? (await secure.load()); },
  async set(s) { await secure.save(s); useAuth().session = stripCredentials(s); },
  async clear() { await secure.clear(); useAuth().$reset(); },
});
```

Nuxt: lõi chạy ở server (`server/api`) → SessionStore đọc/ghi cookie httpOnly thay vì Pinia; Pinia chỉ giữ thông tin hiển thị user.
