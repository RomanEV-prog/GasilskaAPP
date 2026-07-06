import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'models/event.dart';
import 'providers/auth_provider.dart';
import 'screens/event_detail_screen.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
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
      child: const GasilApp(),
    ),
  );
}

class GasilApp extends StatelessWidget {
  const GasilApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final router = _buildRouter(auth);

    return MaterialApp.router(
      title: 'GasilApp',
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
      ],
    );
  }
}
