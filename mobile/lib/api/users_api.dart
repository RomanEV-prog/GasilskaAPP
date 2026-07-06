import '../models/notification.dart';
import 'api_client.dart';

class UsersApi {
  final _client = ApiClient.instance;

  /// Posodobi lastno razpoložljivost.
  Future<void> updateAvailability(String availability) async {
    await _client.patch('/users/me/availability', data: {
      'availability': availability,
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
