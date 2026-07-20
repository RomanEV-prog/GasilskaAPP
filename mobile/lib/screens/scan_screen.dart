import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../api/api_client.dart';
import '../api/equipment_api.dart';
import '../models/equipment.dart';
import '../services/nfc_service.dart';

/// Skeniranje opreme — QR koda ali NFC oznaka, oboje na istem zaslonu.
///
/// Na Androidu teče NFC seja vzporedno s kamero (bralnik je od nje ločen).
/// Na iOS CoreNFC odpre sistemsko modalno okno, ki kamero prekrije, zato se
/// tam seja sproži šele na pritisk gumba.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final _api = EquipmentApi();
  bool _handling = false;
  bool _nfcAvailable = false;

  @override
  void initState() {
    super.initState();
    _initNfc();
  }

  Future<void> _initNfc() async {
    final available = await NfcService.isAvailable();
    if (!mounted) return;
    setState(() => _nfcAvailable = available);
    // Na napravah brez NFC ostane QR edina pot — brez opozorilnih pasic.
    if (available && Platform.isAndroid) await _startNfc();
  }

  Future<void> _startNfc() async {
    await NfcService.start((uid) async {
      await _handleResult(
        () => _api.getByNfc(uid),
        'Oprema s to NFC oznako ni najdena.',
      );
    });
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    final code =
        capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;
    await _handleResult(
      () => _api.getByQr(code),
      'Oprema s to QR kodo ni najdena.',
    );
  }

  /// Skupna obravnava za QR in NFC: ustavi branje, poišče opremo, ob napaki
  /// ponudi ponovni poskus (in takrat znova zažene oba načina).
  Future<void> _handleResult(
    Future<Equipment> Function() fetch,
    String notFoundMsg,
  ) async {
    if (_handling) return;
    setState(() => _handling = true);
    await _controller.stop();
    await NfcService.stop();

    try {
      final eq = await fetch();
      if (!mounted) return;
      context.pushReplacement('/equipment/${eq.id}', extra: eq);
    } on ApiException catch (err) {
      if (!mounted) return;
      final msg = err.statusCode == 404 ? notFoundMsg : err.message;
      final retry = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Skeniranje'),
          content: Text(msg),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Zapri'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Poskusi znova'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      if (retry == true) {
        setState(() => _handling = false);
        await _controller.start();
        if (_nfcAvailable && Platform.isAndroid) await _startNfc();
      } else {
        if (mounted) context.pop();
      }
    }
  }

  @override
  void dispose() {
    NfcService.stop();
    _controller.dispose();
    super.dispose();
  }

  String get _hint {
    if (_handling) return 'Iščem opremo ...';
    return _nfcAvailable && Platform.isAndroid
        ? 'Usmeri kamero v QR kodo ali prisloni telefon na NFC oznako'
        : 'Usmeri kamero v QR kodo';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Skeniraj opremo'),
        actions: [
          // Na iOS je NFC ročen — sistemsko okno prekrije kamero.
          if (_nfcAvailable && Platform.isIOS)
            IconButton(
              icon: const Icon(Icons.nfc),
              tooltip: 'Skeniraj NFC oznako',
              onPressed: _startNfc,
            ),
          IconButton(
            icon: const Icon(Icons.flash_on),
            tooltip: 'Bliskavica',
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          // Okvir za usmeritev
          Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 3),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          Positioned(
            bottom: 48,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _hint,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ),
          if (_handling) const CircularProgressIndicator(),
        ],
      ),
    );
  }
}
