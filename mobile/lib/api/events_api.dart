import '../models/event.dart';
import 'api_client.dart';

class EventsApi {
  final _client = ApiClient.instance;

  Future<List<Event>> list() async {
    final data = await _client.get('/events') as List<dynamic>;
    return data
        .map((e) => Event.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Event>> upcoming() async {
    final data = await _client.get('/events/upcoming') as List<dynamic>;
    return data
        .map((e) => Event.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> rsvp(String eventId, String status, {String? note}) async {
    await _client.post('/events/$eventId/rsvp', data: {
      'status': status,
      if (note != null) 'note': note,
    });
  }
}
