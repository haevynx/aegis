---
name: aegis-integrate
description: Điểm vào của aegis — dựng tầng service/API (ký request, đăng nhập, refresh token, xử lý lỗi, cấu hình môi trường, store) cho một project bảo hiểm trên BẤT KỲ stack nào (React Native, Expo, React/Next, Vue/Nuxt, Flutter, Kotlin, Swift) và BẤT KỲ state manager nào, bằng cách HỌC từ app tham chiếu thay vì đoán. Dùng khi người dùng nói "tích hợp backend/API bảo hiểm", "setup service như app cũ", "chuyển app sang stack mới", "aegis", hoặc khi project có thư mục .aegis/.
---

# aegis-integrate — Học → Hỏi → Làm

Bạn đang tích hợp backend của một hệ thống bảo hiểm vào project hiện tại. Kiến thức về backend **không có trong đầu bạn và không có trong kit** — nó nằm trong app tham chiếu của người dùng. Bạn học nó bằng công cụ, hỏi người dùng ở các cổng, rồi mới làm.

CLI: `aegis <lệnh>`; nếu không có trên PATH: `node ~/.aegis/kit/bin/aegis.mjs <lệnh>`.

## Luật sắt (đọc lại trước mỗi bước)

1. **Không đoán.** Mã action, endpoint, header, thuật toán ký, quy tắc nghiệp vụ: phải có nguồn `file:line`. Không có → hỏi, hoặc placeholder `<ACTION:KEY>`.
2. **Secret chỉ ở `.env`.** Không đọc secret từ app tham chiếu để dùng, không chép vào code/`.aegis/`/log/câu trả lời. Người dùng tự điền `.env`.
3. **Dừng ở cổng** — bảng dưới. Lời khen hay im lặng không phải là "duyệt".
4. **Lõi client thuần** — không Alert/điều hướng/store trong lớp gọi API.
5. **Báo đúng sự thật.** Chưa chạy được test/smoke → nói rõ chưa kiểm chứng.

## Quy trình

| # | Pha | Việc | Lệnh / tài liệu |
|---|---|---|---|
| 0 | — | Kiểm tra trạng thái | `aegis doctor` |
| 1 | Học | Khai báo app tham chiếu (nếu chưa) | `aegis ref add <path\|git-url>` — không có? xem `aegis-learn` §Không có source |
| 2 | Học | Quét | `aegis scan` → đọc `.aegis/knowledge/<ref>/` |
| 3 | Học | Nhận diện stack đích + state manager của project hiện tại | [references/detect-stack.md](references/detect-stack.md) |
| 4 | Học | Viết profile giao thức | `aegis profile learn` + skill **aegis-learn** |
| 5 | **Hỏi** | **Cổng 1:** trình bày profile (tóm tắt + nguồn) → người dùng duyệt | — |
| 6 | Hỏi | Chọn môi trường/đối tác; người dùng tự điền `.env` | `.env.example` |
| 7 | Làm | Sinh lõi client theo profile cho stack đích | skill **aegis-protocol** + **aegis-stack-adapters** |
| 8 | Làm | Nối `SessionStore` + hooks vào state manager | `aegis-stack-adapters/references/state/*` |
| 9 | Làm | Kiểm chứng chữ ký | `aegis profile check`, `aegis vectors`, test của project |
| 10 | Làm | So request mới với app tham chiếu (cùng input, secret giả) | [references/workflow.md](references/workflow.md) §So request |
| 11 | Làm | Smoke test (login + 1 action đọc) — **chỉ khi người dùng đã điền `.env`** và đồng ý gọi server | — |
| 12 | — | Báo cáo theo [references/checklist.md](references/checklist.md) | — |

Làm chức năng nghiệp vụ (màn hình, luồng) → skill **aegis-feature**, sau khi bước 1–9 xong.

## Các cổng (bắt buộc dừng)

| Cổng | Khi nào | Trình bày gì |
|---|---|---|
| Profile | Trước khi sinh client | Tóm tắt envelope/header/chữ ký/phiên + nguồn `file:line` + câu hỏi mở |
| Khác biệt giữa ref | Nhiều app tham chiếu làm khác nhau | Bảng khác biệt (`aegis diff`) → hỏi theo app nào |
| Secret | Cần giá trị thật | Tên biến cần điền, KHÔNG xin người dùng dán secret vào chat |
| Gọi server thật | Trước smoke test | Môi trường nào, action nào (chỉ đọc) |
| Spec chức năng | Trước khi code màn hình | `.aegis/specs/<slug>.md` (skill aegis-feature) |

## Khi gặp

- `doctor` báo `chi-giao-thuc` → không có kiến thức: dựng client theo profile người dùng cung cấp (tài liệu API, trả lời câu hỏi), action là placeholder, liệt kê mã còn thiếu.
- Scan báo "bố cục lạ" → đọc tay các `unknownFiles` theo `aegis-learn/references/reading-source.md`.
- Vector không khớp → **đừng sửa vector cho khớp**. Tìm khác biệt serialize (thứ tự key, escape Unicode, số) — xem `aegis-protocol/references/signing.md`.
