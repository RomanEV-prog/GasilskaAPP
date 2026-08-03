import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/vehicles_api.dart';
import '../models/equipment.dart';
import '../models/vehicle.dart';
import '../services/nfc_service.dart';

/// Inventura opreme vozila: strojnik prislanja NFC oznake, kosi se kljukajo;
/// kose brez oznake (ali z nečitljivo) odkljuka ročno. Ob zaključku se
/// rezultat zabeleži na strežniku, ob manjkih dobijo upravljavci obvestilo.
class VehicleInventoryScreen extends StatefulWidget {
  final Vehicle vehicle;
  const VehicleInventoryScreen({required this.vehicle, super.key});

  @override
  State<VehicleInventoryScreen> createState() => _VehicleInventoryScreenState();
}

class _VehicleInventoryScreenState extends State<VehicleInventoryScreen> {
  final _api = VehiclesApi();
  List<Equipment>? _items;
  final Set<String> _present = {};
  bool _nfcAvailable = false;
  bool _submitting = false;
  String? _lastScanMsg;

  @override
  void initState() {
    super.initState();
    _load();
    NfcService.isAvailable().then((v) {
      if (!mounted) return;
      setState(() => _nfcAvailable = v);
      if (v && Platform.isAndroid) _startNfc();
    });
  }

  @override
  void dispose() {
    NfcService.stop();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final items = await _api.equipment(widget.vehicle.id);
      if (mounted) setState(() => _items = items);
    } on ApiException catch (err) {
      if (!mounted) return;
      setState(() => _items = []);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  Future<void> _startNfc() async {
    await NfcService.start((uid) async {
      if (!mounted) return;
      final items = _items ?? [];
      Equipment? match;
      for (final e in items) {
        if (e.nfcUid == uid) {
          match = e;
          break;
        }
      }
      setState(() {
        if (match != null) {
          _present.add(match.id);
          _lastScanMsg = '✓ ${match.name}';
        } else {
          _lastScanMsg = 'Oznaka ne pripada opremi tega vozila.';
        }
      });
    });
  }

  Future<void> _finish() async {
    final items = _items ?? [];
    final missing =
        items.where((e) => !_present.contains(e.id)).map((e) => e.id).toList();
    final notes = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Zaključi pregled'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Najdeno: ${_present.length} / ${items.length}'
              '${missing.isEmpty ? ' — vse na svojem mestu. ✅' : ''}',
            ),
            if (missing.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                'Manjkajoči kosi bodo javljeni upravljavcem opreme:',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 4),
              ...items
                  .where((e) => !_present.contains(e.id))
                  .take(8)
                  .map((e) => Text('• ${e.name}',
                      style: const TextStyle(fontSize: 13))),
              if (missing.length > 8) Text('… in še ${missing.length - 8}'),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: notes,
              decoration: const InputDecoration(
                labelText: 'Opomba (neobvezno)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Nazaj'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Zabeleži'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _submitting = true);
    try {
      await _api.createEquipmentCheck(
        widget.vehicle.id,
        presentIds: _present.toList(),
        missingIds: missing,
        notes: notes.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pregled opreme je zabeležen.')),
      );
      context.pop(true); // podrobnost vozila osveži zadnji pregled
    } on ApiException catch (err) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    return Scaffold(
      appBar: AppBar(
        title: Text('Pregled opreme — ${widget.vehicle.name}'),
        actions: [
          if (_nfcAvailable && Platform.isIOS)
            IconButton(
              icon: const Icon(Icons.nfc),
              tooltip: 'Začni NFC branje',
              onPressed: _startNfc,
            ),
        ],
      ),
      body: items == null
          ? const Center(child: CircularProgressIndicator())
          : items.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'Na tem vozilu ni evidentirane opreme. Kos na vozilo '
                      'postavite v podrobnosti opreme (Uredi podatke → Na '
                      'vozilu).',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : Column(
                  children: [
                    Container(
                      width: double.infinity,
                      color: Theme.of(context)
                          .colorScheme
                          .primary
                          .withValues(alpha: 0.08),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          Text(
                            _nfcAvailable
                                ? 'Prislanjaj telefon na NFC oznake — najdeni '
                                    'kosi se odkljukajo. Kose brez oznake '
                                    'odkljukaj ročno.'
                                : 'Kose odkljukaj ročno.',
                            textAlign: TextAlign.center,
                          ),
                          if (_lastScanMsg != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              _lastScanMsg!,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final e = items[i];
                          final checked = _present.contains(e.id);
                          return CheckboxListTile(
                            value: checked,
                            onChanged: (v) => setState(() {
                              if (v == true) {
                                _present.add(e.id);
                              } else {
                                _present.remove(e.id);
                              }
                            }),
                            title: Text(e.name),
                            subtitle: Text([
                              if (e.inventoryNumber?.isNotEmpty == true)
                                e.inventoryNumber!,
                              e.nfcUid != null ? 'NFC' : 'brez NFC oznake',
                            ].join(' · ')),
                            secondary: Icon(
                              checked
                                  ? Icons.check_circle
                                  : Icons.radio_button_unchecked,
                              color: checked ? Colors.green : Colors.grey,
                            ),
                          );
                        },
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            icon: const Icon(Icons.task_alt),
                            label: Text(
                              _submitting
                                  ? 'Beležim …'
                                  : 'Zaključi pregled '
                                      '(${_present.length}/${items.length})',
                            ),
                            onPressed: _submitting ? null : _finish,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
