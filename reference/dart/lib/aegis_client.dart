// Client mẫu chạy theo profile (bản Dart của reference/ts/client.ts).
// Lõi thuần: không UI, không điều hướng, không state manager — trả AegisResult + hooks.
import 'dart:convert';

import 'package:crypto/crypto.dart' as c;
import 'package:http/http.dart' as http;

enum ResultKind { ok, businessError, tokenExpired, sessionExpired, authInvalid, network, unexpected }

class AegisResult {
  AegisResult(this.kind, {this.data, this.message, this.code, this.httpStatus, this.raw, this.error});
  final ResultKind kind;
  final Object? data;
  final String? message;
  final String? code;
  final int? httpStatus;
  final Object? raw;
  final Object? error;
}

class HttpRequestData {
  HttpRequestData(this.url, this.method, this.headers, this.body);
  final String url;
  final String method;
  final Map<String, String> headers;
  final Object? body;
}

class HttpResponseData {
  HttpResponseData(this.status, this.json);
  final int status;
  final Object? json;
}

typedef Transport = Future<HttpResponseData> Function(HttpRequestData req);

abstract class SessionStore {
  Future<Map<String, Object?>?> get();
  Future<void> set(Map<String, Object?> session);
  Future<void> clear();
}

class AegisHooks {
  const AegisHooks({this.onLogout, this.onSessionExpired, this.onServerMessage});
  final void Function(AegisResult)? onLogout;
  final void Function(AegisResult)? onSessionExpired;
  final void Function(AegisResult)? onServerMessage;
}

/// Đánh dấu "không có giá trị" (khác null) — tương đương undefined của JS.
const Object missing = _Missing();

class _Missing {
  const _Missing();
}

Object? getPath(Object? obj, String path, {bool keepMissing = false}) {
  Object? cur = obj;
  for (final part in path.split('.')) {
    if (cur is Map && cur.containsKey(part)) {
      cur = cur[part];
    } else {
      return keepMissing ? missing : null;
    }
  }
  return cur;
}

bool _falsy(Object? v) => v == null || identical(v, missing) || v == '' || v == 0 || v == false;

String _pad(int n) => n.toString().padLeft(2, '0');
String formatDate(DateTime d, String fmt) => fmt
    .replaceFirst('yyyy', d.year.toString())
    .replaceFirst('MM', _pad(d.month))
    .replaceFirst('dd', _pad(d.day))
    .replaceFirst('HH', _pad(d.hour))
    .replaceFirst('mm', _pad(d.minute))
    .replaceFirst('ss', _pad(d.second));

final _whole = RegExp(r'^\{([^{}]+)\}$');
final _inline = RegExp(r'\{([^{}]+)\}');

final _orNull = RegExp(r'\s*\|\|\s*null$');

/// `{x || null}`: falsy → null (như JS `x || null`). `{x?}`: thiếu → bỏ key (như JSON.stringify bỏ undefined).
Object? _eval(String raw, Map<String, Object?> ctx) {
  var expr = raw.trim();
  final orNull = _orNull.hasMatch(expr);
  if (orNull) expr = expr.replaceFirst(_orNull, '');
  final optional = expr.endsWith('?');
  if (optional) expr = expr.substring(0, expr.length - 1);
  final v = expr.startsWith('now:') ? formatDate(ctx['now'] as DateTime, expr.substring(4)) : getPath(ctx, expr, keepMissing: true);
  if (orNull) return _falsy(v) ? null : v;
  if (identical(v, missing)) return optional ? missing : null;
  return v;
}

/// Chuỗi chỉ gồm một template → giữ kiểu; template lẫn trong chuỗi → nối chuỗi.
Object? resolveTemplate(Object? v, Map<String, Object?> ctx) {
  if (v is String) {
    final w = _whole.firstMatch(v);
    if (w != null) return _eval(w.group(1)!, ctx);
    return v.replaceAllMapped(_inline, (m) {
      final r = _eval(m.group(1)!, ctx);
      return r == null || identical(r, missing) ? '' : r.toString();
    });
  }
  if (v is List) return v.map((x) => resolveTemplate(x, ctx)).toList();
  if (v is Map) {
    final out = <String, Object?>{};
    for (final e in v.entries) {
      final r = resolveTemplate(e.value, ctx);
      if (!identical(r, missing)) out[e.key as String] = r;
    }
    return out;
  }
  return v;
}

String _b64url(List<int> bytes) => base64Url.encode(bytes).replaceAll('=', '');
String _hex(List<int> bytes) => bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

