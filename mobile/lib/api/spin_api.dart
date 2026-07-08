import '../models/spin_intervention.dart';
import 'api_client.dart';

class SpinApi {
  final _client = ApiClient.instance;

  /// Nedavne intervencije SPIN za občino društva.
  Future<List<SpinIntervention>> interventions() async {
    final data = await _client.get('/spin/interventions') as List<dynamic>;
    return data
        .map((e) => SpinIntervention.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
