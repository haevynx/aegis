# Thiết kế aegis

## Vấn đề
Làm app bảo hiểm mới thường bắt đầu bằng clone app cũ → bị khoá vào công nghệ của app gốc. Kiến thức thật sự cần — cách gọi backend và quy tắc nghiệp vụ — nằm rải rác trong code cũ.

## Nguyên tắc
1. **Kit chỉ chứa phương pháp và công cụ.** Kiến thức về một backend/khách hàng cụ thể được **học lúc chạy** từ app tham chiếu mà người dùng có quyền truy cập, và lưu trong project private của họ (`.aegis/`).
2. **Không đoán.** Mọi thông tin có nguồn `file:line`; thiếu nguồn → hỏi hoặc placeholder.
3. **Dừng ở cổng** — profile, khác biệt giữa app, secret, gọi server thật, spec chức năng.
4. **Trung lập backend.** Mỗi kiểu backend là một profile JSON; client mẫu và adapter chạy theo profile.
5. **Lõi client thuần** — không UI/điều hướng/state; `Result` + hooks.
6. **Secret chỉ ở `.env`.**

## Thành phần
- CLI (`bin/`, `lib/`): install, ref, scan (redact), profile learn/check, feature, import, action, doc, diff, vectors, doctor, scan-secrets.
- Skills: `aegis-integrate` (điểm vào), `aegis-learn` (học + glossary), `aegis-protocol` (lõi), `aegis-stack-adapters` (6 stack, 9 state manager), `aegis-feature` (spec → duyệt → code).
- Spec: `profile-schema.md`, `signing-recipes.md`, `knowledge-format.md`.
- Client mẫu: `reference/ts`, `reference/dart` — cùng một bộ vector (`profiles/demo/vectors.json`, sinh độc lập bằng `scripts/gen-demo-vectors.mjs`).

## Nguồn kiến thức (theo thứ tự)
Source local → clone git (chỉ đọc) → `import` từ project đã học → chế độ chỉ giao thức (tài liệu/hỏi đáp, placeholder `<ACTION:KEY>`).

## Kiểm chứng
Vector chữ ký khớp từng byte giữa client mới và thuật toán của app cũ (secret giả); so request; test cho mỗi quy tắc nghiệp vụ trong spec; smoke test chỉ khi người dùng cho phép.
