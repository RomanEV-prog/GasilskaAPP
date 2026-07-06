import '../models/user.dart';
import 'api_client.dart';

class AuthApi {
  final _client = ApiClient.instance;

  /// Vrne (accessToken, refreshToken, AuthUser) ob uspešni prijavi.
  Future<(String, String, AuthUser)> login(
      String email, String password) async {
    final data = await _client.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    return (accessToken, refreshToken, user);
  }

  /// Registrira FCM žeton na backendu (PATCH /auth/fcm-token).
  Future<void> updateFcmToken(String fcmToken) async {
    await _client.patch('/auth/fcm-token', data: {'fcmToken': fcmToken});
  }
}
