import 'package:flutter/foundation.dart';

/// Signal, da so se podatki o dogodkih spremenili (oddan odziv na udeležbo).
///
/// Zavihki so v `IndexedStack` — vsi ostanejo živi in svojih podatkov po
/// prvem nalaganju ne osvežijo sami. Brez tega signala uporabnik odda odziv
/// v Dogodkih ali Koledarju, na Nadzorni plošči pa še vedno piše »Brez
/// odziva«. Zasloni poslušajo in ob spremembi ponovno naložijo seznam.
final ValueNotifier<int> eventsChanged = ValueNotifier<int>(0);

/// Sproži osvežitev na vseh zaslonih, ki prikazujejo dogodke.
void notifyEventsChanged() => eventsChanged.value++;
