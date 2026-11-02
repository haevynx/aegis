# Bloc / Cubit (Flutter)

- `AuthCubit` giữ `Session?`; `BlocSessionStore` gọi `authCubit.emit(...)` trong `set/clear`, lưu `flutter_secure_storage`.
- Mỗi chức năng một Bloc/Cubit gọi `client.execute(...)`; map `Result.kind` → state: `ok` → Loaded, `business-error` → Failure(message), `network` → Offline.
- `hooks.onLogout` → `authCubit.signedOut()`; `BlocListener<AuthCubit>` ở gốc app điều hướng về Login.
