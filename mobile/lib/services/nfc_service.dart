import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:nfc_manager/ndef_record.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:nfc_manager/nfc_manager_android.dart';
import 'package:nfc_manager/nfc_manager_ios.dart';

/// Izid zapisa NDEF vsebine na oznako.
enum NfcWriteStatus {
  /// Vsebina je zapisana.
  ok,

  /// Oznaka ne podpira NDEF (ali je poškodovana) — UID je kljub temu prebran.
  notNdef,

  /// Oznaka je trajno zaklenjena za pisanje.
  readOnly,

  /// Vsebina presega kapaciteto oznake.
  tooLarge,
}

class NfcWriteResult {
  final NfcWriteStatus status;

  /// Strojni UID oznake — na voljo tudi ob neuspelem zapisu, da lahko
  /// klicatelj oznako vseeno poveže z opremo v bazi.
  final String? uid;

  const NfcWriteResult(this.status, this.uid);
}

/// Branje strojnega UID in zapis NDEF vsebine na NFC oznake
/// (NTAG213/215/216 in podobne, ISO 14443-A).
///
/// Identiteta opreme ostaja preslikava UID → oprema v bazi (deluje s prazno
/// nalepko, UID se ne da prepisati). NDEF besedilo na oznaki je le berljiv
/// posnetek stanja ob zapisu (vrsta, zadolžitev, roki) za katerikoli NFC
/// bralnik — ob spremembi ga upravljavec opreme zapiše znova.
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

  /// Besedilni NDEF zapis (well-known tip "T", jezik `sl`, UTF-8).
  static NdefRecord textRecord(String text) {
    final lang = ascii.encode('sl');
    final body = utf8.encode(text);
    return NdefRecord(
      typeNameFormat: TypeNameFormat.wellKnown,
      type: Uint8List.fromList([0x54]),
      identifier: Uint8List(0),
      // Statusni bajt: bit 7 = 0 (UTF-8), spodnji biti = dolžina kode jezika.
      payload: Uint8List.fromList([lang.length, ...lang, ...body]),
    );
  }

  /// Začne poslušati oznake in na prvo najdeno zapiše [message].
  ///
  /// [onResult] dobi izid IN strojni UID oznake (če ga je bilo mogoče
  /// prebrati) — tudi ob neuspelem zapisu, da lahko klicatelj oznako vseeno
  /// poveže z opremo. Seja se po prvem izidu NE ustavi sama; klicatelj
  /// pokliče [stop] (enako kot pri [start]).
  static Future<void> startWrite(
    NdefMessage message,
    Future<void> Function(NfcWriteResult result) onResult,
  ) async {
    await NfcManager.instance.startSession(
      pollingOptions: {NfcPollingOption.iso14443},
      onDiscovered: (tag) async {
        final uid = _uidOf(tag);
        try {
          if (Platform.isAndroid) {
            final ndef = NdefAndroid.from(tag);
            if (ndef == null) {
              await onResult(NfcWriteResult(NfcWriteStatus.notNdef, uid));
            } else if (!ndef.isWritable) {
              await onResult(NfcWriteResult(NfcWriteStatus.readOnly, uid));
            } else if (message.byteLength > ndef.maxSize) {
              await onResult(NfcWriteResult(NfcWriteStatus.tooLarge, uid));
            } else {
              await ndef.writeNdefMessage(message);
              await onResult(NfcWriteResult(NfcWriteStatus.ok, uid));
            }
          } else if (Platform.isIOS) {
            final ndef = NdefIos.from(tag);
            if (ndef == null || ndef.status == NdefStatusIos.notSupported) {
              await onResult(NfcWriteResult(NfcWriteStatus.notNdef, uid));
            } else if (ndef.status == NdefStatusIos.readOnly) {
              await onResult(NfcWriteResult(NfcWriteStatus.readOnly, uid));
            } else if (message.byteLength > ndef.capacity) {
              await onResult(NfcWriteResult(NfcWriteStatus.tooLarge, uid));
            } else {
              await ndef.writeNdef(message);
              await onResult(NfcWriteResult(NfcWriteStatus.ok, uid));
            }
          }
        } catch (_) {
          // Prekinjen dotik ali nezdružljiva oznaka med samim zapisom.
          await onResult(NfcWriteResult(NfcWriteStatus.notNdef, uid));
        }
      },
    );
  }
}
