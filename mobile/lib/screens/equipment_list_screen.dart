import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/equipment_api.dart';
import '../models/equipment.dart';

/// Seznam vse opreme društva z iskalnikom — za upravljavce opreme.
/// Tu se najde tudi na novo vnesen kos (prek NFC toka ali portala).
class EquipmentListScreen extends StatefulWidget {
  const EquipmentListScreen({super.key});

  @override
  State<EquipmentListScreen> createState() => _EquipmentListScreenState();
}

class _EquipmentListScreenState extends State<EquipmentListScreen> {
  final _api = EquipmentApi();
  late Future<List<Equipment>> _future = _api.list();
  String _query = '';

  Future<void> _refresh() async {
    setState(() {
      _future = _api.list();
    });
    await _future;
  }

  bool _matches(Equipment e) {
    if (_query.isEmpty) return true;
    final q = _query.toLowerCase();
    return [e.name, e.category, e.inventoryNumber, e.location]
        .whereType<String>()
        .any((s) => s.toLowerCase().contains(q));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Oprema')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Išči po nazivu, vrsti, inv. št., lokaciji …',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: FutureBuilder<List<Equipment>>(
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
                          'Podatkov ni bilo mogoče naložiti. Povlecite navzdol '
                          'za ponovni poskus.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ]);
                  }
                  final items = (snap.data ?? []).where(_matches).toList();
                  if (items.isEmpty) {
                    return ListView(children: [
                      Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          _query.isEmpty
                              ? 'Ni evidentirane opreme.'
                              : 'Ni zadetkov za »$_query«.',
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
                      final e = items[i];
                      return Card(
                        child: ListTile(
                          leading: Icon(
                            e.nfcUid != null ? Icons.nfc : Icons.handyman_outlined,
                          ),
                          title: Text(e.name),
                          subtitle: Text([
                            if (e.category?.isNotEmpty == true) e.category!,
                            if (e.inventoryNumber?.isNotEmpty == true)
                              e.inventoryNumber!,
                            e.currentHolderName ?? 'Prosto',
                          ].join(' · ')),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () =>
                              context.push('/equipment/${e.id}', extra: e),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
