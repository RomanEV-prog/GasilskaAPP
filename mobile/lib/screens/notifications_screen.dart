import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/users_api.dart';
import '../models/notification.dart';
import '../theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = NotificationsApi();
  late Future<List<AppNotification>> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.mine();
  }

  Future<void> _refresh() async {
    setState(() => _future = _api.mine());
    await _future;
  }

  Future<void> _markRead(AppNotification n) async {
    if (n.isRead) return;
    try {
      await _api.markRead(n.id);
      _refresh();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('d. M. yyyy HH:mm', 'sl');
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<List<AppNotification>>(
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
          final items = snapshot.data!;
          if (items.isEmpty) {
            return ListView(children: const [
              SizedBox(height: 120),
              Center(
                child: Text(
                  'Ni obvestil.',
                  style: TextStyle(color: GasilColors.textMuted),
                ),
              ),
            ]);
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: items.map((n) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: n.isRead
                      ? null
                      : Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(top: 6),
                          decoration: const BoxDecoration(
                            color: GasilColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                  title: Text(
                    n.title,
                    style: TextStyle(
                      fontWeight:
                          n.isRead ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(n.body),
                      const SizedBox(height: 4),
                      Text(
                        df.format(n.createdAt),
                        style: const TextStyle(
                          color: GasilColors.textMuted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  onTap: () => _markRead(n),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }
}
