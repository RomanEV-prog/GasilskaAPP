import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/auth_api.dart';
import '../firebase_options.dart';

/// Obravnava sporočil v ozadju — mora biti top-level funkcija.
@pragma('vm:entry-point')
Future<void> _backgroundHandler(RemoteMessage message) async {
  // Sistem sam prikaže notification; tu bi lahko posodobili lokalno stanje.
  debugPrint('FCM ozadje: ${message.notification?.title}');
}

/// Kanal za prikaz obvestil, ko je aplikacija v ospredju.
const AndroidNotificationChannel _channel = AndroidNotificationChannel(
  'high_importance_channel',
  'Pomembna obvestila',
  description: 'GasilApp obvestila',
  importance: Importance.high,
);

/// Ovoj za Firebase Cloud Messaging. Če Firebase ni konfiguriran
/// (firebase_options.dart še vsebuje 'ZAMENJAJ'), se vse gracefully preskoči.
class FcmService {
  static bool _initialized = false;
  static final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();

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

      // Lokalna obvestila (za prikaz v OSPREDJU).
      await _local.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );
      await _local
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);

      // Ko je app v ospredju, FCM ne prikaže obvestila sam — prikažemo ga tu.
      FirebaseMessaging.onMessage.listen(_showForeground);

      _initialized = true;
    } catch (e) {
      debugPrint('FCM init napaka: $e');
    }
  }

  /// Prikaže lokalno obvestilo za sporočilo, prejeto v ospredju.
  static void _showForeground(RemoteMessage message) {
    final n = message.notification;
    if (n == null) return;
    _local.show(
      id: n.hashCode,
      title: n.title,
      body: n.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
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
