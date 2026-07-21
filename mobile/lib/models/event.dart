const eventTypeLabels = {
  'drill': 'Vaja',
  'meeting': 'Sestanek',
  'competition': 'Tekmovanje',
  'intervention': 'Intervencija',
  'cleanup': 'Čistilna akcija',
  'celebration': 'Proslava',
  'assembly': 'Občni zbor',
  'operative_day': 'Operativni dan',
  'other': 'Drugo',
};

const rsvpLabels = {
  'attending': 'Pridem',
  'not_attending': 'Ne pridem',
  'late': 'Zamudim',
};

class Event {
  final String id;
  final String title;
  final String? description;
  final String? location;
  final String eventType;
  final DateTime startsAt;
  final DateTime? endsAt;
  final bool requiresRsvp;
  final bool isCancelled;

  /// Odziv trenutnega uporabnika (attending/late/not_attending) ali null.
  final String? myRsvpStatus;

  Event({
    required this.id,
    required this.title,
    this.description,
    this.location,
    required this.eventType,
    required this.startsAt,
    this.endsAt,
    required this.requiresRsvp,
    required this.isCancelled,
    this.myRsvpStatus,
  });

  String get typeLabel => eventTypeLabels[eventType] ?? eventType;

  factory Event.fromJson(Map<String, dynamic> json) => Event(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        location: json['location'] as String?,
        eventType: json['eventType'] as String? ?? 'other',
        // Backend vrne UTC (timestamptz); .toLocal() prikaže lokalni čas.
        // Brez tega je dogodek ob 9:00 CEST prikazan kot 7:00.
        startsAt: DateTime.parse(json['startsAt'] as String).toLocal(),
        endsAt: json['endsAt'] != null
            ? DateTime.parse(json['endsAt'] as String).toLocal()
            : null,
        requiresRsvp: json['requiresRsvp'] as bool? ?? true,
        isCancelled: json['isCancelled'] as bool? ?? false,
        myRsvpStatus: json['myRsvpStatus'] as String?,
      );
}
