# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

## [Unreleased]

## [0.2.3] — 2026-11-02

### Thay đổi
- Repo chuyển sang `haevynx/aegis`: installer, `aegis update`, README, skill, khối luật `CLAUDE.md`/`AGENTS.md`, plugin manifest và mẫu issue trỏ về địa chỉ mới. Ai đã cài bản ≤ 0.2.2 nên cài lại một lần bằng lệnh mới.

## [0.2.2] — 2026-11-02

### Gỡ bỏ
- Kênh npm: aegis không phát hành trên npm. `package.json` đặt `"private": true` (chặn publish nhầm), tên gói `aegis`; bỏ `prepublishOnly`/`publishConfig`.
- Skill và khối luật trong `CLAUDE.md`/`AGENTS.md` gợi ý `npx github:haevynx/aegis` thay cho `npx aegis-insurance`.

## [0.2.1] — 2026-11-02

### Thêm
- `CODE_OF_CONDUCT.md`, mẫu issue (báo lỗi, đề xuất — bắt buộc xác nhận không có dữ liệu thật), mẫu PR, Dependabot cho GitHub Actions và Dart.
- `CHANGELOG.md`.

### Thay đổi
- Installer `install.sh` / `install.ps1` mặc định cài **bản release mới nhất** thay vì nhánh `main` (`AEGIS_VERSION=main` để lấy bản đang phát triển).
- README mặc định là **tiếng Anh** (`README.md`); bản tiếng Việt chuyển sang `README.vi.md`. Bỏ banner.
- README: badge release thay cho badge npm; `npx aegis-insurance` chuyển vào mục cách cài khác cho tới khi phát hành trên npm.

## [0.2.0] — 2026-11-02

### Thêm
- Cài đặt một dòng: `install.sh` (macOS/Linux), `install.ps1` (Windows) — không sudo, không sửa shell profile; `AEGIS_VERSION`, `AEGIS_HOME`, `AEGIS_SOURCE_DIR`.
- Gói npm `aegis-insurance`; `prepublishOnly` chạy quét secret + lint skill + test.
- `aegis update` tải bản mới; shim `aegis.cmd` cho Windows.
- README vi/en mới, banner; CI chạy thử installer trên Ubuntu, macOS, Windows.

### Sửa
- `--version` / `--help` không còn bị hiểu là `install`.
- CLI đã cài gọi không tham số chỉ in help (không tự cấu hình thư mục hiện tại).
- So đường dẫn kit bằng realpath — không tự xoá kit khi `/var` là symlink (macOS).
- Test runner tương thích Node 18/22/24.

## [0.1.0] — 2026-11-02

### Thêm
- CLI không dependency: `install`, `ref`, `scan` (che secret), `profile learn|check|show`, `feature`, `import`, `action`, `doc`, `diff`, `vectors`, `doctor`, `scan-secrets`.
- 5 skill: `aegis-integrate`, `aegis-learn`, `aegis-protocol`, `aegis-stack-adapters`, `aegis-feature`.
- Client mẫu chạy theo profile (TypeScript, Dart) với vector chữ ký dùng chung; hậu tố template `{x || null}`, `{x?}`.
- Lớp bảo mật: secret-scan (pre-commit, CI, denylist local), redactor, chốt chặn trước khi ghi `.aegis/`.

[Unreleased]: https://github.com/haevynx/aegis/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/haevynx/aegis/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/haevynx/aegis/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/haevynx/aegis/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/haevynx/aegis/releases/tag/v0.2.0
[0.1.0]: https://github.com/haevynx/aegis/commit/8baf585
