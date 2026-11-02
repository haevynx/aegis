---
name: aegis-learn
description: Học giao thức backend và nghiệp vụ từ app tham chiếu (source code của app cũ) để viết profile .aegis/profile/profile.json + protocol.md có dẫn nguồn file:line — cách đọc tầng service, nhận biết cách ký request, xử lý phiên, chấm độ tin cậy, sinh test vector local, và làm gì khi KHÔNG có source (import, chế độ chỉ giao thức). Dùng khi chạy `aegis profile learn`, khi scan báo bố cục lạ/độ tin cậy thấp, hoặc khi cần hiểu thuật ngữ bảo hiểm.
---

# aegis-learn — học, không đoán

Nguồn sự thật là **source của app tham chiếu**, không phải trí nhớ của bạn về "các backend bảo hiểm thường làm thế nào". Mọi điều bạn ghi vào profile/spec phải chỉ ra được dòng code đã chứng minh nó.

## Thứ tự đọc

1. `aegis scan` → `.aegis/knowledge/<ref>/knowledge.json`: xem `stack`, `confidence`, `unknownFiles`.
2. `aegis profile learn` → `.aegis/learn/profile-sources.md`: các file tầng HTTP/ký/phiên đã xếp hạng, kèm dòng bằng chứng.
3. Mở **trực tiếp** các file đó trong app tham chiếu (đường dẫn: `aegis ref list`). Đọc trọn hàm tạo request, hàm ký, interceptor, hàm xử lý lỗi/phiên. Chi tiết: [references/reading-source.md](references/reading-source.md).
4. Điền `profile.json` theo [references/writing-profile.md](references/writing-profile.md); viết `protocol.md` (mỗi dòng một nguồn).
5. Sinh vector local bằng thuật toán của app cũ (secret giả) → `aegis profile check` → `aegis vectors`.
6. Chấm độ tin cậy từng mục theo [references/confidence.md](references/confidence.md); mục `thấp` → ghi vào **Câu hỏi mở**, hỏi người dùng.

## Đọc secret? Không.

Bạn sẽ thấy giá trị secret/URL trong file cấu hình của app cũ. **Không chép, không nhắc lại, không dùng.** Chỉ ghi *tên* trường và tên biến `.env` tương ứng. Khi cần giá trị để chạy thật, người dùng tự điền `.env`.

## Không có source

| Tình huống | Làm gì |
|---|---|
| Có quyền git | `aegis ref add <git-url>` (clone chỉ đọc) |
| Project khác đã học | `aegis import <path\|git-url>` — kiểm tra `commit` trong knowledge để biết độ cũ |
| Không có gì | **Chế độ chỉ giao thức:** xin người dùng tài liệu API (`aegis doc add`) hoặc hỏi lần lượt 9 câu ở cuối `profile-sources.md`; dựng profile từ câu trả lời (nguồn = "người dùng xác nhận ngày …"); mã action để `<ACTION:KEY>`; `aegis action add` khi có mã; `aegis action list --missing` để theo dõi |

Không dịch ngược APK/IPA đã phát hành trừ khi người dùng yêu cầu rõ ràng và có quyền.

## Thuật ngữ

Thuật ngữ bảo hiểm phổ biến (giám định, bồi thường, bảo lãnh, GCN, LHNV…): [references/insurance-glossary.md](references/insurance-glossary.md). Glossary là kiến thức **chung của ngành** — quy trình cụ thể của khách hàng vẫn phải đọc từ source.
