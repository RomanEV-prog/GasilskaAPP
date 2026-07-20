import 'dart:io';
import 'dart:typed_data';

import 'package:nfc_manager/nfc_manager.dart';
import 'package:nfc_manager/nfc_manager_android.dart';
import 'package:nfc_manager/nfc_manager_ios.dart';

/// Branje strojnega UID NFC oznak (NTAG213 in podobne, ISO 14443-A).
///
/// Namerno beremo samo UID in ne pišemo NDEF vsebine na oznako: deluje s
/// prazno nalepko iz vrečke, nihče je ne more po nesreči prepisati, preslikava
/// UID → oprema pa živi v bazi. UID ni varnostni žeton (klonirljive oznake
/// obstajajo) — za evidenco inventarja povsem zadošča.
class NfcService {
  /// Ali naprava sploh podpira NFC (in je vklopljen).
  static Future<bool> isAvailable() async {
    try {
      return await NfcManager.instance.isAvailable();
    } catch (_) {
      // Naprava brez NFC strojne opreme — tiho degradiramo na QR.
      return false;
    }
  }

  /// UID kot velika hex brez ločil, npr. `04A2B3C4D5E680`.
  static String? _uidOf(NfcTag tag) {
    Uint8List? raw;
    if (Platform.isAndroid) {
      raw = NfcTagAndroid.from(tag)?.id;
    } else if (Platform.isIOS) {
      raw = MiFareIos.from(tag)?.identifier;
    }
    if (raw == null || raw.isEmpty) return null;
    return raw
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join()
        .toUpperCase();
  }

  /// Začne poslušati oznake. Ob vsaki prebrani oznaki pokliče [onUid].
  static Future<void> start(Future<void> Function(String uid) onUid) async {
    await NfcManager.instance.startSession(
      pollingOptions: {NfcPollingOption.iso14443},
      onDiscovered: (tag) async {
        final uid = _uidOf(tag);
        if (uid != null) await onUid(uid);
      },
    );
  }

  static Future<void> stop() async {
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {
      // Seja ni tekla — ni napaka.
    }
  }
}
