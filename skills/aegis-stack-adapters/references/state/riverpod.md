# Riverpod (Flutter)

```dart
final sessionProvider = StateProvider<Session?>((ref) => null);
class RiverpodSessionStore implements SessionStore {
  RiverpodSessionStore(this.ref, this.secure);
  final Ref ref; final FlutterSecureStorage secure;
  @override Future<Session?> get() async => ref.read(sessionProvider) ?? await loadFrom(secure);
  @override Future<void> set(Session s) async { await saveTo(secure, s); ref.read(sessionProvider.notifier).state = s.withoutCredentials(); }
  @override Future<void> clear() async { await secure.deleteAll(); ref.read(sessionProvider.notifier).state = null; }
}
final clientProvider = Provider((ref) => AegisClient(profile: ..., config: ..., session: RiverpodSessionStore(ref, const FlutterSecureStorage()), device: deviceInfo));
final claimsProvider = FutureProvider.family((ref, Map<String, Object?> p) async => unwrap(await ref.read(clientProvider).execute(Actions.claimList, p)));
```

Router (go_router) `redirect` khi `sessionProvider == null`.
