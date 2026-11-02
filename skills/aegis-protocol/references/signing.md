# Ký request

Công thức: `~/.aegis/kit/spec/signing-recipes.md`. Tóm tắt:

| recipe | công thức |
|---|---|
| `hash-b64url-dot-secret` | `sha256_hex(base64url(utf8(JSON(data))) + "." + secret)` |
| `jws-hs256` | JWS compact, header từ profile, payload = data, key = utf8(secret) |
| `hmac-sha256` | `hmac_sha256_hex(secret, input)` |
| `kv-string-hash` | như recipe 1 trên chuỗi `k=v&…` |

## Serialize — nguyên nhân số 1 khiến chữ ký sai

Phải tái tạo **đúng byte** của `JSON.stringify` (JavaScript):

| Điểm | JS `JSON.stringify` | Cần chú ý ở |
|---|---|---|
| Khoảng trắng | không có | Python `json.dumps` mặc định có `", "` → `separators=(',', ':')` |
| Non-ASCII | giữ nguyên UTF-8 | Python `ensure_ascii=True` mặc định; Swift `JSONEncoder` escape `/` → `.withoutEscapingSlashes` |
| Thứ tự key | thứ tự chèn | Swift `JSONEncoder` không đảm bảo → tự serialize; Kotlin `Map` → `LinkedHashMap`; Dart `Map` literal giữ thứ tự ✓ |
| Số | `1`, `1.5`, `0`; số nguyên lớn > 2^53 mất chính xác | Dart/Kotlin double `1.0` → phải in `1` |
| `null` | `null` | bỏ field null là SAI |
| `undefined` | bị bỏ khỏi object | — |
| Escape | `"` `\\` `\n` `\u00XX` cho ký tự điều khiển | khớp các lib chuẩn |

`base64url`: base64 chuẩn → `+`→`-`, `/`→`_`, bỏ `=`. Mã hoá **UTF-8 bytes**, không phải UTF-16.

## Gỡ lỗi khi vector không khớp

1. In chuỗi đầu vào (`input`) ở cả hai phía với secret giả, so từng byte (hexdump).
2. Khác ở thứ tự key → xem lại thứ tự defaults/params.
3. Khác ở dấu tiếng Việt → escape Unicode / normalize (NFC vs NFD!).
4. Khác ở số → kiểu số.
5. Giống input nhưng khác hash → sai recipe (hex/base64, ký tự nối, có base64url hay không).

Không bao giờ "sửa vector cho khớp".
