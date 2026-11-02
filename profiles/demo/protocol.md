# Protocol — profile `demo` (GIẢ)

> Backend bịa, chỉ để minh hoạ cấu trúc một `protocol.md` mà agent sẽ viết cho backend thật. Trong project thật, **mỗi dòng phải có nguồn `file:line`** trỏ về app tham chiếu.

## Tóm tắt

- Mọi lời gọi nghiệp vụ là `POST {baseUrl}/v1/execute`. Hành động được chọn bằng header `xAction`.
- Body: `{meta: {...thiết bị, thời gian}, payload: {...defaults, ...params}}`.
- Chữ ký `xSign` = `sha256_hex(base64url(JSON(payload)) + "." + secret)`.
- Login: `POST v1/login`. Ký JWS HS256 trên params, không gộp defaults.
- Response: `{status: {code: "OK"|"FAIL", message, error}, data}`.

## Phiên

| Tình huống | Nhận biết | Xử lý |
|---|---|---|
| Token hết hạn | message `Token has expired.` hoặc code `E_TOKEN_EXPIRED` | `POST v1/refresh` với `{access, refresh}` → gọi lại |
| Phiên hết hạn | `Session has expired.` / `E_SESSION_EXPIRED` | Login lại bằng credentials đã lưu → gọi lại |
| Sai thiết bị | `Signed in on another device.` / `E_AUTH` | Logout |

## Nguồn (ví dụ định dạng)

- Envelope: `examples/demo-app/src/services/client.ts:34`
- Chữ ký: `examples/demo-app/src/services/client.ts:12`
- Xử lý phiên: `examples/demo-app/src/services/client.ts:40`
