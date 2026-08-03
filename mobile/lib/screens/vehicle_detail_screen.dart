import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/vehicles_api.dart';
import '../models/equipment.dart';
import '../models/vehicle.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';
import 'vehicles_screen.dart' show deadlineChip;

/// Podrobnosti vozila — samo za branje. Ob odprtju osveži z backenda
/// (seznam prek `extra` je lahko zastarel).
class VehicleDetailScreen extends StatefulWidget {
  final Vehicle vehicle;
  const VehicleDetailScreen({required this.vehicle, super.key});

  @override
  State<VehicleDetailScreen> createState() => _VehicleDetailScreenState();
}

class _VehicleDetailScreenState extends State<VehicleDetailScreen> {
  final _api = VehiclesApi();
  late Vehicle _v = widget.vehicle;
  List<Equipment>? _equipment;
  VehicleEquipmentCheck? _lastCheck;

  @override
  void initState() {
    super.initState();
    _api.get(widget.vehicle.id).then((v) {
      if (mounted) setState(() => _v = v);
    }).catchError((_) {
      // Ob napaki ostane prikaz iz seznama (extra).
    });
    _loadEquipment();
  }

  void _loadEquipment() {
    _api.equipment(widget.vehicle.id).then((items) {
      if (mounted) setState(() => _equipment = items);
    }).catchError((_) {
      if (mounted) setState(() => _equipment = []);
    });
    // Zadnji pregled vidijo samo upravljavci opreme (endpoint 403 za člane).
    final canManage =
        context.read<AuthProvider>().user?.canManageEquipment ?? false;
    if (canManage) {
      _api.equipmentChecks(widget.vehicle.id).then((checks) {
        if (mounted && checks.isNotEmpty) {
          setState(() => _lastCheck = checks.first);
        }
      }).catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = _v;
    return Scaffold(
      appBar: AppBar(title: Text(v.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _row('Oznaka', v.typeLabel),
          if (v.licensePlate != null) _row('Registrska', v.licensePlate!),
          if (v.year != null) _row('Letnik', '${v.year}'),
          if (v.mileage != null) _row('Kilometri', '${v.mileage} km'),
          if (v.vin != null) _row('VIN', v.vin!),
          const SizedBox(height: 16),
          const _SectionTitle('Roki'),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              deadlineChip('Registracija', v.registrationExpires),
              deadlineChip('Zavarovanje', v.insuranceExpires),
              deadlineChip('Servis', v.serviceDue),
            ].whereType<Widget>().toList(),
          ),
          if (v.registrationExpires == null &&
              v.insuranceExpires == null &&
              v.serviceDue == null)
            const Text(
              'Ni nastavljenih rokov.',
              style: TextStyle(color: GasilColors.textMuted),
            ),
          if (v.serviceMileage != null) ...[
            const SizedBox(height: 8),
            _row('Servis pri', '${v.serviceMileage} km'),
          ],
          const SizedBox(height: 16),
          const _SectionTitle('Vozniki'),
          if (v.drivers.isEmpty)
            const Text(
              'Ni določenih voznikov.',
              style: TextStyle(color: GasilColors.textMuted),
            )
          else
            ...v.drivers.map(
              (d) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.person_outline),
                title: Text(d.fullName.isEmpty ? '—' : d.fullName),
              ),
            ),
          if (v.notes != null && v.notes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _SectionTitle('Opombe'),
            Text(v.notes!),
          ],

          const SizedBox(height: 16),
          _SectionTitle(
            'Oprema na vozilu'
            '${_equipment != null ? ' (${_equipment!.length})' : ''}',
          ),
          if (_equipment == null)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(8),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_equipment!.isEmpty)
            const Text(
              'Na tem vozilu ni evidentirane opreme.',
              style: TextStyle(color: GasilColors.textMuted),
            )
          else
            ..._equipment!.map(
              (e) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  e.nfcUid != null ? Icons.nfc : Icons.handyman_outlined,
                  size: 20,
                ),
                title: Text(e.name),
                subtitle: e.inventoryNumber?.isNotEmpty == true
                    ? Text(e.inventoryNumber!)
                    : null,
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/equipment/${e.id}', extra: e),
              ),
            ),

          if (context.watch<AuthProvider>().user?.canManageEquipment ??
              false) ...[
            if (_lastCheck != null) ...[
              const SizedBox(height: 8),
              Text(
                'Zadnji pregled: '
                '${_lastCheck!.performedAt != null ? DateFormat('d. M. yyyy HH:mm', 'sl').format(_lastCheck!.performedAt!) : '—'}'
                ' · ${_lastCheck!.presentCount}/${_lastCheck!.total}'
                '${_lastCheck!.missingIds.isEmpty ? ' ✅' : ' — manjka ${_lastCheck!.missingIds.length}'}'
                '${_lastCheck!.performerName?.isNotEmpty == true ? ' (${_lastCheck!.performerName})' : ''}',
                style: const TextStyle(
                  color: GasilColors.textMuted,
                  fontSize: 13,
                ),
              ),
            ],
            if (_equipment?.isNotEmpty == true) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.checklist),
                label: const Text('Preveri opremo vozila'),
                onPressed: () async {
                  final done = await context.push<bool>(
                    '/vozila/${v.id}/pregled-opreme',
                    extra: v,
                  );
                  if (done == true) _loadEquipment();
                },
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 110,
              child: Text(
                label,
                style: const TextStyle(color: GasilColors.textMuted),
              ),
            ),
            Expanded(child: Text(value)),
          ],
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text.toUpperCase(),
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: GasilColors.textMuted,
            letterSpacing: 0.5,
          ),
        ),
      );
}
