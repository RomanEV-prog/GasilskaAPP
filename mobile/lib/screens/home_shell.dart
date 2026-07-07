import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/fcm_service.dart';
import '../widgets/change_password_dialog.dart';
import 'calendar_screen.dart';
import 'dashboard_screen.dart';
import 'events_screen.dart';
import 'notifications_screen.dart';

/// Glavni okvir z zavihki (bottom navigation) po MVP zaslonih.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
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
              } else if (value == 'logout') {
                context.read<AuthProvider>().logout();
              }
            },
            itemBuilder: (_) => const [
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
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Obvestila',
          ),
        ],
      ),
    );
  }
}
