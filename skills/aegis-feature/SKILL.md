---
name: aegis-feature
description: Dựng một chức năng nghiệp vụ bảo hiểm (vd giám định ô tô, tiếp nhận bồi thường, bảo lãnh viện phí, phê duyệt, thanh toán, bán bảo hiểm) trên stack hiện tại bằng cách trích từ app tham chiếu — màn hình, trường, luồng API, quy tắc nghiệp vụ, message server — thành spec có nguồn file:line, cho người dùng duyệt, rồi mới code. Dùng khi người dùng nói "làm chức năng X", "dựng màn Y như app cũ", "chức năng X gồm những gì / nghiệp vụ ra sao".
---

# aegis-feature — trích → spec → duyệt → code

Điều kiện: tầng client đã xong (aegis-integrate), hoặc người dùng chỉ hỏi "chức năng X gồm những gì" (khi đó dừng ở bước spec).

## Quy trình

1. **Tìm chức năng.** `.aegis/knowledge/<ref>/features/_index.json` (path, màn hình, action). Không chắc tên → liệt kê ứng viên, hỏi người dùng.
2. **Trích.** `aegis feature <tên|path>` → `.aegis/knowledge/<ref>/features/<slug>.json`: từng file với components, fields, actions (kèm mã + mô tả trong `actionIndex`), conditions, messages (ui / ui-dynamic / server), navigation, subFeatures.
3. **Đọc tay.** JSON là bản đồ, không phải toàn bộ sự thật — mở các file màn hình chính để hiểu: thứ tự gọi API (useEffect/khi bấm nút), dữ liệu từ response được dùng ở đâu, điều kiện hiển thị/ẩn nút, validate form, điều hướng sang chức năng con. Chi tiết: [references/workflow.md](references/workflow.md).
4. **Viết spec** `.aegis/specs/<slug>.md` theo [references/spec-template.md](references/spec-template.md) (bản đầy đủ: `~/.aegis/kit/templates/feature-spec.md`). **Mỗi dòng một nguồn.** Không có nguồn → Câu hỏi mở.
5. **Cổng: người dùng duyệt spec.** Trình bày tóm tắt (màn hình, luồng API, quy tắc quan trọng, câu hỏi mở). Chờ "duyệt" rõ ràng.
6. **Code** theo stack + UI kit của project hiện tại (không chép UI của app cũ; chỉ giữ *nội dung*: trường, hành động, quy tắc). Gọi API qua `client.execute(ACTIONS.X, …)`; xử lý `Result.kind`; message server đặc biệt → hành vi trong spec.
7. **Kiểm chứng:** test cho từng quy tắc nghiệp vụ trong spec (mỗi quy tắc ≥ 1 test), test luồng API bằng transport giả; báo cáo quy tắc nào đã/chưa có test.

## Nhiều app tham chiếu

`aegis feature <tên> --ref a` và `--ref b` → mục 6 của spec "Khác biệt giữa các app" → hỏi người dùng theo app nào (hoặc cấu hình theo đối tác).

## Đừng

- Đừng suy diễn quy tắc từ tên biến. `if (photos.length < 4)` là quy tắc có nguồn; "chắc là cần đủ ảnh" thì không.
- Đừng bỏ qua `subFeatures` — hỏi người dùng phạm vi (làm cả chức năng con hay không).
- Đừng hardcode message server trong UI khi spec nói nó đến từ server (`ui-dynamic`).
