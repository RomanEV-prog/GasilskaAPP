import '../models/equipment.dart';
import 'api_client.dart';

class EquipmentApi {
  final _client = ApiClient.instance;

  /// Poišče opremo po QR kodi (javni endpoint na backendu).
  Future<Equipment> getByQr(String qrCode) async {
    final data = await _client.get('/equipment/qr/${Uri.encodeComponent(qrCode)}');
    return Equipment.fromJson(data as Map<String, dynamic>);
  }

  Future<List<Equipment>> list() async {
    final data = await _client.get('/equipment') as List<dynamic>;
    return data
        .map((e) => Equipment.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
