# iOS (Swift)

- **Dịch lõi** sang Swift: `enum ResultKind`, `protocol SessionStore { func get() async -> Session?; … }`, `async/await`.
- **JSON có thứ tự:** `JSONEncoder` **không** đảm bảo thứ tự key và escape `/` → tự viết serializer nhỏ cho `[(String, JSONValue)]` (mảng cặp có thứ tự), hoặc dùng `JSONSerialization` với `.withoutEscapingSlashes` **và** kiểm tra thứ tự bằng vector (thứ tự của NSDictionary không đảm bảo → không dùng khi ký).
- **Crypto:** CryptoKit `SHA256.hash(data:)`, `HMAC<SHA256>.authenticationCode(for:using:)`; base64url: `base64EncodedString()` rồi thay `+/=`.
- **Transport:** `URLSession`.
- **Env:** `.xcconfig` (không commit) → Info.plist.
- **Secure storage:** Keychain.
- **Device id:** `UIDevice.current.identifierForVendor`.
