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
  final String? nfcUid;
  final DateTime? purchaseDate;
  final bool isActive;
  final String? vehicleName;

  /// Trenutni imetnik, npr. "Novak Janez"; `null`, če je oprema prosta.
  final String? currentHolderName;
  final DateTime? issuedAt;

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
    this.nfcUid,
    this.purchaseDate,
    required this.isActive,
    this.vehicleName,
    this.currentHolderName,
    this.issuedAt,
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
        nfcUid: json['nfcUid'] as String?,
        purchaseDate: _date(json['purchaseDate']),
        isActive: json['isActive'] as bool? ?? true,
        vehicleName: json['vehicle'] is Map<String, dynamic>
            ? (json['vehicle']['name'] as String?)
            : null,
        currentHolderName: json['currentHolder'] is Map<String, dynamic>
            ? '${json['currentHolder']['lastName']} '
                '${json['currentHolder']['firstName']}'
            : null,
        issuedAt: _date(json['issuedAt']),
      );

  /// Starost iz datuma nabave; brez njega ne ugibamo (datum vnosa ni starost).
  String get starost {
    final d = purchaseDate;
    if (d == null) return '—';
    final months = (DateTime.now().difference(d).inDays / 30.44).floor();
    final years = months ~/ 12;
    final rest = months % 12;
    if (years == 0) return '$rest mes.';
    return rest == 0 ? _leta(years) : '${_leta(years)} $rest mes.';
  }

  /// Slovensko sklanjanje: 1 leto, 2 leti, 3–4 leta, 5+ let.
  static String _leta(int n) {
    final m100 = n % 100;
    final m10 = n % 10;
    if (m100 == 1 || (m10 == 1 && m100 != 11)) return '$n leto';
    if (m100 == 2 || (m10 == 2 && m100 != 12)) return '$n leti';
    if (m10 == 3 || m10 == 4) return '$n leta';
    return '$n let';
  }
}
