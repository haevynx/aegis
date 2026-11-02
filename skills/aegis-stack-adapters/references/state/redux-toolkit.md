# Redux Toolkit

```ts
// authSlice: {session: Session | null}; actions setSession, clearSession
export const reduxSessionStore = (store, secure): SessionStore => ({
  async get() { return store.getState().auth.session ?? (await secure.load()); },
  async set(s) { await secure.save(s); store.dispatch(setSession(stripCredentials(s))); },
  async clear() { await secure.clear(); store.dispatch(clearSession()); },
});
// hooks.onLogout: dispatch(clearSession()) + điều hướng về Login (navigation ref) — ở tầng app, không ở lõi.
```

- **Không** để credentials/token trong redux-persist (AsyncStorage). Persist chỉ phần không nhạy cảm; token đọc lại từ secure storage khi khởi động.
- Gọi API: thunk `createAsyncThunk('claims/list', p => client.execute(ACTIONS.CLAIM_LIST, p))` — reject khi `kind !== 'ok'` với `{kind, message}`.
