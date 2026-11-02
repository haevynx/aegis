# React Native / Expo

- **Lõi:** copy `reference/ts/{types,template,recipes,client}.ts` (đổi import `./x.ts` → `./x` nếu tsconfig không bật `allowImportingTsExtensions`).
- **Crypto:** RN không có `crypto.subtle` → inject `CryptoProvider`:
  - `react-native-quick-crypto` (nhanh, native): `createHash('sha256')`, `createHmac('sha256', key)`.
  - hoặc thuần JS: `js-sha256` (`sha256.array`, `sha256.hmac.array`) — chậm hơn nhưng không native.
  - Expo: `expo-crypto` có `digest` (SHA-256/512) nhưng **không** có HMAC → dùng `js-sha256` cho HMAC/JWS.
- **TextEncoder:** RN ≥ 0.74 (Hermes) có sẵn; cũ hơn → polyfill `fast-text-encoding`.
- **Transport:** `fetch` mặc định của lõi; dùng axios nếu project đã có (bọc thành `Transport`, tắt transform để giữ body nguyên).
- **Env:** RN CLI `react-native-config` (`Config.AEGIS_BASE_URL`); Expo `app.config.ts` → `extra` (đọc qua `expo-constants`). Secret trong app mobile luôn trích xuất được — nói với người dùng.
- **Secure storage:** `react-native-keychain` hoặc `expo-secure-store` cho session (token, credentials). Không AsyncStorage cho credentials.
- **Device id:** `react-native-device-info` `getUniqueId()` (Expo: `expo-application` `getAndroidId()` / `getIosIdForVendorAsync()`). Giữ cùng nguồn với app cũ nếu backend khoá theo thiết bị.
- **Device info khác:** bundle id, user agent (`getVersion()`), xem `envelope.meta` của profile.

```ts
import {createClient} from './client';
export const client = createClient({
  profile, config: {baseUrl: Config.AEGIS_BASE_URL, secret: Config.AEGIS_SECRET_KEY, partner: Config.AEGIS_PARTNER_CODE, env: Config.AEGIS_ENV},
  session: secureSessionStore, device: async () => ({id: await DeviceInfo.getUniqueId(), bundleId: DeviceInfo.getBundleId(), userAgent: `App/${DeviceInfo.getVersion()}`}),
  crypto: quickCryptoProvider, hooks: {onLogout: () => authStore.getState().signOut(), onServerMessage: r => showToast(r.message)},
});
```
