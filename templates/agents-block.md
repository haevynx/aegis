<!-- aegis:begin — khối này do `aegis install` quản lý; sửa ngoài khối, không sửa trong khối -->
## Aegis — tích hợp backend bảo hiểm (Học → Hỏi → Làm)

Project này dùng **aegis** để học backend và nghiệp vụ từ app tham chiếu. CLI: `aegis` (chưa có trên PATH: `node ~/.aegis/kit/bin/aegis.mjs`; chưa cài CLI — vd chỉ cài skill qua plugin: `npx github:nvdhai2003mobiledev/aegis --skills-only` hoặc `curl -fsSL https://raw.githubusercontent.com/nvdhai2003mobiledev/aegis/main/install.sh | sh`). Skill: `aegis-integrate`, `aegis-learn`, `aegis-protocol`, `aegis-stack-adapters`, `aegis-feature`.

**Luật bắt buộc**

1. **Không đoán.** Mọi mã action, endpoint, header, quy tắc nghiệp vụ phải có nguồn `file:line` (trong `.aegis/knowledge`, `.aegis/profile/protocol.md` hoặc `.aegis/docs`). Không có nguồn → hỏi người dùng, hoặc để placeholder `<ACTION:KEY>` và ghi vào danh sách thiếu.
2. **Secret chỉ ở `.env`.** Không ghi SECRET_KEY, token, mật khẩu, URL server vào code, `.aegis/`, log hay câu trả lời. Không tự lấy secret từ app tham chiếu — người dùng tự điền `.env`.
3. **Dừng ở các cổng.** Trước khi sinh code: người dùng duyệt `profile.json` (giao thức) và `.aegis/specs/<chức-năng>.md` (nghiệp vụ). Khi các app tham chiếu làm khác nhau → hỏi theo app nào.
4. **Lõi client thuần.** Lớp gọi API không gọi Alert/điều hướng/state manager trực tiếp; trả `Result` + hooks (`onLogout`, `onSessionExpired`, `onServerMessage`).
5. **Tự kiểm chứng.** `aegis profile check`, `aegis vectors`, so request mới với app tham chiếu; báo đúng sự thật nếu chưa chạy được.

**Bắt đầu nhanh:** `aegis doctor` → làm theo bước nó gợi ý.
<!-- aegis:end -->