String signingInput(Map signing, Object? data, Object? body) {
  if (signing['over'] == 'fields') {
    final d = (data as Map?) ?? {};
    return ((signing['fields'] as List?) ?? []).map((k) => '$k=${d[k] ?? ''}').join('&');
  }
  return jsonEncode(signing['over'] == 'body' ? body : data);
}

String sign(Map signing, String input, String secret, Object? payload) {
  String out(List<int> b) => signing['encoding'] == 'base64' ? base64.encode(b) : _hex(b);
  switch (signing['recipe']) {
    case 'hash-b64url-dot-secret':
    case 'kv-string-hash':
      final material = utf8.encode('${_b64url(utf8.encode(input))}.$secret');
      return out((signing['alg'] == 'sha512' ? c.sha512 : c.sha256).convert(material).bytes);
    case 'hmac-sha256':
      return out(c.Hmac(c.sha256, utf8.encode(secret)).convert(utf8.encode(input)).bytes);
    case 'jws-hs256':
      final head = _b64url(utf8.encode(jsonEncode(signing['jwsHeader'] ?? {'alg': 'HS256', 'typ': 'JWT'})));
      final body = _b64url(utf8.encode(jsonEncode(payload)));
      final sig = _b64url(c.Hmac(c.sha256, utf8.encode(secret)).convert(utf8.encode('$head.$body')).bytes);
      return '$head.$body.$sig';
    case 'none':
      return '';
    default:
      throw ArgumentError('recipe không hỗ trợ: ${signing['recipe']}');
  }
}

