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

  Future<void> login(String email, String password) async {
    final (accessToken, refreshToken, user) =
        await _authApi.login(email, password);
    await ApiClient.instance.saveTokens(accessToken, refreshToken);
    await _storage.write(key: 'user', value: jsonEncode(user.toJson()));
    _user = user;
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiClient.instance.clearToken();
    await _storage.delete(key: 'user');
    _user = null;
    notifyListeners();
  }
}
