import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/users_api.dart';
import '../providers/auth_provider.dart';
import '../services/fcm_service.dart';
import '../widgets/change_password_dialog.dart';
import 'calendar_screen.dart';
import 'dashboard_screen.dart';
import 'events_screen.dart';
import 'interventions_screen.dart';
import 'notifications_screen.dart';

/// Glavni okvir z zavihki (bottom navigation) po MVP zaslonih.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

/// Dialog z osebno nastavitvijo prejemanja SPIN obvestil.
Future<void> _showSpinSettingsDialog(BuildContext context) async {
  final api = UsersApi();
  await showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('SPIN obvestila'),
      content: FutureBuilder<Map<String, dynamic>>(
        future: api.me(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const SizedBox(
              height: 60,
              child: Center(child: CircularProgressIndicator()),
            );
          }
          var enabled = snapshot.data!['spinNotifications'] as bool? ?? true;
          return StatefulBuilder(
            builder: (context, setState) => SwitchListTile(
              title: const Text('Prejemaj obvestila o intervencijah'),
              subtitle:
                  const Text('SPIN obvestila v občinah tvojega društva'),
              contentPadding: EdgeInsets.zero,
              value: enabled,
              onChanged: (value) async {
                setState(() => enabled = value);
                try {
                  await api.updateSpinNotifications(value);
                } catch (_) {
                  setState(() => enabled = !value);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Nastavitve ni bilo mogoče shraniti.'),
                      ),
                    );
                  }
                }
              },
            ),
          );
        },
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Zapri'),
        ),
      ],
    ),
  );
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    // Uporabnik je prijavljen — registriraj FCM žeton na backendu.
    FcmService.registerToken();
  }

  static const _titles = [
    'Nadzorna plošča',
    'Dogodki',
    'Koledar',
    'Intervencije',
    'Obvestila',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Skeniraj opremo',
            onPressed: () => context.push('/scan'),
          ),
          PopupMenuButton<String>(
            tooltip: 'Račun',
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (value) {
              if (value == 'password') {
                showChangePasswordDialog(context);
              } else if (value == 'spin') {
                _showSpinSettingsDialog(context);
              } else if (value == 'logout') {
                context.read<AuthProvider>().logout();
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'spin',
                child: ListTile(
                  leading: Icon(Icons.local_fire_department_outlined),
                  title: Text('SPIN obvestila'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              PopupMenuItem(
                value: 'password',
                child: ListTile(
                  leading: Icon(Icons.lock_outline),
                  title: Text('Spremeni geslo'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout),
                  title: Text('Odjava'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          const DashboardScreen(),
          EventsScreen(onOpenCalendar: () => setState(() => _index = 2)),
          const CalendarScreen(),
          const InterventionsScreen(),
          const NotificationsScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Pregled',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_outlined),
            selectedIcon: Icon(Icons.event),
            label: 'Dogodki',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Koledar',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_fire_department_outlined),
            selectedIcon: Icon(Icons.local_fire_department),
            label: 'SPIN',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Obvestila',
          ),
        ],
      ),
    );
  }
}
