# Bảo mật

## Phạm vi dữ liệu

Repo `aegis` là **public** và **không được** chứa:

- secret: khoá ký, token, mật khẩu, API key, private key, keystore, file cấu hình Firebase;
- URL / domain / IP server thật;
- mã action, tên đối tác, tên app nội bộ, tên header hoặc đường dẫn API đặc thù của một backend thật;
- message server thật, quy trình nghiệp vụ riêng của khách hàng.

Mọi ví dụ dùng dữ liệu bịa (`DEMO`, `api.example.com`, `DEMO_*`, `demo-*`).

## Lớp bảo vệ

| Lớp | Ở đâu |
|---|---|
| Quét secret khi commit/CI | `scripts/secret-scan.mjs` (+ `--staged` cho pre-commit, `node scripts/install-hooks.mjs`) |
| Denylist từ khoá riêng (ngoài repo) | `~/.aegis/denylist.txt` — mỗi dòng một từ, không phân biệt hoa thường |
| Che secret khi đọc app tham chiếu | `lib/redact.mjs` (theo tên trường, hex ≥ 32, JWT, `AIza…`, private key, mọi URL) |
| Chốt chặn trước khi ghi `.aegis/` | `lib/cli/scan.mjs` `guard()` — từ chối ghi nếu còn chuỗi giống secret |
| Đường dẫn máy cá nhân | chỉ trong `.aegis/local.json` (gitignore) |
| Secret của project | chỉ trong `.env` (gitignore); `aegis doctor` báo nếu `.env` bị git theo dõi |

## Nếu lỡ lộ

1. **Đổi ngay** secret/token đã lộ (xoá commit không thu hồi được bản đã bị clone/cache).
2. Xoá khỏi lịch sử (`git filter-repo`), force-push, yêu cầu GitHub xoá cache nếu cần.
3. Thêm từ khoá vào denylist local để chặn tái diễn.

## Báo lỗi bảo mật

Không mở issue public chứa dữ liệu nhạy cảm. Dùng **GitHub Security Advisories** (tab Security → Report a vulnerability) của repo. PR chứa dữ liệu thật sẽ bị đóng và yêu cầu đổi secret.
