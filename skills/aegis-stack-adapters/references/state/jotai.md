# Jotai

```ts
export const sessionAtom = atom<Session | null>(null);
export const jotaiSessionStore = (store = getDefaultStore(), secure): SessionStore => ({
  async get() { return store.get(sessionAtom) ?? (await secure.load()); },
  async set(s) { await secure.save(s); store.set(sessionAtom, stripCredentials(s)); },
  async clear() { await secure.clear(); store.set(sessionAtom, null); },
});
```

Dữ liệu server: `atomWithQuery` (jotai-tanstack-query) hoặc TanStack Query.
