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

/// Rezultat prijave: bodisi žetoni bodisi 2FA izziv (drugi korak).
sealed class LoginResult {
  const LoginResult();
}

class LoginSuccess extends LoginResult {
  final String accessToken;
  final String refreshToken;
  final AuthUser user;
  const LoginSuccess(this.accessToken, this.refreshToken, this.user);
}

/// Račun ima vklopljeno 2FA — sledi vnos TOTP/rezervne kode (verify2fa).
class LoginTwoFactorChallenge extends LoginResult {
  final String pendingToken;
  const LoginTwoFactorChallenge(this.pendingToken);
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
  /// Ob vklopljeni 2FA vrne [LoginTwoFactorChallenge] namesto žetonov.
  Future<LoginResult> login(
    String username,
    String password, {
    String? organizationId,
  }) async {
    final data = await _client.post('/auth/login', data: {
      'username': username,
      'password': password,
      if (organizationId != null) 'organizationId': organizationId,
    });
    return _parseLoginResult(data);
  }

  /// Drugi korak prijave pri 2FA: TOTP ali rezervna koda.
  Future<LoginSuccess> verify2fa(String pendingToken, String code) async {
    final data = await _client.post('/auth/2fa/verify', data: {
      'pendingToken': pendingToken,
      'code': code,
    });
    return _parseLoginResult(data) as LoginSuccess;
  }

  LoginResult _parseLoginResult(dynamic data) {
    if (data['requires2fa'] == true) {
      return LoginTwoFactorChallenge(data['pendingToken'] as String);
    }
    return LoginSuccess(
      data['accessToken'] as String,
      data['refreshToken'] as String,
      AuthUser.fromJson(data['user'] as Map<String, dynamic>),
    );
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
