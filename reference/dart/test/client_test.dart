import 'dart:convert';
import 'dart:io';

import 'package:aegis_client/aegis_client.dart';
import 'package:test/test.dart';

class MemoryStore implements SessionStore {
  MemoryStore(this.value);
  Map<String, Object?>? value;
  int cleared = 0;
  @override
  Future<Map<String, Object?>?> get() async => value;
  @override
  Future<void> set(Map<String, Object?> s) async => value = s;
  @override
  Future<void> clear() async {
    value = null;
    cleared++;
  }
}

void main() {
  final root = Directory.current.uri.resolve('../../profiles/demo/');
  final profile = jsonDecode(File.fromUri(root.resolve('profile.json')).readAsStringSync()) as Map<String, dynamic>;
  final vectors = jsonDecode(File.fromUri(root.resolve('vectors.json')).readAsStringSync()) as Map<String, dynamic>;

  AegisClient make(Map<String, Object?>? s, {Transport? transport, AegisHooks hooks = const AegisHooks(), MemoryStore? store}) => AegisClient(
        profile: profile,
        config: (vectors['config'] as Map).cast<String, Object?>(),
        session: store ?? MemoryStore(s),
        device: () async => (vectors['device'] as Map).cast<String, Object?>(),
        clock: () => DateTime.parse(vectors['now'] as String),
        transport: transport,
        hooks: hooks,
      );

  for (final c in (vectors['cases'] as List).cast<Map<String, dynamic>>()) {
    test('vector: ${c['name']}', () async {
      final call = c['call'] as Map;
      final session = (c['session'] as Map?)?.cast<String, Object?>();
      final req = await make(session).buildRequest(call['action'] as String?, ((call['params'] as Map?) ?? {}).cast<String, Object?>(), call['route'] as String);
      final exp = c['expect'] as Map;
      expect(jsonEncode(req.headers), jsonEncode(exp['headers']));
      expect(jsonEncode(req.body), jsonEncode(exp['body']));
      expect(req.url, exp['url']);
    });
  }

  HttpResponseData ok([Object? data = const {}]) => HttpResponseData(200, {'status': {'code': 'OK'}, 'data': data});
  HttpResponseData notOk(String m, [String? e]) => HttpResponseData(200, {'status': {'code': 'FAIL', 'message': m, 'error': e}});

  test('token hết hạn → refresh 1 lần → gọi lại', () async {
    final calls = <String>[];
    final store = MemoryStore({'accessToken': 'demo-old', 'refreshToken': 'demo-refresh'});
    final client = make(null, store: store, transport: (req) async {
      calls.add(req.url.split('/').last);
      if (req.url.endsWith('refresh')) return ok({'access': 'demo-new'});
      return req.headers['xToken'] == 'demo-new' ? ok([1]) : notOk('Token has expired.');
    });
    final r = await client.execute('DEMO_X');
    expect(r.kind, ResultKind.ok);
    expect(calls, ['execute', 'refresh', 'execute']);
    expect(store.value?['accessToken'], 'demo-new');
  });

  test('auth-invalid → logout, không retry', () async {
    var logout = 0;
    final store = MemoryStore({'accessToken': 'demo-a'});
    final client = make(null, store: store, transport: (_) async => notOk('x', 'E_AUTH'), hooks: AegisHooks(onLogout: (_) => logout++));
    final r = await client.execute('DEMO_X');
    expect(r.kind, ResultKind.authInvalid);
    expect(logout, 1);
    expect(store.value, isNull);
  });

  test('network', () async {
    final client = make(null, transport: (_) async => throw const SocketException('down'));
    expect((await client.execute('DEMO_X')).kind, ResultKind.network);
  });
}
