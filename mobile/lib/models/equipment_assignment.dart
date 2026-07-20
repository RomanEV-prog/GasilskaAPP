import 'equipment.dart';

/// Ena moja odprta zadolžitev opreme.
class MyEquipmentAssignment {
  final String id;
  final DateTime? issuedAt;
  final String? issueNotes;
  final Equipment? equipment;

  MyEquipmentAssignment({
    required this.id,
    this.issuedAt,
    this.issueNotes,
    this.equipment,
  });

  factory MyEquipmentAssignment.fromJson(Map<String, dynamic> json) =>
      MyEquipmentAssignment(
        id: json['id'] as String,
        issuedAt: json['issuedAt'] == null
            ? null
            : DateTime.tryParse(json['issuedAt'] as String),
        issueNotes: json['issueNotes'] as String?,
        equipment: json['equipment'] is Map<String, dynamic>
            ? Equipment.fromJson(json['equipment'] as Map<String, dynamic>)
            : null,
      );
}
