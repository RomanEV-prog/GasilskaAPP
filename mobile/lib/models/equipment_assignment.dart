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
            : DateTime.tryParse(json['issuedAt'] as String)?.toLocal(),
        issueNotes: json['issueNotes'] as String?,
        equipment: json['equipment'] is Map<String, dynamic>
            ? Equipment.fromJson(json['equipment'] as Map<String, dynamic>)
            : null,
      );
}

/// Vnos v zgodovini zadolžitev kosa opreme (za upravljavce).
class AssignmentHistoryEntry {
  final String id;
  final DateTime? issuedAt;
  final DateTime? returnedAt;
  final String? memberName;
  final String? conditionAtIssue;
  final String? conditionAtReturn;
  final String? issueNotes;
  final String? returnNotes;

  AssignmentHistoryEntry({
    required this.id,
    this.issuedAt,
    this.returnedAt,
    this.memberName,
    this.conditionAtIssue,
    this.conditionAtReturn,
    this.issueNotes,
    this.returnNotes,
  });

  static DateTime? _date(dynamic v) =>
      v == null ? null : DateTime.tryParse(v as String)?.toLocal();

  factory AssignmentHistoryEntry.fromJson(Map<String, dynamic> json) =>
      AssignmentHistoryEntry(
        id: json['id'] as String,
        issuedAt: _date(json['issuedAt']),
        returnedAt: _date(json['returnedAt']),
        memberName: json['user'] is Map<String, dynamic>
            ? '${json['user']['lastName'] ?? ''} '
                    '${json['user']['firstName'] ?? ''}'
                .trim()
            : null,
        conditionAtIssue: json['conditionAtIssue'] as String?,
        conditionAtReturn: json['conditionAtReturn'] as String?,
        issueNotes: json['issueNotes'] as String?,
        returnNotes: json['returnNotes'] as String?,
      );
}
