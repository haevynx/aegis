# CLAUDE.md — làm việc TRÊN repo aegis

Repo này là **public**. Luật số 1: **không có dữ liệu thật của bất kỳ công ty nào** — secret, URL, mã action, tên đối tác/app nội bộ, tên header/đường dẫn API đặc thù của một backend thật, message server thật, quy trình riêng của khách hàng. Ví dụ chỉ dùng dữ liệu bịa: partner `DEMO`, `https://api.example.com`, mã `DEMO_*`, header `xPartner/xAction/xToken/xEnv/xSign`, secret `demo-*`.

## Trước mỗi thay đổi
- `node scripts/secret-scan.mjs .` phải sạch (người bảo trì có thêm `~/.aegis/denylist.txt` với từ khoá riêng — pre-commit dùng nó).
- `npm test && npm run test:ts`, `node scripts/lint-skills.mjs`, `cd reference/dart && dart test`.
- Fixture giống secret trong test: ghép chuỗi lúc chạy (`j('abc', 'def123')`), không để literal.

## Cấu trúc
- `bin/aegis.mjs`, `lib/` — CLI (Node ≥ 18, không dependency). `lib/redact.mjs` + `lib/secret-scan.mjs` là lớp bảo vệ — sửa phải thêm test.
- `lib/scan/` — scanner trung lập (heuristic, không hardcode bố cục app nào).
- `reference/ts`, `reference/dart` — client mẫu chạy theo profile; thay đổi ngữ nghĩa phải giữ hai bản đồng bộ và vector khớp.
- `profiles/demo` — profile + vector GIẢ (`scripts/gen-demo-vectors.mjs` sinh vector độc lập với client).
- `skills/` — nội dung cho agent; `templates/` — file chèn vào project người dùng.

## Không làm
- Không thêm recipe/heuristic mang tên khách hàng. Mô tả bằng toán/cấu trúc.
- Không đổi định dạng `.aegis/` mà không cập nhật `spec/knowledge-format.md` và tương thích ngược.
