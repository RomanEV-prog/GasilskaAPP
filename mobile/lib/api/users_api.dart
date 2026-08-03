import '../models/notification.dart';
import 'api_client.dart';

/// Ozka projekcija člana za izbirnike (zadolžitev opreme ipd.).
class MemberRef {
  final String id;
  final String fullName;

  const MemberRef({required this.id, required this.fullName});

  factory MemberRef.fromJson(Map<String, dynamic> json) => MemberRef(
        id: json['id'] as String,
        fullName: '${json['lastName'] ?? ''} ${json['firstName'] ?? ''}'.trim(),
      );
}

class UsersApi {
  final _client = ApiClient.instance;

  /// Seznam članov društva (ozka projekcija; urejeno po priimku).
  Future<List<MemberRef>> members() async {
    final data = await _client.get('/users') as List<dynamic>;
    return data
        .map((e) => MemberRef.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Posodobi lastno razpoložljivost.
  Future<void> updateAvailability(String availability) async {
    await _client.patch('/users/me/availability', data: {
      'availability': availability,
    });
  }

  /// Moj profil — vključno z nastavitvijo SPIN obvestil.
  Future<Map<String, dynamic>> me() async {
    return await _client.get('/users/me') as Map<String, dynamic>;
  }

  /// Vklopi/izklopi prejemanje SPIN obvestil.
  Future<void> updateSpinNotifications(bool enabled) async {
    await _client.patch('/users/me/spin-notifications', data: {
      'spinNotifications': enabled,
    });
  }
}

class NotificationsApi {
  final _client = ApiClient.instance;

  Future<List<AppNotification>> mine() async {
    final data = await _client.get('/notifications') as List<dynamic>;
    return data
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> markRead(String id) async {
    await _client.patch('/notifications/$id/read');
  }
}

class DashboardApi {
  final _client = ApiClient.instance;

  Future<Map<String, dynamic>> member() async {
    return await _client.get('/dashboard/member') as Map<String, dynamic>;
  }
}
