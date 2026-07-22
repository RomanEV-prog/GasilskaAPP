import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/event.dart';
import '../theme.dart';

class EventCard extends StatelessWidget {
  final Event event;
  final VoidCallback? onTap;
  const EventCard({required this.event, this.onTap, super.key});

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('EEEE, d. MMMM · HH:mm', 'sl');
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            event.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        if (event.isCancelled)
                          const Padding(
                            padding: EdgeInsets.only(left: 8),
                            child: Text(
                              'ODPOVEDANO',
                              style: TextStyle(
                                color: GasilColors.danger,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      df.format(event.startsAt) +
                          (event.location != null
                              ? ' · ${event.location}'
                              : ''),
                      style: const TextStyle(
                        color: GasilColors.textMuted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Odštevanje do dogodka (danes / jutri / čez N dni).
                  if (_countdown != null) ...[
                    _chip(_countdown!.text, _countdown!.color),
                    const SizedBox(height: 6),
                  ],
                  _chip(event.typeLabel, GasilColors.primary),
                  // Moj odziv, viden brez odpiranja dogodka.
                  if (event.requiresRsvp && !event.isCancelled) ...[
                    const SizedBox(height: 6),
                    _chip(_rsvpLabel, _rsvpColor),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Odštevanje do dogodka: danes / jutri / čez N dni. Null za pretekle/odpovedane.
  ({String text, Color color})? get _countdown {
    if (event.isCancelled) return null;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final ev = DateTime(
      event.startsAt.year,
      event.startsAt.month,
      event.startsAt.day,
    );
    final days = ev.difference(today).inDays;
    if (days < 0) return null;
    if (days == 0) return (text: 'danes', color: GasilColors.danger);
    if (days == 1) return (text: 'jutri', color: GasilColors.danger);
    return (
      text: 'čez $days dni',
      color: days <= 7 ? GasilColors.warning : GasilColors.textMuted,
    );
  }

  String get _rsvpLabel =>
      event.myRsvpStatus == null
          ? 'Brez odziva'
          : (rsvpLabels[event.myRsvpStatus] ?? event.myRsvpStatus!);

  Color get _rsvpColor {
    switch (event.myRsvpStatus) {
      case 'attending':
        return GasilColors.success;
      case 'late':
        return GasilColors.warning;
      case 'not_attending':
        return GasilColors.danger;
      default:
        return GasilColors.textMuted;
    }
  }

  static Widget _chip(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
}
