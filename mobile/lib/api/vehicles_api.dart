import '../models/vehicle.dart';
import 'api_client.dart';

/// Vozila — samo branje (seznam + podrobnosti). Urejanje ostane v spletu.
class VehiclesApi {
  final _client = ApiClient.instance;

  Future<List<Vehicle>> list() async {
    final data = await _client.get('/vehicles') as List<dynamic>;
    return data
        .map((e) => Vehicle.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Vehicle> get(String id) async {
    final data = await _client.get('/vehicles/$id');
    return Vehicle.fromJson(data as Map<String, dynamic>);
  }
}
