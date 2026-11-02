# Flutter

- **Lõi:** `reference/dart/lib/aegis_client.dart` (có test vector).
- **Crypto:** package `crypto` (`sha256`, `Hmac(sha256, key)`); base64url: `base64Url.encode(bytes).replaceAll('=', '')`.
- **JSON:** `jsonEncode` của Dart:
  - giữ thứ tự `Map` literal / `LinkedHashMap` ✓;
  - non-ASCII giữ nguyên ✓;
  - **số thực** `1.0` in là `1.0` (JS in `1`) → giữ số nguyên là `int`;
  - escape giống JS cho ký tự thường. Chạy vector để chắc chắn.
- **Transport:** `http` hoặc `dio` (tắt transform tự động body; gửi `jsonEncode(body)` dạng String).
- **Env:** `--dart-define=AEGIS_SECRET_KEY=…` + `String.fromEnvironment`, hoặc `flutter_dotenv` (file `.env` vào assets — vẫn nằm trong app).
- **Secure storage:** `flutter_secure_storage`.
- **Device id:** `device_info_plus` (Android `id`, iOS `identifierForVendor`).
