## Thay đổi / What

<!-- Ngắn gọn: thay đổi gì, vì sao. Liên kết issue nếu có (Fixes #…). -->

## Checklist

- [ ] **Không có dữ liệu thật** của bất kỳ công ty nào (secret, URL, mã action, tên đối tác/app nội bộ, header/đường dẫn API đặc thù, message server thật) — chỉ `DEMO`, `api.example.com`, `DEMO_*`
- [ ] `node scripts/secret-scan.mjs .` sạch (người bảo trì: thêm `--denylist ~/.aegis/denylist.txt`)
- [ ] `npm test` và `npm run test:ts` pass
- [ ] `node scripts/lint-skills.mjs` pass (nếu sửa `skills/`)
- [ ] `cd reference/dart && dart test` pass (nếu sửa client/recipe/vector)
- [ ] Đổi ngữ nghĩa client → cập nhật **cả** TS và Dart + vector (`npm run vectors`)
- [ ] Cập nhật `CHANGELOG.md` (mục Unreleased) và tài liệu liên quan
