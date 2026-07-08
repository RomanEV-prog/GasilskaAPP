class SpinIntervention {
  final String id;
  final String? spinType;
  final String? obcina;
  final String title;
  final String? description;
  final String? link;
  final DateTime? occurredAt;

  SpinIntervention({
    required this.id,
    this.spinType,
    this.obcina,
    required this.title,
    this.description,
    this.link,
    this.occurredAt,
  });

  factory SpinIntervention.fromJson(Map<String, dynamic> j) {
    return SpinIntervention(
      id: j['id'] as String,
      spinType: j['spinType'] as String?,
      obcina: j['obcina'] as String?,
      title: j['title'] as String? ?? '',
      description: j['description'] as String?,
      link: j['link'] as String?,
      occurredAt: j['occurredAt'] != null
          ? DateTime.tryParse(j['occurredAt'] as String)
          : null,
    );
  }
}
