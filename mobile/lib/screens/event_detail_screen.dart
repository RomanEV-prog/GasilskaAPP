import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/events_api.dart';
import '../models/event.dart';
import '../theme.dart';
import '../widgets/rsvp_buttons.dart';

/// Podrobnosti dogodka. Ob odprtju osveži podatke s strežnika (da je viden
/// tudi že oddani odziv, npr. oddan v drugem zavihku), do takrat pokaže
/// podatke, ki jih je dobil ob navigaciji.
class EventDetailScreen extends StatefulWidget {
  final Event event;
  const EventDetailScreen({required this.event, super.key});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late Event _event = widget.event;
  bool _fresh = false;

  @override
  void initState() {
    super.initState();
    EventsApi().get(widget.event.id).then((e) {
      if (mounted) {
        setState(() {
          _event = e;
          _fresh = true;
        });
      }
    }).catchError((_) {
      // Strežnik nedosegljiv — ostanemo pri podatkih iz seznama.
      if (mounted) setState(() => _fresh = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final e = _event;
    final df = DateFormat('EEEE, d. MMMM yyyy · HH:mm', 'sl');
    final timeFmt = DateFormat('HH:mm', 'sl');

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
          // Začetek in predvideni konec (npr. "sobota, 1. avgust 2026 · 09:00–13:00").
          Text(
            '${df.format(e.startsAt)}'
            '${e.endsAt != null ? '–${timeFmt.format(e.endsAt!)}' : ''}',
          ),
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
            if (_fresh)
              RsvpButtons(eventId: e.id, initialStatus: e.myRsvpStatus)
            else
              const Center(child: CircularProgressIndicator()),
          ],
        ],
      ),
    );
  }
}
