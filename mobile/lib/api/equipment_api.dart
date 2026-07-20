import '../models/equipment.dart';
import '../models/equipment_assignment.dart';
import 'api_client.dart';

class EquipmentApi {
  final _client = ApiClient.instance;

  /// Poišče opremo po QR kodi. Zahteva prijavo; omejeno na lastno društvo.
  Future<Equipment> getByQr(String qrCode) async {
    final data =
        await _client.get('/equipment/qr/${Uri.encodeComponent(qrCode)}');
    return Equipment.fromJson(data as Map<String, dynamic>);
  }

  /// Poišče opremo po strojnem UID NFC oznake — zrcali QR pot.
  Future<Equipment> getByNfc(String uid) async {
    final data = await _client.get('/equipment/nfc/${Uri.encodeComponent(uid)}');
    return Equipment.fromJson(data as Map<String, dynamic>);
  }

  /// Poveže NFC oznako s kosom opreme (samo upravljavci opreme).
  Future<Equipment> linkNfc(String id, String uid) async {
    final data = await _client.patch('/equipment/$id', data: {'nfcUid': uid});
    return Equipment.fromJson(data as Map<String, dynamic>);
  }

  /// Moja trenutno zadolžena oprema.
  Future<List<MyEquipmentAssignment>> myAssignments() async {
    final data = await _client.get('/equipment/my-assignments') as List<dynamic>;
    return data
        .map((e) => MyEquipmentAssignment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Equipment>> list() async {
    final data = await _client.get('/equipment') as List<dynamic>;
    return data
        .map((e) => Equipment.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
