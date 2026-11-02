# Đóng góp

```bash
npm test               # CLI, scanner, redact, secret-scan (Node ≥ 18)
npm run test:ts        # client TS + vector (Node ≥ 22.18)
node scripts/lint-skills.mjs
node scripts/secret-scan.mjs .
(cd reference/dart && dart pub get && dart test)
node scripts/install-hooks.mjs   # pre-commit quét secret (dùng ~/.aegis/denylist.txt nếu có)
```

## Thêm công thức ký
`lib/recipes.mjs` + `reference/ts/recipes.ts` + `reference/dart/lib/aegis_client.dart` → case mới trong `scripts/gen-demo-vectors.mjs` → `npm run vectors` → mọi test pass. Mô tả trong `spec/signing-recipes.md`.

## Thêm stack / state manager
`skills/aegis-stack-adapters/references/{stacks,state}/<tên>.md` + dòng trong bảng của `SKILL.md`. Nêu: nơi đặt file, transport, crypto, serialize JSON có thứ tự, secure storage, device id, env; với state: `SessionStore`, phản ứng `onLogout`.

## Cải thiện scanner
Heuristic phải **trung lập** (không tên app/khách hàng). Thêm fixture bịa vào `examples/demo-app` + test trong `test/scan.test.mjs`.

## Luật dữ liệu
Xem [SECURITY.md](SECURITY.md). Fixture giống secret trong test phải ghép chuỗi lúc chạy.

## Phát hành
1. Tăng `version` trong `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`.
2. `npm test && npm run test:ts`, `node scripts/secret-scan.mjs . --denylist ~/.aegis/denylist.txt`.
3. Commit, `git tag vX.Y.Z && git push --follow-tags`, `gh release create vX.Y.Z --generate-notes`.

aegis không phát hành trên npm (`package.json` đặt `"private": true`); kênh cài là installer, `npx github:…`, plugin Claude Code và `npx skills add`.

Installer `install.sh`/`install.ps1` lấy nhánh `main` mặc định; `AEGIS_VERSION=vX.Y.Z` để cài đúng bản đã phát hành.
