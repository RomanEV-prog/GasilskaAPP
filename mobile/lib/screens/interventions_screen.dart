import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/spin_api.dart';
import '../models/spin_intervention.dart';
import '../theme.dart';

/// Nedavne intervencije iz javnega portala SPIN (spin3.sos112.si)
/// za občine društva. Operativni člani prejmejo ob novih tudi push obvestilo.
class InterventionsScreen extends StatefulWidget {
  const InterventionsScreen({super.key});

  @override
  State<InterventionsScreen> createState() => _InterventionsScreenState();
}

class _InterventionsScreenState extends State<InterventionsScreen> {
  final _api = SpinApi();
  late Future<List<SpinIntervention>> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.interventions();
  }

  Future<void> _refresh() async {
    // Blokovno telo: arrow (=>) bi vrnil rezultat prireditve (Future) in
    // sprožil "setState() callback argument returned a Future".
    setState(() {
      _future = _api.interventions();
    });
    await _future;
  }

  /// Odpre originalno stran dogodka na spin3.sos112.si v brskalniku.
  /// `link` je iz feeda, `id` je `<guid>`, ki je pri SPIN prav tako URL —
  /// zato je rezerva, če `<link>` manjka.
  Future<void> _openSpin(SpinIntervention it) async {
    final messenger = ScaffoldMessenger.of(context);
    final raw = (it.link?.trim().isNotEmpty ?? false) ? it.link!.trim() : it.id;
    final uri = Uri.tryParse(raw);
    // Dovoli SAMO http(s) — feed je zunanji vir.
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Za to intervencijo ni povezave na SPIN.'),
        ),
      );
      return;
    }
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Povezave ni bilo mogoče odpreti.')),
      );
    }
  }

  IconData _iconFor(String? type) {
    final t = (type ?? '').toLowerCase();
    if (t.contains('požar') || t.contains('eksplozij')) {
      return Icons.local_fire_department;
    }
    if (t.contains('prometn')) return Icons.car_crash;
    if (t.contains('nus') || t.contains('najdb')) return Icons.dangerous;
    if (t.contains('poplav') || t.contains('vod')) return Icons.water_drop;
    if (t.contains('nevarn') || t.contains('snov')) return Icons.science;
    return Icons.warning_amber_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('d. M. yyyy HH:mm', 'sl');
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<List<SpinIntervention>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(children: const [
              SizedBox(height: 100),
              Icon(Icons.wifi_off, size: 48, color: GasilColors.textMuted),
              SizedBox(height: 12),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'Portala SPIN trenutno ni mogoče doseči.\n'
                  'Poskusite znova (povlecite navzdol za osvežitev).',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: GasilColors.textMuted),
                ),
              ),
            ]);
          }
          final items = snapshot.data!;
          if (items.isEmpty) {
            return ListView(children: const [
              SizedBox(height: 100),
              Icon(Icons.shield_outlined,
                  size: 48, color: GasilColors.textMuted),
              SizedBox(height: 12),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'Ni nedavnih intervencij za vaše občine.\n'
                  'Če seznam ostaja prazen, naj administrator društva '
                  'v spletnem portalu (Nastavitve → Društvo) izbere občine.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: GasilColors.textMuted),
                ),
              ),
            ]);
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: items.map((it) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(_iconFor(it.spinType),
                      color: GasilColors.primary, size: 32),
                  title: Text(
                    it.spinType ?? 'Intervencija',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (it.obcina != null && it.obcina!.isNotEmpty)
                        Text('📍 ${it.obcina}'),
                      if (it.description != null &&
                          it.description!.isNotEmpty &&
                          it.description != it.obcina)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(it.description!),
                        ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            it.occurredAt != null
                                ? df.format(it.occurredAt!)
                                : '',
                            style: const TextStyle(
                              color: GasilColors.textMuted,
                              fontSize: 11,
                            ),
                          ),
                          const Spacer(),
                          const Text(
                            'Odpri na SPIN',
                            style: TextStyle(
                              color: GasilColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Icon(Icons.open_in_new,
                              size: 13, color: GasilColors.primary),
                        ],
                      ),
                    ],
                  ),
                  isThreeLine: true,
                  onTap: () => _openSpin(it),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }
}
