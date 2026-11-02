# TanStack Query

```ts
const unwrap = (r: Result) => { if (r.kind !== 'ok') throw Object.assign(new Error(r.message ?? r.kind), r); return r.data; };
export const useClaims = (p) => useQuery({queryKey: ['claims', p], queryFn: async () => unwrap(await client.execute(ACTIONS.CLAIM_LIST, p))});
export const useFinishClaim = () => useMutation({mutationFn: async p => unwrap(await client.execute(ACTIONS.CLAIM_FINISH, p))});
```

- `retry`: không retry `business-error`/`auth-invalid` (`retry: (n, e) => e.kind === 'network' && n < 2`). Lõi đã tự refresh/login lại.
- `onLogout` → `queryClient.clear()`.
- Session lưu ở Zustand/Jotai/Context + secure storage (TanStack Query không phải nơi giữ session).
