import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Bazni URL backenda.
/// Android emulator doseže gostiteljev localhost prek 10.0.2.2.
/// Za fizično napravo zamenjaj z IP računalnika v omrežju.
const String kApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:4000/api/v1',
);

/// Vrže se ob napaki API-ja; nosi slovensko sporočilo za prikaz.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: kApiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        final req = e.requestOptions;
        final is401 = e.response?.statusCode == 401;
        final isAuthCall = req.path.contains('/auth/');
        final alreadyRetried = req.extra['_retried'] == true;

        if (is401 && !isAuthCall && !alreadyRetried) {
          try {
            final newToken = await _refreshAccessToken();
            req.extra['_retried'] = true;
            req.headers['Authorization'] = 'Bearer $newToken';
            final response = await _dio.fetch<dynamic>(req);
            return handler.resolve(response);
          } catch (_) {
            // Refresh spodletel → seja poteče. Počisti žeton in obvesti
            // aplikacijo (AuthProvider), da preusmeri na prijavo — sicer bi
            // uporabnik obtičal na avtenticiranem zaslonu s failajočimi klici.
            await clearToken();
            onSessionExpired?.call();
          }
        }
        handler.next(e);
      },
    ));
  }

  static final ApiClient instance = ApiClient._internal();

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();
  Future<String>? _refreshing;

  /// Kliče se, ko refresh dokončno spodleti (seja je potekla). AuthProvider
  /// to nastavi na svoj logout, da se UI preusmeri na prijavni zaslon.
  void Function()? onSessionExpired;

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'accessToken', value: accessToken);
    await _storage.write(key: 'refreshToken', value: refreshToken);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
  }

  Future<String?> get token => _storage.read(key: 'accessToken');

  /// En sam refresh naenkrat — vzporedni 401-ji si delijo isti klic.
  Future<String> _refreshAccessToken() {
    return _refreshing ??= _doRefresh().whenComplete(() {
      _refreshing = null;
    });
  }

  Future<String> _doRefresh() async {
    final refreshToken = await _storage.read(key: 'refreshToken');
    if (refreshToken == null) {
      throw ApiException('Ni refresh žetona.', 401);
    }
    // Ločen Dio (brez interceptorjev), da se izognemo rekurziji.
    final bare = Dio(BaseOptions(baseUrl: kApiBaseUrl));
    final res = await bare.post<dynamic>(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
    );
    final body = res.data;
    final data = body is Map<String, dynamic> && body.containsKey('data')
        ? body['data'] as Map<String, dynamic>
        : body as Map<String, dynamic>;
    final newAccess = data['accessToken'] as String;
    await saveTokens(newAccess, data['refreshToken'] as String);
    return newAccess;
  }

  /// Izvleče `data` iz ovoja `{ success, data }`.
  dynamic _unwrap(Response response) {
    final body = response.data;
    if (body is Map<String, dynamic> && body.containsKey('data')) {
      return body['data'];
    }
    return body;
  }

  /// Pretvori DioException v berljivo slovensko sporočilo.
  ApiException _toApiException(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic> && data['message'] != null) {
      final msg = data['message'];
      final text = msg is List ? msg.join(' ') : msg.toString();
      return ApiException(text, e.response?.statusCode);
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.connectionError) {
      return ApiException('Ni povezave s strežnikom.', null);
    }
    return ApiException('Prišlo je do napake.', e.response?.statusCode);
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.get(path, queryParameters: query);
      return _unwrap(res);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<dynamic> post(String path, {Object? data}) async {
    try {
      final res = await _dio.post(path, data: data);
      return _unwrap(res);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<dynamic> patch(String path, {Object? data}) async {
    try {
      final res = await _dio.patch(path, data: data);
      return _unwrap(res);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }
}
