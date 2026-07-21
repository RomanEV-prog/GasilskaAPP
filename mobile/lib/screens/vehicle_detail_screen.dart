import 'package:flutter/material.dart';

import '../api/vehicles_api.dart';
import '../models/vehicle.dart';
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

  @override
  void initState() {
    super.initState();
    _api.get(widget.vehicle.id).then((v) {
      if (mounted) setState(() => _v = v);
    }).catchError((_) {
      // Ob napaki ostane prikaz iz seznama (extra).
    });
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
