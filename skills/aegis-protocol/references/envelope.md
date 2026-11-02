# Đóng gói body

Nhiều backend nghiệp vụ dùng **một endpoint chung** và chọn hành động bằng header (mã action), body có dạng:

```json
{"<metaKey>": {"app": "...", "device": "...", "time": "yyyyMMddHHmmss"}, "<dataKey>": {"...defaults": "...", "...params": "..."}}
```

- `defaults` gộp **trước** params → params ghi đè defaults. Thứ tự key kết quả = thứ tự key của defaults, rồi các key mới của params (đúng ngữ nghĩa spread của JS: key đã có giữ **vị trí cũ**, nhận giá trị mới).
- `meta` thường gồm định danh app, user-agent, id thiết bị, thời gian theo giờ máy.
- `dataKey: null` → body chính là dữ liệu; `metaKey: null` → không có meta.

## Template

`{config.x}` `{session.a.b}` `{device.x}` `{action}` `{signature}` `{now:yyyyMMddHHmmss}`. Chuỗi chỉ gồm một template giữ nguyên kiểu (null/số); template lẫn trong chuỗi → nối chuỗi, thiếu → rỗng. Header null → `""`.

Hậu tố: `{x || null}` (falsy → null, như JS `x || null`) · `{x?}` (thiếu → bỏ key, như `JSON.stringify` bỏ `undefined`). Chọn sai hậu tố là lệch chữ ký — đã gặp trên app thật.

## Bẫy

- Ngôn ngữ không giữ thứ tự key của map (một số JSON lib, `HashMap`) → dùng `LinkedHashMap`/ordered map.
- Thời gian: giờ **máy** hay UTC? Đọc code app cũ (`moment()` = giờ máy).
- `deviceId` khác nhau giữa các thư viện (vd vendor id vs Android ID) → backend có thể khoá theo thiết bị: hỏi người dùng hành vi mong muốn khi đổi app.
