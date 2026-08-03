import '../models/equipment.dart';
import '../models/vehicle.dart';
import 'api_client.dart';

/// En pretekli pregled (inventura) opreme vozila.
class VehicleEquipmentCheck {
  final DateTime? performedAt;
  final int total;
  final int presentCount;
  final List<String> missingIds;
  final String? performerName;

  const VehicleEquipmentCheck({
    this.performedAt,
    required this.total,
    required this.presentCount,
    required this.missingIds,
    this.performerName,
  });

  factory VehicleEquipmentCheck.fromJson(Map<String, dynamic> json) =>
      VehicleEquipmentCheck(
        performedAt: json['performedAt'] == null
            ? null
            : DateTime.tryParse(json['performedAt'] as String)?.toLocal(),
        total: json['total'] as int? ?? 0,
        presentCount: json['presentCount'] as int? ?? 0,
        missingIds: (json['missingIds'] as List<dynamic>? ?? [])
            .map((e) => e as String)
            .toList(),
        performerName: json['performer'] is Map<String, dynamic>
            ? '${json['performer']['lastName'] ?? ''} '
                    '${json['performer']['firstName'] ?? ''}'
                .trim()
            : null,
      );
}

/// Vozila — branje ter inventura opreme (urejanje vozil ostane v spletu).
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

  /// Oprema, ki domuje na vozilu (ozka projekcija: naziv, inv. št., oznake).
  Future<List<Equipment>> equipment(String vehicleId) async {
    final data =
        await _client.get('/vehicles/$vehicleId/equipment') as List<dynamic>;
    return data
        .map((e) => Equipment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Zgodovina inventur, najnovejša prva (samo upravljavci opreme).
  Future<List<VehicleEquipmentCheck>> equipmentChecks(String vehicleId) async {
    final data = await _client.get('/vehicles/$vehicleId/equipment-checks')
        as List<dynamic>;
    return data
        .map((e) => VehicleEquipmentCheck.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Zabeleži inventuro (samo upravljavci opreme).
  Future<void> createEquipmentCheck(
    String vehicleId, {
    required List<String> presentIds,
    required List<String> missingIds,
    String? notes,
  }) async {
    await _client.post('/vehicles/$vehicleId/equipment-check', data: {
      'presentIds': presentIds,
      'missingIds': missingIds,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
  }
}
