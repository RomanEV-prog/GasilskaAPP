// PREDLOGA — nadomesti z generirano datoteko:
//   dart pub global activate flutterfire_cli
//   flutterfire configure --project=<tvoj-firebase-projekt>
//
// flutterfire configure prepiše to datoteko s pravimi vrednostmi in doda
// google-services.json (Android) ter GoogleService-Info.plist (iOS).
// Dokler vrednosti ostajajo 'ZAMENJAJ', FcmService init gracefully preskoči.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  /// Ali je Firebase dejansko konfiguriran (ni več predloga).
  static bool get isConfigured => currentPlatform.apiKey != 'ZAMENJAJ';

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return android;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'ZAMENJAJ',
    appId: 'ZAMENJAJ',
    messagingSenderId: 'ZAMENJAJ',
    projectId: 'ZAMENJAJ',
    storageBucket: 'ZAMENJAJ.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'ZAMENJAJ',
    appId: 'ZAMENJAJ',
    messagingSenderId: 'ZAMENJAJ',
    projectId: 'ZAMENJAJ',
    storageBucket: 'ZAMENJAJ.appspot.com',
    iosBundleId: 'si.gasilapp.gasilappMobile',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'ZAMENJAJ',
    appId: 'ZAMENJAJ',
    messagingSenderId: 'ZAMENJAJ',
    projectId: 'ZAMENJAJ',
    storageBucket: 'ZAMENJAJ.appspot.com',
    authDomain: 'ZAMENJAJ.firebaseapp.com',
  );
}
