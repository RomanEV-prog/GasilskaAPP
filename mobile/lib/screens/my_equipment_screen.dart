import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../api/equipment_api.dart';
import '../models/equipment_assignment.dart';

/// Oprema, ki jo ima prijavljeni član trenutno zadolženo.
/// Vsak član vidi samo svoje — brez posebnih pravic.
class MyEquipmentScreen extends StatefulWidget {
  const MyEquipmentScreen({super.key});

  @override
  State<MyEquipmentScreen> createState() => _MyEquipmentScreenState();
}

class _MyEquipmentScreenState extends State<MyEquipmentScreen> {
  final _api = EquipmentApi();
  late Future<List<MyEquipmentAssignment>> _future = _api.myAssignments();

  Future<void> _refresh() async {
    setState(() => _future = _api.myAssignments());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('d. M. yyyy', 'sl');

    return Scaffold(
      appBar: AppBar(title: const Text('Moja oprema')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<MyEquipmentAssignment>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'Podatkov ni bilo mogoče naložiti. Povlecite navzdol za '
                      'ponovni poskus.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              );
            }

            final items = snap.data ?? [];
            if (items.isEmpty) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'Trenutno nimate zadolžene opreme.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final a = items[i];
                final eq = a.equipment;
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.checkroom_outlined),
                    title: Text(eq?.name ?? '—'),
                    subtitle: Text(
                      [
                        if (eq?.category != null) eq!.category!,
                        if (eq?.inventoryNumber != null) eq!.inventoryNumber!,
                        if (a.issuedAt != null)
                          'od ${df.format(a.issuedAt!)}',
                      ].join(' · '),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: eq == null
                        ? null
                        : () => context.push('/equipment/${eq.id}', extra: eq),
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
