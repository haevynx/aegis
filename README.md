# aegis

**Học backend & nghiệp vụ bảo hiểm từ app tham chiếu — tích hợp vào mọi stack, mọi state manager.**

Tiếng Việt · [English](README.en.md)

Bộ **Agent Skills + CLI** cho Claude Code, Codex, Cursor và các agent hỗ trợ [Agent Skills](https://agentskills.io). Không chứa dữ liệu của công ty nào: aegis dạy agent **cách học** từ source app cũ của bạn, **khi nào phải hỏi**, và **làm sao kiểm chứng** — rồi mới dựng code trên stack mới.

## Vì sao

Làm app bảo hiểm mới thường bắt đầu bằng *clone app cũ*: nhanh, nhưng app mới bị khoá vào công nghệ của app gốc (framework, state manager, HTTP client, cách tổ chức). Đổi sang công nghệ khác = mò lại toàn bộ cách backend ký request, xử lý phiên, các mã action, và hàng trăm quy tắc nghiệp vụ nằm rải rác trong màn hình.

aegis tách **kiến thức** ra khỏi **code cũ**:

- **Giao thức** (đóng gói body, header, chữ ký, response, phiên) → một *profile* JSON + client mẫu chạy theo profile (TS, Dart) + hướng dẫn cho React Native, Expo, React/Next, Vue/Nuxt, Flutter, Kotlin, Swift và Redux Toolkit, RTK Query, Zustand, TanStack Query, Jotai, MobX, Pinia, Riverpod, Bloc.
- **Nghiệp vụ** (chức năng → màn hình → trường → luồng API → quy tắc) → spec có nguồn `file:line`, trích từ source app cũ.

## Mô hình: Học → Hỏi → Làm

| Pha | Agent làm | Công cụ |
|---|---|---|
| **Học** | Đọc app tham chiếu (đã che secret): môi trường, endpoint, mã action, tầng ký/phiên, cây chức năng. Không trả lời từ trí nhớ. | `aegis scan`, `aegis profile learn`, `aegis feature` |
| **Hỏi** | Dừng ở các cổng: duyệt profile, chọn app chuẩn khi các app khác nhau, người dùng tự điền secret, duyệt spec chức năng. | skill `aegis-integrate`, `aegis-feature` |
| **Làm** | Sinh client theo stack + state manager, nối store, test vector chữ ký, so request với app cũ, smoke test khi được phép. | `aegis vectors`, `aegis doctor` |

## Cài đặt (một lệnh)

```bash
npx github:nvdhai2003mobiledev/aegis
```

Chạy trong thư mục gốc project cần tích hợp. Lệnh này:
- cài skill global cho Claude Code (`~/.claude/skills`) và Codex (`~/.agents/skills`) — một lần cho cả máy;
- copy CLI vào `~/.aegis/kit` (gọi lại bằng `~/.aegis/bin/aegis` hoặc `node ~/.aegis/kit/bin/aegis.mjs`);
- trong project: chèn khối luật vào `CLAUDE.md`/`AGENTS.md` (giữ nguyên nội dung của bạn), tạo `.aegis/config.json`, `.env.example`, thêm `.env` vào `.gitignore`.

Tuỳ chọn: `--project` (cài skill vào project thay vì global), `--hooks` (pre-commit quét secret), `--skills-only`.
Claude Code plugin: `/plugin marketplace add nvdhai2003mobiledev/aegis`.

Khởi động lại phiên agent để nạp skill.

## Bắt đầu

```bash
aegis ref add ~/code/app-cu            # hoặc git-url — clone chỉ đọc
aegis scan                             # → .aegis/knowledge/app-cu/
aegis doctor                           # mức sẵn sàng + bước tiếp theo
```

Rồi nói với agent: **"tích hợp backend bảo hiểm vào project này"**. Làm chức năng: **"làm chức năng giám định ô tô như app cũ"**.

Không có source app cũ? `aegis ref add <git-url>` · `aegis import <project-đã-học>` · hoặc *chế độ chỉ giao thức* (tài liệu API / trả lời câu hỏi, mã action để placeholder `<ACTION:KEY>`, `aegis action add` dần).

## Lệnh

| Học | Kiểm chứng | Quản lý |
|---|---|---|
| `ref add\|list\|remove` | `vectors [--demo]` | `install [--project] [--hooks]` |
| `scan [--ref]` | `profile check` | `update` · `uninstall` |
| `profile learn\|show` | `doctor [--json]` | `import <path\|git-url>` |
| `feature <tên>` | `scan-secrets [path]` | `action add\|list [--missing]` · `doc add` |
| `diff --ref a --ref b` | | |

## Bảo mật

aegis được thiết kế để repo này **public** mà không lộ gì, và để project của bạn không lộ secret:

- **Repo kit không chứa dữ liệu thật** — chỉ phương pháp, công thức ký tổng quát, profile `demo` bịa. CI chặn bằng `scripts/secret-scan.mjs`; người bảo trì dùng thêm denylist local (`~/.aegis/denylist.txt`, ngoài repo).
- **Scanner che secret ngay lúc đọc** (secret theo tên trường, hex dài, JWT, API key, private key, mọi URL) và có chốt chặn cuối từ chối ghi nếu còn chuỗi giống secret. Đường dẫn máy cá nhân không vào file được commit.
- **Secret chỉ ở `.env`** của project — agent không tự lấy secret từ app cũ, không ghi vào code/`.aegis/`/log.
- `.aegis/` (kiến thức thật: mã action, nghiệp vụ) nằm trong **project private** của bạn.

Xem [SECURITY.md](SECURITY.md).

## Cấu trúc

```
bin/ lib/            CLI (Node ≥ 18, không dependency)
skills/              aegis-integrate · aegis-learn · aegis-protocol · aegis-stack-adapters · aegis-feature
spec/                profile-schema · signing-recipes · knowledge-format
reference/ts|dart    client mẫu chạy theo profile + test vector
profiles/demo        profile + vector GIẢ
examples/demo-app    app tham chiếu GIẢ (test scanner)
templates/           khối CLAUDE.md/AGENTS.md, .env.example, mẫu spec/protocol
```

Lấy cảm hứng từ mô hình harness *Learn → Ask → Do* của [pythia](https://github.com/thaildhe172591/pythia). Giấy phép MIT.
