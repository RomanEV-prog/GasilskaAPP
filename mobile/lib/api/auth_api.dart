import '../models/user.dart';
import 'api_client.dart';

class AuthApi {
  final _client = ApiClient.instance;

  /// Vrne (accessToken, AuthUser) ob uspešni prijavi.
  Future<(String, AuthUser)> login(String email, String password) async {
    final data = await _client.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final token = data['accessToken'] as String;
    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    return (token, user);
  }

  /// Registrira FCM žeton na backendu (PATCH /auth/fcm-token).
  Future<void> updateFcmToken(String fcmToken) async {
    await _client.patch('/auth/fcm-token', data: {'fcmToken': fcmToken});
  }
}
