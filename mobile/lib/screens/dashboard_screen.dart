import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/users_api.dart';
import '../models/event.dart';
import '../models/notification.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import '../widgets/event_card.dart';

class DashboardScreen extends StatefulWidget {
  /// Preklop na zavihek Obvestila (dedup — plošča kaže le povzetek).
  final VoidCallback? onOpenNotifications;
  const DashboardScreen({this.onOpenNotifications, super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _dashboardApi = DashboardApi();
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _dashboardApi.member();
  }

  Future<void> _refresh() async {
    setState(() => _future = _dashboardApi.member());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(
              children: [
                const SizedBox(height: 120),
                Center(child: Text('Napaka: ${snapshot.error}')),
              ],
            );
          }

          final data = snapshot.data!;
          final events = (data['upcomingEvents'] as List<dynamic>)
              .map((e) => Event.fromJson(e as Map<String, dynamic>))
              .toList();
          final notifications = (data['myNotifications'] as List<dynamic>)
              .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
              .toList();
          final trainings = data['myTrainings'] as List<dynamic>;
          // Plošča je povzetek/razdelilnik (dedup — feedback Darjan):
          // naslednji dogodek, usposabljanja, obvestila kot povezava na zavihek.
          final unread = notifications.where((n) => !n.isRead).length;
          final nextEvent = events.isEmpty ? null : events.first;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Pozdravljen, ${user?.firstName ?? ''}!',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),

              // Naslednji dogodek (samo prvi — celoten seznam je v zavihku Dogodki)
              const _SectionTitle('Naslednji dogodek'),
              if (nextEvent == null)
                const _EmptyHint('Ni prihajajočih dogodkov.')
              else
                EventCard(
                  event: nextEvent,
                  onTap: () =>
                      context.push('/events/${nextEvent.id}', extra: nextEvent),
                ),
              const SizedBox(height: 12),

              // Obvestila — samo povzetek, tap odpre zavihek
              const _SectionTitle('Obvestila'),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: Text(
                    unread > 0 ? '$unread neprebranih' : 'Ni novih obvestil',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: widget.onOpenNotifications,
                ),
              ),
              const SizedBox(height: 12),

              // Moja usposabljanja (povzetek)
              _SectionTitle('Moja usposabljanja (${trainings.length})'),
              if (trainings.isEmpty)
                const _EmptyHint('Ni evidentiranih usposabljanj.')
              else
                Card(
                  child: Column(
                    children: [
                      for (final t in trainings)
                        ListTile(
                          dense: true,
                          title: Text((t as Map)['name'] as String),
                          trailing: t['expiresAt'] != null
                              ? Text(
                                  'do ${t['expiresAt']}',
                                  style: const TextStyle(
                                    color: GasilColors.textMuted,
                                    fontSize: 12,
                                  ),
                                )
                              : null,
                        ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 4),
        child: Text(
          text.toUpperCase(),
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: GasilColors.textMuted,
            letterSpacing: 0.5,
          ),
        ),
      );
}

class _EmptyHint extends StatelessWidget {
  final String text;
  const _EmptyHint(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(
          text,
          style: const TextStyle(color: GasilColors.textMuted),
        ),
      );
}
