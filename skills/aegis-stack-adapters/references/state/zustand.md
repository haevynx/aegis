# Zustand

```ts
type Auth = {session: Session | null; set: (s: Session | null) => void};
export const useAuth = create<Auth>(set => ({session: null, set: session => set({session})}));
export const zustandSessionStore = (secure): SessionStore => ({
  async get() { return useAuth.getState().session ?? (await secure.load()); },
  async set(s) { await secure.save(s); useAuth.getState().set(stripCredentials(s)); },
  async clear() { await secure.clear(); useAuth.getState().set(null); },
});
```

UI phản ứng logout: `const session = useAuth(s => s.session)` → `null` thì router chuyển về Login. Dữ liệu server: kết hợp TanStack Query (tanstack-query.md).
