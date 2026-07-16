const equipmentConditionLabels = {
  'excellent': 'Odlično',
  'good': 'Dobro',
  'fair': 'Zadovoljivo',
  'poor': 'Slabo',
  'out_of_service': 'Izven uporabe',
};

class Equipment {
  final String id;
  final String name;
  final String? category;
  final String? inventoryNumber;
  final String? location;
  final String condition;
  final DateTime? lastInspection;
  final DateTime? nextInspection;
  final DateTime? expiryDate;
  final String? notes;
  final String? qrCode;
  final bool isActive;
  final String? vehicleName;

  Equipment({
    required this.id,
    required this.name,
    this.category,
    this.inventoryNumber,
    this.location,
    required this.condition,
    this.lastInspection,
    this.nextInspection,
    this.expiryDate,
    this.notes,
    this.qrCode,
    required this.isActive,
    this.vehicleName,
  });

  String get conditionLabel =>
      equipmentConditionLabels[condition] ?? condition;

  static DateTime? _date(dynamic v) =>
      v == null ? null : DateTime.tryParse(v as String);

  factory Equipment.fromJson(Map<String, dynamic> json) => Equipment(
        id: json['id'] as String,
        name: json['name'] as String,
        category: json['category'] as String?,
        inventoryNumber: json['inventoryNumber'] as String?,
        location: json['location'] as String?,
        condition: json['condition'] as String? ?? 'good',
        lastInspection: _date(json['lastInspection']),
        nextInspection: _date(json['nextInspection']),
        expiryDate: _date(json['expiryDate']),
        notes: json['notes'] as String?,
        qrCode: json['qrCode'] as String?,
        isActive: json['isActive'] as bool? ?? true,
        vehicleName: json['vehicle'] is Map<String, dynamic>
            ? (json['vehicle']['name'] as String?)
            : null,
      );
}
