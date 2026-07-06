import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../api/api_client.dart';
import '../api/equipment_api.dart';

/// Skeniranje QR kode opreme → prikaz podrobnosti.
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

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling) return;
    final code =
        capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() => _handling = true);
    await _controller.stop();

    try {
      final eq = await _api.getByQr(code);
      if (!mounted) return;
      context.pushReplacement('/equipment/${eq.id}', extra: eq);
    } on ApiException catch (err) {
      if (!mounted) return;
      final msg = err.statusCode == 404
          ? 'Oprema s to QR kodo ni najdena.'
          : err.message;
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
      } else {
        context.pop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Skeniraj opremo'),
        actions: [
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
                _handling ? 'Iščem opremo ...' : 'Usmeri kamero v QR kodo',
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
