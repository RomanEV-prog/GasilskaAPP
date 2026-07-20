import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/equipment_api.dart';
import '../models/equipment.dart';
import '../providers/auth_provider.dart';
import '../services/nfc_service.dart';

class EquipmentDetailScreen extends StatefulWidget {
  final Equipment equipment;
  const EquipmentDetailScreen({required this.equipment, super.key});

  @override
  State<EquipmentDetailScreen> createState() => _EquipmentDetailScreenState();
}

class _EquipmentDetailScreenState extends State<EquipmentDetailScreen> {
  final _api = EquipmentApi();
  late Equipment _equipment = widget.equipment;
  bool _nfcAvailable = false;

  @override
  void initState() {
    super.initState();
    NfcService.isAvailable().then((v) {
      if (mounted) setState(() => _nfcAvailable = v);
    });
  }

  @override
  void dispose() {
    NfcService.stop();
    super.dispose();
  }

  Color _conditionColor(String condition) {
    switch (condition) {
      case 'excellent':
      case 'good':
        return Colors.green;
      case 'fair':
        return Colors.orange;
      default:
        return Colors.red;
    }
  }

  /// Prislon oznake → shrani njen UID na ta kos opreme.
  Future<void> _linkNfcTag() async {
    final messenger = ScaffoldMessenger.of(context);
    var done = false;

    showModalBottomSheet<void>(
      context: context,
      isDismissible: true,
      builder: (_) => const Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.nfc, size: 48),
            SizedBox(height: 16),
            Text(
              'Prisloni telefon na NFC nalepko …',
              style: TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    ).then((_) {
      if (!done) NfcService.stop();
    });

    await NfcService.start((uid) async {
      if (done) return;
      done = true;
      await NfcService.stop();
      try {
        final updated = await _api.linkNfc(_equipment.id, uid);
        if (!mounted) return;
        setState(() => _equipment = updated);
        Navigator.of(context).pop(); // zapri listič
        messenger.showSnackBar(
          const SnackBar(content: Text('NFC oznaka je povezana.')),
        );
      } on ApiException catch (err) {
        if (!mounted) return;
        Navigator.of(context).pop();
        messenger.showSnackBar(SnackBar(content: Text(err.message)));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final e = _equipment;
    final df = DateFormat('d. M. yyyy', 'sl');
    final canManage =
        context.watch<AuthProvider>().user?.canManageEquipment ?? false;

    return Scaffold(
      appBar: AppBar(title: Text(e.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  e.name,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _conditionColor(e.condition).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  e.conditionLabel,
                  style: TextStyle(
                    color: _conditionColor(e.condition),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (!e.isActive)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Ta oprema je označena kot neaktivna.',
                style: TextStyle(color: Colors.red),
              ),
            ),
          const SizedBox(height: 24),

          // Zadolžitev je glavni podatek ob skeniranju — zato na vrhu.
          _row(
            context,
            Icons.person_outline,
            'Zadolženo',
            e.currentHolderName ?? 'Prosto',
          ),
          if (e.issuedAt != null)
            _row(
              context,
              Icons.login_outlined,
              'Zadolženo od',
              df.format(e.issuedAt!),
            ),
          const Divider(height: 24),

          _row(context, Icons.category_outlined, 'Kategorija', e.category),
          _row(context, Icons.tag, 'Inventarna št.', e.inventoryNumber),
          _row(context, Icons.place_outlined, 'Lokacija', e.location),
          _row(context, Icons.fire_truck_outlined, 'Na vozilu', e.vehicleName),
          _row(
            context,
            Icons.shopping_bag_outlined,
            'Datum nabave',
            e.purchaseDate != null ? df.format(e.purchaseDate!) : null,
          ),
          _row(context, Icons.timelapse_outlined, 'Starost', e.starost),
          _row(
            context,
            Icons.event_available_outlined,
            'Zadnji pregled',
            e.lastInspection != null ? df.format(e.lastInspection!) : null,
          ),
          _row(
            context,
            Icons.event_outlined,
            'Naslednji pregled',
            e.nextInspection != null ? df.format(e.nextInspection!) : null,
            highlight: e.nextInspection != null &&
                e.nextInspection!.isBefore(DateTime.now()),
          ),
          _row(
            context,
            Icons.hourglass_bottom_outlined,
            'Rok veljave',
            e.expiryDate != null ? df.format(e.expiryDate!) : null,
            highlight:
                e.expiryDate != null && e.expiryDate!.isBefore(DateTime.now()),
          ),
          _row(context, Icons.qr_code, 'QR koda', e.qrCode),
          _row(context, Icons.nfc, 'NFC oznaka', e.nfcUid),

          if (canManage && _nfcAvailable) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              icon: const Icon(Icons.nfc),
              label: Text(
                e.nfcUid == null
                    ? 'Poveži NFC oznako'
                    : 'Zamenjaj NFC oznako',
              ),
              onPressed: _linkNfcTag,
            ),
          ],

          if (e.notes != null && e.notes!.isNotEmpty) ...[
            const Divider(height: 32),
            Text('Opombe', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(e.notes!),
          ],
        ],
      ),
    );
  }

  Widget _row(
    BuildContext context,
    IconData icon,
    String label,
    String? value, {
    bool highlight = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          Expanded(
            child: Text(
              value?.isNotEmpty == true ? value! : '—',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: highlight ? Colors.red : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
