import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/vehicles_api.dart';
import '../models/vehicle.dart';
import '../theme.dart';

/// Seznam vozil društva — samo za branje, za odgovorne za vozila.
class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  final _api = VehiclesApi();
  late Future<List<Vehicle>> _future = _api.list();

  Future<void> _refresh() async {
    setState(() => _future = _api.list());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vozila')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Vehicle>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: const [
                Padding(
                  padding: EdgeInsets.all(32),
                  child: Text(
                    'Podatkov ni bilo mogoče naložiti. Povlecite navzdol za '
                    'ponovni poskus.',
                    textAlign: TextAlign.center,
                  ),
                ),
              ]);
            }
            final items = snap.data ?? [];
            if (items.isEmpty) {
              return ListView(children: const [
                Padding(
                  padding: EdgeInsets.all(32),
                  child: Text(
                    'Ni evidentiranih vozil.',
                    textAlign: TextAlign.center,
                  ),
                ),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final v = items[i];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.fire_truck_outlined),
                    title: Text(v.name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          [v.typeLabel, if (v.licensePlate != null) v.licensePlate!]
                              .join(' · '),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            deadlineChip('Reg.', v.registrationExpires),
                            deadlineChip('Zav.', v.insuranceExpires),
                            deadlineChip('Servis', v.serviceDue),
                          ].whereType<Widget>().toList(),
                        ),
                      ],
                    ),
                    isThreeLine: true,
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/vozila/${v.id}', extra: v),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

/// Barvna oznaka roka: rdeče (poteklo / <7 dni), rumeno (≤30), zeleno sicer.
/// Vrne null, če datum ni nastavljen (roka ni). Zrcali web `deadlineBadge`.
Widget? deadlineChip(String label, String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return null;
  final date = DateTime.tryParse(isoDate);
  if (date == null) return null;
  final days = date.difference(DateTime.now()).inDays;
  final Color color;
  final String text;
  if (days < 0) {
    color = GasilColors.danger;
    text = '$label: POTEKLO';
  } else if (days < 7) {
    color = GasilColors.danger;
    text = '$label: $days dni';
  } else if (days <= 30) {
    color = GasilColors.warning;
    text = '$label: $days dni';
  } else {
    color = GasilColors.success;
    text = '$label: ${isoDate.split('T').first}';
  }
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      text,
      style: TextStyle(
        color: color,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}
