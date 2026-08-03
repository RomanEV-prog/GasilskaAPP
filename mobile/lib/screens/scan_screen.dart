import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/equipment_api.dart';
import '../models/equipment.dart';
import '../providers/auth_provider.dart';
import '../services/nfc_service.dart';

/// Način skeniranja — ločena zaslona, da kamera ne zmede pri NFC prislonu.
enum ScanMode { qr, nfc }

/// Skeniranje opreme — QR koda (kamera) ali NFC oznaka (brez kamere).
///
/// Način izbere klicatelj (home_shell ponudi izbiro). Na iOS CoreNFC odpre
/// sistemsko modalno okno, zato se tam NFC seja sproži na pritisk gumba.
class ScanScreen extends StatefulWidget {
  final ScanMode mode;

  const ScanScreen({this.mode = ScanMode.qr, super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  // Kamero ustvarimo samo v QR načinu — v NFC načinu ne sme niti zasvetiti.
  late final MobileScannerController? _controller = widget.mode == ScanMode.qr
      ? MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates)
      : null;
  final _api = EquipmentApi();
  bool _handling = false;
  bool _nfcAvailable = false;

  @override
  void initState() {
    super.initState();
    if (widget.mode == ScanMode.nfc) _initNfc();
  }

  Future<void> _initNfc() async {
    final available = await NfcService.isAvailable();
    if (!mounted) return;
    setState(() => _nfcAvailable = available);
    if (available && Platform.isAndroid) await _startNfc();
  }

  Future<void> _startNfc() async {
    await NfcService.start((uid) async {
      await _handleResult(
        () => _api.getByNfc(uid),
        'Oprema s to NFC oznako ni najdena.',
        nfcUid: uid,
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
  ///
  /// Ob neznani NFC oznaki upravljavcem opreme ponudi tok »najprej nalepka,
  /// potem podatki«: vnos nove opreme z že ujetim UID.
  Future<void> _handleResult(
    Future<Equipment> Function() fetch,
    String notFoundMsg, {
    String? nfcUid,
  }) async {
    if (_handling) return;
    setState(() => _handling = true);
    await _controller?.stop();
    await NfcService.stop();

    try {
      final eq = await fetch();
      if (!mounted) return;
      context.pushReplacement('/equipment/${eq.id}', extra: eq);
    } on ApiException catch (err) {
      if (!mounted) return;
      final notFound = err.statusCode == 404;
      final msg = notFound ? notFoundMsg : err.message;
      final canCreate = notFound &&
          nfcUid != null &&
          (context.read<AuthProvider>().user?.canManageEquipment ?? false);
      // 'create' | 'retry' | null (zapri)
      final choice = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Skeniranje'),
          content: Text(canCreate
              ? '$msg\n\nOznaka je prosta — jo nalepiš na nov kos opreme?'
              : msg),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Zapri'),
            ),
            if (canCreate)
              FilledButton(
                onPressed: () => Navigator.pop(ctx, 'create'),
                child: const Text('Dodaj novo opremo'),
              )
            else
              FilledButton(
                onPressed: () => Navigator.pop(ctx, 'retry'),
                child: const Text('Poskusi znova'),
              ),
          ],
        ),
      );
      if (!mounted) return;
      switch (choice) {
        case 'create':
          context.pushReplacement('/equipment-new', extra: nfcUid);
        case 'retry':
          setState(() => _handling = false);
          await _controller?.start();
          if (widget.mode == ScanMode.nfc &&
              _nfcAvailable &&
              Platform.isAndroid) {
            await _startNfc();
          }
        default:
          if (mounted) context.pop();
      }
    }
  }

  @override
  void dispose() {
    NfcService.stop();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.mode == ScanMode.nfc ? _buildNfc(context) : _buildQr(context);
  }

  /// NFC način: brez kamere — samo poziv za prislon (iOS z gumbom).
  Widget _buildNfc(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Prisloni NFC oznako')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_handling)
              const CircularProgressIndicator()
            else ...[
              Icon(
                Icons.nfc,
                size: 96,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 48),
                child: Text(
                  'Prisloni telefon na NFC oznako opreme.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16),
                ),
              ),
              if (Platform.isIOS) ...[
                const SizedBox(height: 24),
                FilledButton.icon(
                  icon: const Icon(Icons.nfc),
                  label: const Text('Začni branje'),
                  onPressed: _startNfc,
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  /// QR način: kamera z okvirjem — brez NFC seje.
  Widget _buildQr(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Skeniraj QR kodo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            tooltip: 'Bliskavica',
            onPressed: () => _controller?.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(controller: _controller!, onDetect: _onDetect),
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
                _handling ? 'Iščem opremo ...' : 'Usmeri kamero v QR kodo',
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
