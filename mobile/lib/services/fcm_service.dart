import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../api/auth_api.dart';
import '../firebase_options.dart';

/// Obravnava sporočil v ozadju — mora biti top-level funkcija.
@pragma('vm:entry-point')
Future<void> _backgroundHandler(RemoteMessage message) async {
  // Sistem sam prikaže notification; tu bi lahko posodobili lokalno stanje.
  debugPrint('FCM ozadje: ${message.notification?.title}');
}

/// Ovoj za Firebase Cloud Messaging. Če Firebase ni konfiguriran
/// (firebase_options.dart še vsebuje 'ZAMENJAJ'), se vse gracefully preskoči.
class FcmService {
  static bool _initialized = false;

  /// Inicializira Firebase in nastavi poslušalce. Kliči v main() pred runApp.
  static Future<void> init() async {
    if (!DefaultFirebaseOptions.isConfigured) {
      debugPrint('FCM: Firebase ni konfiguriran — push je izklopljen.');
      return;
    }
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      FirebaseMessaging.onBackgroundMessage(_backgroundHandler);
      await FirebaseMessaging.instance.requestPermission();
      _initialized = true;
    } catch (e) {
      debugPrint('FCM init napaka: $e');
    }
  }

  /// Pridobi žeton in ga pošlje na backend. Kliči po uspešni prijavi.
  static Future<void> registerToken() async {
    if (!_initialized) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await AuthApi().updateFcmToken(token);
      }
      // Ob osvežitvi žetona ga ponovno pošlji.
      FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        AuthApi().updateFcmToken(t);
      });
    } catch (e) {
      debugPrint('FCM registracija žetona ni uspela: $e');
    }
  }
}
