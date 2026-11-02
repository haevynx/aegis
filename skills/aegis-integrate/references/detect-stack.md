# Nhận diện stack đích

Đọc manifest của **project hiện tại** (không phải app tham chiếu):

| File | Stack | Ghi chú |
|---|---|---|
| `package.json` có `expo` | Expo (RN) | env: `expo-constants`/`app.config`, `EXPO_PUBLIC_*` (KHÔNG để secret ở biến public nếu có thể tránh) |
| `package.json` có `react-native` | React Native CLI | env: `react-native-config` |
| `package.json` có `next` | Next.js | ký request ở **server** (Route Handler / Server Action) nếu được — secret không xuống browser |
| `package.json` có `nuxt` / `vue` | Nuxt / Vue | Nuxt: `server/api` làm proxy ký; Vue SPA: secret lộ ở browser → cảnh báo người dùng |
| `package.json` có `react` (không next) | React SPA (Vite/CRA) | như Vue SPA |
| `pubspec.yaml` | Flutter | env: `--dart-define` / `flutter_dotenv` |
| `build.gradle(.kts)` | Android Kotlin | env: `BuildConfig` từ `local.properties` |
| `*.xcodeproj` / `Package.swift` | iOS Swift | env: `.xcconfig` (không commit) |

State manager (đọc dependencies): `@reduxjs/toolkit` → redux-toolkit (có `createApi` → rtk-query) · `zustand` · `jotai` · `mobx` · `@tanstack/*-query` · `pinia` · `flutter_riverpod` · `flutter_bloc` · `provider`/`get` (dùng hướng dẫn gần nhất). Không có → hỏi người dùng muốn dùng gì; gợi ý theo stack (RN/React: Zustand + TanStack Query; Flutter: Riverpod; Vue: Pinia).

HTTP client: dùng cái project đã có; không có thì `fetch` (JS), `dio` (Flutter), `OkHttp`/`Ktor` (Android), `URLSession` (iOS).

Ghi kết quả nhận diện vào câu trả lời cho người dùng trong một dòng trước khi sinh code.
