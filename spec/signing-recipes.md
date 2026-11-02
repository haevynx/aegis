# Công thức ký (signing recipes)

Các công thức ký request **tổng quát**, hay gặp ở backend bảo hiểm và tài chính. Profile chọn một công thức qua `signing.recipe`. Mọi công thức là hàm thuần của `(input, secret)`.

## Chuỗi đầu vào (`signing.over`)

| `over` | `input` |
|---|---|
| `data` (mặc định) | `JSON.stringify(data)`. `data` = `envelope.defaults` gộp với params (params ghi đè) |
| `body` | `JSON.stringify(body)`, tức cả body sau khi đóng gói |
| `fields` | `k1=v1&k2=v2…` theo `signing.fields`; giá trị thiếu thì để chuỗi rỗng |

> ⚠️ **Lệch serialize là lỗi hay gặp nhất.** Chữ ký phụ thuộc từng byte của chuỗi JSON. Mọi implementation phải tái tạo **đúng `JSON.stringify` của JavaScript**:
> - giữ thứ tự key theo thứ tự chèn;
> - không có khoảng trắng;
> - ký tự non-ASCII (tiếng Việt có dấu) để nguyên UTF-8, không escape `\uXXXX`;
> - `null` vẫn giữ;
> - số nguyên lớn không bị đổi thành số thực.
>
> Dart `jsonEncode`, Kotlin `kotlinx.serialization`, Swift `JSONEncoder` đều có điểm khác. Xem `skills/aegis-stack-adapters`.

## Các công thức

| `recipe` | Kết quả | Tuỳ chọn |
|---|---|---|
| `hash-b64url-dot-secret` | `HASH( base64url(utf8(input)) + "." + secret )` | `alg`: `sha256`/`sha512`, `encoding`: `hex`/`base64` |
| `kv-string-hash` | Giống trên, nhưng `input` là chuỗi `fields` | `fields`, `alg`, `encoding` |
| `hmac-sha256` | `HMAC_SHA256(key = utf8(secret), input)` | `encoding` |
| `jws-hs256` | JWS compact: `b64url(JSON(header)) . b64url(JSON(payload)) . b64url(HMAC_SHA256(secret, …))`, với `payload` = `data` | `jwsHeader` |
| `none` | Chuỗi rỗng | — |

`base64url` = base64 chuẩn, đổi `+`→`-`, `/`→`_`, bỏ `=` ở cuối.

## Thêm công thức mới

1. Thêm vào `lib/recipes.mjs` (Node) **và** `reference/ts/recipes.ts` (+ `reference/dart`).
2. Thêm một case vào `profiles/demo/vectors.json`, sinh bằng `scripts/gen-demo-vectors.mjs`, rồi chạy `npm test`.
3. Không đưa vào recipe nào đặc thù của một công ty. Recipe phải mô tả được bằng toán, không bằng tên khách hàng.
