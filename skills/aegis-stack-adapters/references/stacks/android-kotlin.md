# Android (Kotlin)

- **Dịch lõi** từ `reference/ts/client.ts` sang Kotlin: `data class Result`, `interface SessionStore { suspend fun get(); suspend fun set(); suspend fun clear() }`, coroutines.
- **JSON có thứ tự:** `kotlinx.serialization.json.buildJsonObject {}` (giữ thứ tự chèn) hoặc `org.json.JSONObject` (KHÔNG đảm bảo thứ tự — tránh khi ký). Gộp defaults + params bằng `LinkedHashMap`. Escape: `kotlinx` không escape non-ASCII ✓; kiểm tra `/` và số bằng vector.
- **Crypto:** `MessageDigest.getInstance("SHA-256")`, `Mac.getInstance("HmacSHA256")`; base64url: `Base64.encodeToString(b, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)`.
- **Transport:** OkHttp / Retrofit (body là `RequestBody` từ chuỗi JSON đã ký — không để converter serialize lại).
- **Env:** `BuildConfig` từ `local.properties` (không commit).
- **Secure storage:** `EncryptedSharedPreferences` / DataStore + Keystore.
- **Device id:** `Settings.Secure.ANDROID_ID` (giống nguồn app cũ nếu backend khoá thiết bị).
