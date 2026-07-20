import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'models/equipment.dart';
import 'models/event.dart';
import 'providers/auth_provider.dart';
import 'screens/equipment_detail_screen.dart';
import 'screens/event_detail_screen.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'screens/my_equipment_screen.dart';
import 'screens/scan_screen.dart';
import 'services/fcm_service.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('sl'); // slovenski datumi

  // FCM push obvestila (no-op, dokler Firebase ni konfiguriran).
  await FcmService.init();

  final auth = AuthProvider();
  await auth.loadSession();

  runApp(
    ChangeNotifierProvider.value(
      value: auth,
      child: const PlamenApp(),
    ),
  );
}

class PlamenApp extends StatefulWidget {
  const PlamenApp({super.key});

  @override
  State<PlamenApp> createState() => _PlamenAppState();
}

class _PlamenAppState extends State<PlamenApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    // Router zgradimo ENKRAT. Na spremembe prijave reagira prek
    // refreshListenable (auth), zato ga ni treba graditi znova ob vsakem
    // notifyListeners — sicer bi izgubili navigacijsko stanje.
    _router = _buildRouter(context.read<AuthProvider>());
  }

  @override
  Widget build(BuildContext context) {
    final router = _router;

    return MaterialApp.router(
      title: 'Plamen',
      debugShowCheckedModeBanner: false,
      theme: buildGasilTheme(),
      routerConfig: router,
      locale: const Locale('sl'),
      supportedLocales: const [Locale('sl'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }

  GoRouter _buildRouter(AuthProvider auth) {
    return GoRouter(
      refreshListenable: auth,
      initialLocation: '/',
      redirect: (context, state) {
        if (auth.isLoading) return null;
        final loggedIn = auth.isAuthenticated;
        final onLogin = state.matchedLocation == '/login';
        if (!loggedIn) return onLogin ? null : '/login';
        if (onLogin) return '/';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (_, __) => const LoginScreen(),
        ),
        GoRoute(
          path: '/',
          builder: (_, __) => const HomeShell(),
        ),
        GoRoute(
          path: '/events/:id',
          builder: (context, state) {
            final event = state.extra as Event;
            return EventDetailScreen(event: event);
          },
        ),
        GoRoute(
          path: '/scan',
          builder: (_, __) => const ScanScreen(),
        ),
        GoRoute(
          path: '/equipment/:id',
          builder: (context, state) {
            final equipment = state.extra as Equipment;
            return EquipmentDetailScreen(equipment: equipment);
          },
        ),
        GoRoute(
          path: '/moja-oprema',
          builder: (_, __) => const MyEquipmentScreen(),
        ),
      ],
    );
  }
}
