# SSO / OIDC

Nếu app cũ đăng nhập qua SSO:

1. Lấy URL đăng nhập (authorize) → mở trình duyệt hệ thống / in-app browser (ASWebAuthenticationSession, Custom Tabs) — **không** WebView tự dựng nếu tránh được.
2. Nhận callback (deep link / redirect URI) → đổi code lấy token ở server của hệ thống (client callback).
3. Map token SSO sang session của backend nghiệp vụ (có thể cần một action riêng).
4. Logout: gọi end-session của IdP + xoá session local.

Thư viện: `react-native-app-auth`, `expo-auth-session`, `oidc-client-ts` (web), `flutter_appauth`, AppAuth (Android/iOS).

Header/khóa cố định dùng cho bước callback trong app cũ là **secret** → `.env`, không hardcode. Nếu app cũ hardcode → báo người dùng nên đổi.
