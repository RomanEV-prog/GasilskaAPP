import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../api/events_api.dart';
import '../models/event.dart';
import '../theme.dart';
import '../widgets/rsvp_buttons.dart';

/// Koledar z dogodki. Uporabnik izbere dan, vidi dogodke in potrdi udeležbo.
class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final _eventsApi = EventsApi();
  List<Event> _events = [];
  bool _loading = true;
  String? _error;

  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final events = await _eventsApi.list();
      setState(() {
        _events = events;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Event> _eventsForDay(DateTime day) =>
      _events.where((e) => isSameDay(e.startsAt, day)).toList()
        ..sort((a, b) => a.startsAt.compareTo(b.startsAt));

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(child: Text('Napaka: $_error'));
    }

    final now = DateTime.now();
    final selectedEvents = _eventsForDay(_selectedDay);
    final df = DateFormat('HH:mm', 'sl');

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        children: [
          TableCalendar<Event>(
            locale: 'sl',
            firstDay: DateTime(now.year - 1, 1, 1),
            lastDay: DateTime(now.year + 2, 12, 31),
            focusedDay: _focusedDay,
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            eventLoader: _eventsForDay,
            startingDayOfWeek: StartingDayOfWeek.monday,
            availableCalendarFormats: const {CalendarFormat.month: 'Mesec'},
            headerStyle: const HeaderStyle(
              formatButtonVisible: false,
              titleCentered: true,
            ),
            calendarStyle: const CalendarStyle(
              todayDecoration: BoxDecoration(
                color: GasilColors.primary,
                shape: BoxShape.circle,
              ),
              selectedDecoration: BoxDecoration(
                color: GasilColors.primaryDark,
                shape: BoxShape.circle,
              ),
              markerDecoration: BoxDecoration(
                color: GasilColors.warning,
                shape: BoxShape.circle,
              ),
            ),
            onDaySelected: (selected, focused) {
              setState(() {
                _selectedDay = selected;
                _focusedDay = focused;
              });
            },
            onPageChanged: (focused) => _focusedDay = focused,
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text(
              DateFormat('EEEE, d. MMMM yyyy', 'sl').format(_selectedDay),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          if (selectedEvents.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Na ta dan ni dogodkov.',
                style: TextStyle(color: GasilColors.textMuted),
              ),
            )
          else
            ...selectedEvents.map((e) => _dayEvent(e, df)),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _dayEvent(Event e, DateFormat timeFmt) {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: () => context.push('/events/${e.id}', extra: e),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          e.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${timeFmt.format(e.startsAt)} · ${e.typeLabel}'
                          '${e.location != null ? ' · ${e.location}' : ''}',
                          style: const TextStyle(
                            color: GasilColors.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (e.isCancelled)
                    const Text(
                      'ODPOVEDANO',
                      style: TextStyle(
                        color: GasilColors.danger,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  else
                    const Icon(Icons.chevron_right,
                        color: GasilColors.textMuted),
                ],
              ),
            ),
            if (e.requiresRsvp && !e.isCancelled) ...[
              const SizedBox(height: 10),
              RsvpButtons(
                eventId: e.id,
                compact: true,
                initialStatus: e.myRsvpStatus,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
