import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/events_api.dart';
import '../models/event.dart';
import '../theme.dart';
import '../widgets/event_card.dart';

class EventsScreen extends StatefulWidget {
  /// Klic za preklop na zavihek Koledar (za dogodke naprej od enega meseca).
  final VoidCallback? onOpenCalendar;
  const EventsScreen({this.onOpenCalendar, super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  final _eventsApi = EventsApi();
  late Future<List<Event>> _future;

  @override
  void initState() {
    super.initState();
    _future = _eventsApi.list();
  }

  Future<void> _refresh() async {
    setState(() => _future = _eventsApi.list());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<List<Event>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(children: [
              const SizedBox(height: 120),
              Center(child: Text('Napaka: ${snapshot.error}')),
            ]);
          }

          final now = DateTime.now();
          final todayStart = DateTime(now.year, now.month, now.day);
          // Mesec naprej: prikaži takoj le dogodke do enega meseca.
          final cutoff = DateTime(now.year, now.month + 1, now.day);

          final all = snapshot.data!;
          final withinMonth = all
              .where((e) =>
                  !e.startsAt.isBefore(todayStart) &&
                  e.startsAt.isBefore(cutoff))
              .toList()
            ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
          final hasLater = all.any((e) => !e.startsAt.isBefore(cutoff));

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (withinMonth.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 80),
                  child: Center(
                    child: Text(
                      'V naslednjem mesecu ni dogodkov.',
                      style: TextStyle(color: GasilColors.textMuted),
                    ),
                  ),
                )
              else
                ...withinMonth.map((e) => EventCard(
                      event: e,
                      onTap: () => context.push('/events/${e.id}', extra: e),
                    )),

              // Za dogodke dlje od enega meseca → Koledar.
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: widget.onOpenCalendar,
                icon: const Icon(Icons.calendar_month),
                label: Text(
                  hasLater
                      ? 'Več dogodkov v koledarju →'
                      : 'Odpri koledar dogodkov',
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
