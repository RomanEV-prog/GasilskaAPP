import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/events_api.dart';
import '../models/event.dart';
import '../theme.dart';
import '../widgets/event_card.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

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
          final events = snapshot.data!;
          if (events.isEmpty) {
            return ListView(children: const [
              SizedBox(height: 120),
              Center(
                child: Text(
                  'Ni dogodkov.',
                  style: TextStyle(color: GasilColors.textMuted),
                ),
              ),
            ]);
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: events
                .map((e) => EventCard(
                      event: e,
                      onTap: () => context.push('/events/${e.id}', extra: e),
                    ))
                .toList(),
          );
        },
      ),
    );
  }
}
