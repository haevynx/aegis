# MobX

```ts
class AuthStore { session: Session | null = null; constructor(private secure) { makeAutoObservable(this); }
  setSession(s) { this.session = s; } }
export const mobxSessionStore = (auth: AuthStore): SessionStore => ({
  async get() { return auth.session ?? (await auth.secure.load()); },
  async set(s) { await auth.secure.save(s); runInAction(() => auth.setSession(stripCredentials(s))); },
  async clear() { await auth.secure.clear(); runInAction(() => auth.setSession(null)); },
});
```

Gọi API trong action `flow`/async; cập nhật observable trong `runInAction`.
