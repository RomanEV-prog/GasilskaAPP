import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/event.dart';
import '../theme.dart';
import '../widgets/rsvp_buttons.dart';

class EventDetailScreen extends StatelessWidget {
  final Event event;
  const EventDetailScreen({required this.event, super.key});

  @override
  Widget build(BuildContext context) {
    final e = event;
    final df = DateFormat('EEEE, d. MMMM yyyy · HH:mm', 'sl');

    return Scaffold(
      appBar: AppBar(title: Text(e.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (e.isCancelled)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: GasilColors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Dogodek je ODPOVEDAN.',
                style: TextStyle(
                  color: GasilColors.danger,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          Text(
            e.typeLabel,
            style: const TextStyle(
              color: GasilColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(df.format(e.startsAt)),
          if (e.location != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.place, size: 16, color: GasilColors.textMuted),
                const SizedBox(width: 4),
                Text(e.location!),
              ],
            ),
          ],
          if (e.description != null) ...[
            const SizedBox(height: 16),
            Text(e.description!),
          ],
          const SizedBox(height: 24),

          if (e.requiresRsvp && !e.isCancelled) ...[
            const Text(
              'Moja udeležba',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            RsvpButtons(eventId: e.id),
          ],
        ],
      ),
    );
  }
}