Transport httpTransport({Duration timeout = const Duration(minutes: 5)}) => (req) async {
      final res = await http
          .post(Uri.parse(req.url), headers: req.headers, body: jsonEncode(req.body))
          .timeout(timeout);
      Object? json;
      try {
        json = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {}
      return HttpResponseData(res.statusCode, json);
    };

class AegisClient {
  AegisClient({
    required this.profile,
    required this.config,
    required this.session,
    required this.device,
    Transport? transport,
    this.hooks = const AegisHooks(),
    DateTime Function()? clock,
  })  : transport = transport ?? httpTransport(),
        clock = clock ?? DateTime.now;

  final Map<String, dynamic> profile;
  final Map<String, Object?> config;
  final SessionStore session;
  final Future<Map<String, Object?>> Function() device;
  final Transport transport;
  final AegisHooks hooks;
  final DateTime Function() clock;

  Future<HttpRequestData> buildRequest(String? action, [Map<String, Object?> params = const {}, String route = 'execute']) async {
    final r = (profile['routes'] as Map)[route] as Map?;
    if (r == null) throw ArgumentError('profile không có route "$route"');
    final ctx = <String, Object?>{'config': config, 'session': await session.get(), 'device': await device(), 'now': clock(), 'action': r['action'] ?? action};
    final env = profile['envelope'] as Map;
    Object? data;
    Object? body;
    if (r['body'] != null) {
      body = resolveTemplate(r['body'], ctx);
      data = body;
    } else {
      final defaults = r['defaults'] == false ? <String, Object?>{} : resolveTemplate(env['defaults'] ?? {}, ctx) as Map;
      data = <String, Object?>{...defaults.cast<String, Object?>(), ...params};
      final metaKey = env['metaKey'] as String?;
      final dataKey = env['dataKey'] as String?;
      final meta = metaKey != null ? resolveTemplate(env['meta'] ?? {}, ctx) : null;
      if (dataKey != null) {
        body = {if (metaKey != null) metaKey: meta, dataKey: data};
      } else {
        body = {if (metaKey != null) metaKey: meta, ...(data as Map)};
      }
    }
    final tpl = ((r['headers'] ?? profile['headers']) as Map).cast<String, String>();
    var signature = '';
    if (tpl.values.any((v) => v.contains('{signature}'))) {
      final signing = (r['signing'] ?? profile['signing']) as Map;
      signature = sign(signing, signingInput(signing, data, body), config['secret'] as String, data);
    }
    final headers = {for (final e in tpl.entries) e.key: (resolveTemplate(e.value, {...ctx, 'signature': signature}) ?? '').toString()};
    final base = (config['baseUrl'] as String).replaceAll(RegExp(r'/+$'), '');
    final path = (r['path'] as String).replaceAll(RegExp(r'^/+'), '');
    return HttpRequestData('$base/$path', (profile['transport']?['method'] as String?) ?? 'POST', headers, body);
  }

  bool _match(Map? rule, String? message, String? code) {
    if (rule == null) return false;
    final msgs = (rule['messages'] as List?) ?? [];
    final codes = (rule['codes'] as List?) ?? [];
    return (message != null && msgs.contains(message.trim())) || (code != null && codes.contains(code));
  }

  AegisResult classify(HttpResponseData res) {
    final json = res.json;
    if (json is! Map) return AegisResult(ResultKind.unexpected, httpStatus: res.status, raw: json);
    final resp = profile['response'] as Map;
    final status = getPath(json, resp['statusPath'] as String);
    final message = resp['messagePath'] != null ? getPath(json, resp['messagePath'] as String) as String? : null;
    final code = resp['codePath'] != null ? getPath(json, resp['codePath'] as String) as String? : null;
    final data = resp['dataPath'] != null ? getPath(json, resp['dataPath'] as String) : json;
    AegisResult mk(ResultKind k) => AegisResult(k, data: data, message: message, code: code, httpStatus: res.status, raw: json);
    if ((resp['okValues'] as List).contains(status)) return mk(ResultKind.ok);
    if (status == null) return mk(ResultKind.unexpected);
    final s = profile['session'] as Map;
    if (_match(s['tokenExpired'] as Map?, message, code)) return mk(ResultKind.tokenExpired);
    if (_match(s['sessionExpired'] as Map?, message, code)) return mk(ResultKind.sessionExpired);
    if (_match(s['authInvalid'] as Map?, message, code)) return mk(ResultKind.authInvalid);
    return mk(ResultKind.businessError);
  }

  Future<AegisResult> _send(HttpRequestData req) async {
    try {
      return classify(await transport(req));
    } catch (e) {
      return AegisResult(ResultKind.network, error: e, message: e.toString());
    }
  }

  Map<String, Object?> _extract(Map? map, Object? json) => {
        for (final e in (map ?? {}).entries)
          if (getPath(json, e.value as String) != null) e.key as String: getPath(json, e.value as String)
      };

  Future<void> logout([AegisResult? r]) async {
    await session.clear();
    hooks.onLogout?.call(r ?? AegisResult(ResultKind.ok));
  }

  Future<AegisResult> login(Map<String, Object?> credentials) async {
    final r = await _send(await buildRequest(null, credentials, 'login'));
    if (r.kind == ResultKind.ok) {
      final next = _extract((profile['session'] as Map)['fromLogin'] as Map?, r.raw);
      if ((profile['session'] as Map)['relogin'] == 'stored-credentials') next['credentials'] = credentials;
      await session.set(next);
    }
    return r;
  }

  Future<AegisResult> refresh() async {
    if ((profile['routes'] as Map)['refresh'] == null) return AegisResult(ResultKind.unexpected, message: 'profile không có route refresh');
    final r = await _send(await buildRequest(null, const {}, 'refresh'));
    if (r.kind == ResultKind.ok) {
      await session.set({...?(await session.get()), ..._extract((profile['session'] as Map)['fromRefresh'] as Map?, r.raw)});
    }
    return r;
  }

  Future<AegisResult> execute(String action, [Map<String, Object?> params = const {}, String route = 'execute']) =>
      _run(action, params, route, _State());

  Future<AegisResult> _onSessionExpired(AegisResult r, Future<AegisResult> Function() retry, _State st) async {
    final creds = (await session.get())?['credentials'];
    if ((profile['session'] as Map)['relogin'] == 'stored-credentials' && creds is Map && !st.relogged) {
      st.relogged = true;
      if ((await login(creds.cast<String, Object?>())).kind == ResultKind.ok) return retry();
      await logout(r);
      return r;
    }
    hooks.onSessionExpired?.call(r);
    return r;
  }

  Future<AegisResult> _run(String action, Map<String, Object?> params, String route, _State st) async {
    final r = await _send(await buildRequest(action, params, route));
    Future<AegisResult> retry() => _run(action, params, route, st);
    switch (r.kind) {
      case ResultKind.tokenExpired:
        if (st.refreshed) return r;
        st.refreshed = true;
        final rr = await refresh();
        if (rr.kind == ResultKind.ok) return retry();
        if (rr.kind == ResultKind.sessionExpired) return _onSessionExpired(rr, retry, st);
        if (rr.kind != ResultKind.network) await logout(rr);
        return rr;
      case ResultKind.sessionExpired:
        return _onSessionExpired(r, retry, st);
      case ResultKind.authInvalid:
        await logout(r);
        return r;
      case ResultKind.businessError:
        hooks.onServerMessage?.call(r);
        return r;
      default:
        return r;
    }
  }
}

class _State {
  bool refreshed = false;
  bool relogged = false;
}
