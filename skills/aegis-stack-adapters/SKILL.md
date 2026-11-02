---
name: aegis-stack-adapters
description: Hướng dẫn dịch lõi client aegis (chạy theo profile) sang từng stack — React Native, Expo, React web/Next.js, Vue/Nuxt, Flutter, Android Kotlin, iOS Swift — gồm nơi đặt file, HTTP transport, thư viện crypto (SHA-256/HMAC/base64url/JWS), secure storage cho phiên, device id, biến môi trường; và nối SessionStore + hooks vào từng state manager — Redux Toolkit, RTK Query, Zustand, TanStack Query, Jotai, MobX, Pinia, Riverpod, Bloc. Dùng ở bước sinh code của aegis-integrate.
---

# aegis-stack-adapters

1. Nhận diện stack + state manager (aegis-integrate/references/detect-stack.md).
2. Đọc **một** file stack + **một** file state dưới đây.
3. Dịch lõi theo `~/.aegis/kit/reference/ts/client.ts` (hoặc `reference/dart` cho Flutter) — giữ nguyên ngữ nghĩa, thứ tự key, chính sách phiên; chạy vector.

## Stack

| Stack | File |
|---|---|
| React Native CLI / Expo | [references/stacks/react-native.md](references/stacks/react-native.md) |
| React web / Next.js | [references/stacks/react-web.md](references/stacks/react-web.md) |
| Vue / Nuxt | [references/stacks/vue.md](references/stacks/vue.md) |
| Flutter | [references/stacks/flutter.md](references/stacks/flutter.md) |
| Android Kotlin | [references/stacks/android-kotlin.md](references/stacks/android-kotlin.md) |
| iOS Swift | [references/stacks/ios-swift.md](references/stacks/ios-swift.md) |

## State manager

| State | File |
|---|---|
| Redux Toolkit | [references/state/redux-toolkit.md](references/state/redux-toolkit.md) |
| RTK Query | [references/state/rtk-query.md](references/state/rtk-query.md) |
| Zustand | [references/state/zustand.md](references/state/zustand.md) |
| TanStack Query | [references/state/tanstack-query.md](references/state/tanstack-query.md) |
| Jotai | [references/state/jotai.md](references/state/jotai.md) |
| MobX | [references/state/mobx.md](references/state/mobx.md) |
| Pinia | [references/state/pinia.md](references/state/pinia.md) |
| Riverpod | [references/state/riverpod.md](references/state/riverpod.md) |
| Bloc / Cubit | [references/state/bloc.md](references/state/bloc.md) |

## Cấu trúc thư mục gợi ý (theo quy ước của project nếu đã có)

```
<src>/core/api/
  profile.json         # copy từ .aegis/profile/profile.json (hoặc import trực tiếp)
  actions.<ext>        # sinh từ .aegis/knowledge/<ref>/actions.json (key, mã, mô tả, nguồn)
  client.<ext>         # lõi: buildRequest, classify, session policy
  recipes.<ext>        # công thức ký
  transport.<ext>      # HTTP của stack
  session-store.<ext>  # SessionStore → secure storage + state manager
  __tests__/vectors.*  # chạy vector
```

Quy tắc chung: lõi không import UI/router/store; feature code gọi `client.execute(ACTIONS.X, params)` và xử lý `Result`.
