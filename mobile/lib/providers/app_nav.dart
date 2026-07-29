import 'package:flutter/foundation.dart';

/// Indeksi zavihkov v `HomeShell` (bottom navigation).
class HomeTab {
  static const dashboard = 0;
  static const events = 1;
  static const calendar = 2;
  static const spin = 3;
  static const notifications = 4;
}

/// Zahteva za preklop zavihka od zunaj (tap na push obvestilo).
///
/// `HomeShell` hrani izbrani zavihek v svojem stanju, do katerega FCM
/// poslušalec nima dostopa — zato zahtevo odloži sem, `HomeShell` pa jo
/// prevzame, ko je zgrajen (obvestilo lahko prispe še pred njim).
final ValueNotifier<int?> requestedHomeTab = ValueNotifier<int?>(null);

void requestHomeTab(int index) => requestedHomeTab.value = index;
