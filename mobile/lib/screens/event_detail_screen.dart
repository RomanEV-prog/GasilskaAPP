import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/api_client.dart';
import '../api/events_api.dart';
import '../models/event.dart';
import '../theme.dart';

class EventDetailScreen extends StatefulWidget {
  final Event event;
  const EventDetailScreen({required this.event, super.key});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  final _eventsApi = EventsApi();
  String? _submittedStatus;
  bool _submitting = false;

  Future<void> _rsvp(String status) async {
    setState(() => _submitting = true);
    try {
      await _eventsApi.rsvp(widget.event.id, status);
      setState(() => _submittedStatus = status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prijava je zabeležena.')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = widget.event;
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
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _rsvpButton('attending', 'Pridem', GasilColors.success),
                _rsvpButton('late', 'Zamudim', GasilColors.warning),
                _rsvpButton('maybe', 'Morda', GasilColors.textMuted),
                _rsvpButton('not_attending', 'Ne pridem', GasilColors.danger),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _rsvpButton(String status, String label, Color color) {
    final selected = _submittedStatus == status;
    return FilledButton(
      onPressed: _submitting ? null : () => _rsvp(status),
      style: FilledButton.styleFrom(
        backgroundColor: selected ? color : color.withValues(alpha: 0.85),
        foregroundColor: Colors.white,
      ),
      child: Text(selected ? '✓ $label' : label),
    );
  }
}
