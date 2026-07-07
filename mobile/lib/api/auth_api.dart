import '../models/user.dart';
import 'api_client.dart';

/// Javno dostopno društvo za izbiro ob prijavi.
class PublicOrganization {
  final String id;
  final String name;
  const PublicOrganization({required this.id, required this.name});

  factory PublicOrganization.fromJson(Map<String, dynamic> json) =>
      PublicOrganization(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}

class AuthApi {
  final _client = ApiClient.instance;

  /// Javni seznam društev (brez prijave) — za izbiro ob prvi uporabi.
  Future<List<PublicOrganization>> publicOrganizations() async {
    final data = await _client.get('/auth/organizations') as List<dynamic>;
    return data
        .map((e) => PublicOrganization.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Prijava z uporabniškim imenom (ime.priimek) znotraj izbranega društva.
  /// Vrne (accessToken, refreshToken, AuthUser).
  Future<(String, String, AuthUser)> login(
    String username,
    String password, {
    String? organizationId,
  }) async {
    final data = await _client.post('/auth/login', data: {
      'username': username,
      'password': password,
      if (organizationId != null) 'organizationId': organizationId,
    });
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    return (accessToken, refreshToken, user);
  }

  /// Prijavljeni uporabnik si spremeni geslo.
  Future<void> changePassword(
      String currentPassword, String newPassword) async {
    await _client.post('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  /// Registrira FCM žeton na backendu (PATCH /auth/fcm-token).
  Future<void> updateFcmToken(String fcmToken) async {
    await _client.patch('/auth/fcm-token', data: {'fcmToken': fcmToken});
  }
}
