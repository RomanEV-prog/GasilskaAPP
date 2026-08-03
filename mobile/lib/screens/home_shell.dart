import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/organizations_api.dart';
import '../api/users_api.dart';
import '../providers/app_nav.dart';
import '../providers/auth_provider.dart';
import '../services/fcm_service.dart';
import '../services/nfc_service.dart';
import '../widgets/change_password_dialog.dart';
import 'scan_screen.dart' show ScanMode;
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

/// Odpre skupni foto-album društva (zunanja povezava) v brskalniku.
Future<void> _openPhotos(BuildContext context) async {
  final messenger = ScaffoldMessenger.of(context);
  String? link;
  try {
    final org = await OrganizationsApi().me();
    link = (org['photoUploadLink'] as String?)?.trim();
  } catch (_) {
    messenger.showSnackBar(
      const SnackBar(content: Text('Povezave ni bilo mogoče naložiti.')),
    );
    return;
  }
  if (link == null || link.isEmpty) {
    messenger.showSnackBar(
      const SnackBar(
        content: Text('Društvo še ni nastavilo povezave za fotografije.'),
      ),
    );
    return;
  }
  // Dovoli SAMO http(s) — prepreči sheme kot javascript:/file:/intent:.
  final uri = Uri.tryParse(link);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    messenger.showSnackBar(
      const SnackBar(content: Text('Povezava za fotografije ni veljavna.')),
    );
    return;
  }
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok) {
    messenger.showSnackBar(
      const SnackBar(content: Text('Povezave ni bilo mogoče odpreti.')),
    );
  }
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
  bool _nfcAvailable = false;

  @override
  void initState() {
    super.initState();
    // Uporabnik je prijavljen — registriraj FCM žeton na backendu.
    FcmService.registerToken();
    // Tap na push obvestilo lahko zahteva določen zavihek. Zahteva je lahko
    // vložena že pred gradnjo tega zaslona (app zagnalo obvestilo), zato jo
    // preverimo tudi takoj.
    requestedHomeTab.addListener(_applyRequestedTab);
    _applyRequestedTab(initial: true);
    NfcService.isAvailable().then((v) {
      if (mounted) setState(() => _nfcAvailable = v);
    });
  }

  /// NFC in QR sta ločena zaslona (kamera pri NFC prislonu zmede) — ob tapu
  /// ponudimo izbiro; naprave brez NFC gredo naravnost na QR.
  void _openScan() {
    if (!_nfcAvailable) {
      context.push('/scan', extra: ScanMode.qr);
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.nfc),
              title: const Text('Prisloni NFC oznako'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/scan', extra: ScanMode.nfc);
              },
            ),
            ListTile(
              leading: const Icon(Icons.qr_code_scanner),
              title: const Text('Skeniraj QR kodo'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/scan', extra: ScanMode.qr);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    requestedHomeTab.removeListener(_applyRequestedTab);
    super.dispose();
  }

  void _applyRequestedTab({bool initial = false}) {
    final requested = requestedHomeTab.value;
    if (requested == null) return;
    // Porabljeno — sicer bi se zavihek vsilil ob vsaki naslednji gradnji.
    requestedHomeTab.value = null;
    if (requested < 0 || requested >= _titles.length) return;
    if (initial) {
      // Med initState zaslon še ni zgrajen — dovolj je nastaviti vrednost.
      _index = requested;
      return;
    }
    if (mounted) setState(() => _index = requested);
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
            onPressed: _openScan,
          ),
          PopupMenuButton<String>(
            tooltip: 'Račun',
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (value) {
              if (value == 'my-equipment') {
                context.push('/moja-oprema');
              } else if (value == 'vozila') {
                context.push('/vozila');
              } else if (value == 'oprema') {
                context.push('/oprema');
              } else if (value == 'photos') {
                _openPhotos(context);
              } else if (value == 'password') {
                showChangePasswordDialog(context);
              } else if (value == 'spin') {
                _showSpinSettingsDialog(context);
              } else if (value == 'logout') {
                context.read<AuthProvider>().logout();
              }
            },
            itemBuilder: (_) {
              final user = context.read<AuthProvider>().user;
              final canManageVehicles = user?.canManageVehicles ?? false;
              final canManageEquipment = user?.canManageEquipment ?? false;
              return [
                const PopupMenuItem(
                  value: 'my-equipment',
                  child: ListTile(
                    leading: Icon(Icons.checkroom_outlined),
                    title: Text('Moja oprema'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                if (canManageEquipment)
                  const PopupMenuItem(
                    value: 'oprema',
                    child: ListTile(
                      leading: Icon(Icons.handyman_outlined),
                      title: Text('Oprema'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                if (canManageVehicles)
                  const PopupMenuItem(
                    value: 'vozila',
                    child: ListTile(
                      leading: Icon(Icons.fire_truck_outlined),
                      title: Text('Vozila'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                const PopupMenuItem(
                  value: 'photos',
                  child: ListTile(
                    leading: Icon(Icons.photo_library_outlined),
                    title: Text('Fotografije'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'spin',
                  child: ListTile(
                    leading: Icon(Icons.local_fire_department_outlined),
                    title: Text('SPIN obvestila'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'password',
                  child: ListTile(
                    leading: Icon(Icons.lock_outline),
                    title: Text('Spremeni geslo'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'logout',
                  child: ListTile(
                    leading: Icon(Icons.logout),
                    title: Text('Odjava'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ];
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          DashboardScreen(
            onOpenNotifications: () => setState(() => _index = 4),
          ),
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
