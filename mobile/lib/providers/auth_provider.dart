import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../models/user.dart';

/// Upravlja stanje prijave. Žeton hrani ApiClient (secure storage),
/// uporabnika pa serializiramo v secure storage pod 'user'.
class AuthProvider extends ChangeNotifier {
  final _authApi = AuthApi();
  final _storage = const FlutterSecureStorage();

  AuthUser? _user;
  bool _loading = true;

  AuthUser? get user => _user;
  bool get isLoading => _loading;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    // Ko refresh dokončno spodleti (potekla seja), ApiClient nas obvesti →
    // počistimo uporabnika, GoRouter preusmeri na prijavo.
    ApiClient.instance.onSessionExpired = _onSessionExpired;
  }

  void _onSessionExpired() {
    if (_user == null) return;
    _user = null;
    notifyListeners();
  }

  /// Ob zagonu preveri, ali obstaja shranjena seja.
  Future<void> loadSession() async {
    final token = await ApiClient.instance.token;
    final userJson = await _storage.read(key: 'user');
    if (token != null && userJson != null) {
      _user = AuthUser.fromJson(
        jsonDecode(userJson) as Map<String, dynamic>,
      );
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> login(
    String username,
    String password, {
    String? organizationId,
  }) async {
    final (accessToken, refreshToken, user) =
        await _authApi.login(username, password, organizationId: organizationId);
    await ApiClient.instance.saveTokens(accessToken, refreshToken);
    await _storage.write(key: 'user', value: jsonEncode(user.toJson()));
    _user = user;
    notifyListeners();
  }

  Future<void> logout() async {
    // Počisti FCM žeton na strežniku (dokler smo še avtenticirani), da naprava
    // po odjavi ne prejema več push obvestil. Napaka tu ne sme preprečiti odjave.
    try {
      await _authApi.updateFcmToken('');
    } catch (_) {
      // Brez povezave / že potekla seja — odjava se vseeno izvede lokalno.
    }
    await ApiClient.instance.clearToken();
    await _storage.delete(key: 'user');
    _user = null;
    notifyListeners();
  }
}
