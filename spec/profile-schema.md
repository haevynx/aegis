# Profile backend (`.aegis/profile/profile.json`)

Profile mô tả **cách nói chuyện với một backend**: đóng gói request, ký, header, đọc response, xử lý phiên. Client mẫu (`reference/ts`, `reference/dart`) và mọi adapter đều chạy theo profile, nên đổi backend thì chỉ cần đổi profile, không phải sửa code.

Profile được agent **học từ app tham chiếu** (`aegis profile learn`, skill `aegis-learn`) rồi người dùng duyệt. Mỗi giá trị trong `protocol.md` đi kèm phải có nguồn `file:line`.

Ví dụ đầy đủ (dữ liệu giả): [`profiles/demo/profile.json`](../profiles/demo/profile.json).

## Template

Mọi chuỗi trong `envelope.meta`, `envelope.defaults`, `headers`, `routes.*.headers`, `routes.*.body` đều có thể chứa template:

| Template | Giá trị |
|---|---|
| `{config.<key>}` | Cấu hình runtime, đọc từ `.env`: `baseUrl`, `secret`, `partner`, `env`… |
| `{session.<path>}` | Session hiện tại, vd `{session.accessToken}`, `{session.user.username}` |
| `{device.<key>}` | Thông tin thiết bị do app cung cấp: `id`, `bundleId`, `userAgent`… |
| `{action}` | Mã action của lời gọi (hoặc `routes.<r>.action`) |
| `{signature}` | Chữ ký đã tính |
| `{now:<fmt>}` | Thời gian hiện tại theo giờ máy; `fmt` gồm `yyyy MM dd HH mm ss` |

- Chuỗi **chỉ gồm một template** thì giữ nguyên kiểu giá trị (`null`, số…).
- Template **lẫn trong chuỗi** thì được nối thành chuỗi; thiếu giá trị thì thay bằng chuỗi rỗng.
- Header có giá trị `null` thì thành `""`.

**Hậu tố tái hiện ngữ nghĩa JS của app cũ.** Hai hậu tố này ảnh hưởng chữ ký, và đã được kiểm chứng trên app thật:

| Viết | Nghĩa | Tương đương JS trong app cũ |
|---|---|---|
| `{x \|\| null}` | falsy (`""`, `0`, `false`, thiếu) → `null` | `x \|\| null` |
| `{x?}` | thiếu (undefined) → **bỏ key** khỏi object | `JSON.stringify` bỏ key có giá trị `undefined` |
| `{x}` | thiếu → `null` (giữ key) | `x ?? null` |

Đọc kỹ app cũ để chọn đúng: `a?.b` (không `|| null`) mà thiếu thì key **biến mất** khỏi JSON được ký.

## Các trường

| Trường | Ý nghĩa |
|---|---|
| `name`, `description` | Tên profile |
| `transport.method` / `contentType` / `timeoutMs` | Mặc định `POST`, JSON, 300000 |
| `envelope.dataKey` | Key bọc dữ liệu nghiệp vụ trong body; `null` = body chính là dữ liệu |
| `envelope.metaKey` + `envelope.meta` | Khối metadata đi kèm (thiết bị, thời gian…); `null` = không có |
| `envelope.defaults` | Tham số mặc định gộp vào **trước** params của mỗi lời gọi (params ghi đè) |
| `headers` | Bảng header mặc định, giữ đúng thứ tự và chính tả của backend |
| `signing` | Xem [signing-recipes.md](signing-recipes.md) |
| `routes.execute` | Route mặc định cho `execute(action, params)` |
| `routes.login` | `action` cố định, `defaults: false` nếu login không gộp defaults, `signing`/`headers` riêng |
| `routes.refresh` | `body` cố định (template), `headers` riêng |
| `routes.<khác>` | Route riêng cho action không đi qua execute; gọi `execute(a, p, {route: '<khác>'})` |
| `response.statusPath` + `okValues` | Đường dẫn tới trạng thái và các giá trị được coi là thành công |
| `response.messagePath` / `codePath` / `dataPath` | Đường dẫn tới message, mã lỗi, dữ liệu |
| `session.fromLogin` / `fromRefresh` | Ánh xạ `tênTrườngSession → đường dẫn trong response` |
| `session.tokenExpired` / `sessionExpired` / `authInvalid` | `{messages: [], codes: []}`: so khớp chính xác message (đã trim) hoặc code |
| `session.relogin` | `stored-credentials`: hết phiên thì login lại bằng thông tin đã lưu (bắt buộc dùng secure storage). `none`: báo `onSessionExpired` |
| `env.environments` / `env.vars` | Tên môi trường; tên biến `.env` cho `baseUrl`/`secret`/`partner`/`env` |

## Phân loại kết quả (`Result.kind`)

`ok` · `business-error` (server từ chối nghiệp vụ, có `message`) · `token-expired` · `session-expired` · `auth-invalid` · `network` (không có response) · `unexpected` (response sai dạng).

## Chính sách phiên

1. `token-expired` → refresh một lần → gọi lại. Nếu refresh trả `session-expired` thì chuyển sang bước 2. Nếu refresh lỗi khác (không phải `network`) thì logout.
2. `session-expired` + `relogin = stored-credentials` → login lại một lần → gọi lại; login lại thất bại thì logout. Nếu `relogin = none` thì gọi `onSessionExpired`.
3. `auth-invalid` → xoá session → `onLogout`.
4. `business-error` → `onServerMessage`. Tầng UI tự quyết hiển thị thế nào.

Không bao giờ retry quá một lần cho mỗi bước.

## Kiểm tra

`aegis profile check` kiểm tra profile có đúng schema không và chạy vector local (`.aegis/vectors/*.json`) nếu có.
