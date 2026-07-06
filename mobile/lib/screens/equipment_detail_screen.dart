import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/equipment.dart';

class EquipmentDetailScreen extends StatelessWidget {
  final Equipment equipment;
  const EquipmentDetailScreen({required this.equipment, super.key});

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

  @override
  Widget build(BuildContext context) {
    final e = equipment;
    final df = DateFormat('d. M. yyyy', 'sl');

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
          _row(context, Icons.category_outlined, 'Kategorija', e.category),
          _row(context, Icons.tag, 'Inventarna št.', e.inventoryNumber),
          _row(context, Icons.place_outlined, 'Lokacija', e.location),
          _row(context, Icons.fire_truck_outlined, 'Na vozilu', e.vehicleName),
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
          _row(context, Icons.qr_code, 'QR koda', e.qrCode),
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
