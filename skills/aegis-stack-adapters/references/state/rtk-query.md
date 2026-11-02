# RTK Query

Dùng `baseQuery` tuỳ biến bọc lõi (lõi đã lo ký + phiên):

```ts
const aegisBaseQuery: BaseQueryFn<{action: string; params?: object; route?: string}> = async ({action, params, route}) => {
  const r = await client.execute(action, params ?? {}, {route});
  return r.kind === 'ok' ? {data: r.data} : {error: {kind: r.kind, message: r.message, code: r.code}};
};
export const api = createApi({baseQuery: aegisBaseQuery, endpoints: b => ({
  claims: b.query({query: p => ({action: ACTIONS.CLAIM_LIST, params: p})}),
})});
```

Không dùng `fetchBaseQuery` (nó tự serialize body → lệch chữ ký). Session store: như redux-toolkit.md.
