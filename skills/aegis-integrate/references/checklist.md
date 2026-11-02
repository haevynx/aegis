# Checklist hoàn thành (báo cáo đúng sự thật từng mục)

- [ ] `aegis doctor` → mức `san-sang` (hoặc nói rõ đang ở mức nào và vì sao)
- [ ] Profile đã được người dùng **duyệt**; `protocol.md` có nguồn cho mọi dòng
- [ ] `aegis profile check` pass; `aegis vectors` khớp 100% (hoặc: chưa có vector — nói rõ rủi ro)
- [ ] Lõi client không import UI/router/state manager; có `Result` + hooks
- [ ] Chính sách phiên đúng profile: refresh 1 lần, login lại 1 lần, logout khi auth-invalid; có test
- [ ] `SessionStore` dùng secure storage (Keychain/Keystore/EncryptedSharedPreferences/flutter_secure_storage); không lưu mật khẩu ở storage thường
- [ ] Mã action từ knowledge (có comment + nguồn); placeholder còn thiếu được liệt kê (`aegis action list --missing`)
- [ ] `.env` trong `.gitignore`, không bị git theo dõi; không secret/URL thật trong code, `.aegis/`, test, log
- [ ] Test của project đích chạy pass (dán lệnh + kết quả)
- [ ] Smoke test với server thật: đã chạy / chưa chạy (vì sao)
