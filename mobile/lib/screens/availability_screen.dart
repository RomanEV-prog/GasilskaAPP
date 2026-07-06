import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/users_api.dart';
import '../models/user.dart';
import '../theme.dart';

class AvailabilityScreen extends StatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends State<AvailabilityScreen> {
  final _usersApi = UsersApi();
  final _dashboardApi = DashboardApi();
  String? _current;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _dashboardApi.member();
      setState(() {
        _current = data['myAvailability'] as String?;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _set(String status) async {
    setState(() => _saving = true);
    try {
      await _usersApi.updateAvailability(status);
      setState(() => _current = status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Razpoložljivost posodobljena.')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Nastavi svojo razpoložljivost',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        const Text(
          'Vodstvo vidi, kdo je dosegljiv za intervencije.',
          style: TextStyle(color: GasilColors.textMuted),
        ),
        const SizedBox(height: 16),
        ...availabilityLabels.entries.map((entry) {
          final selected = _current == entry.key;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(entry.value),
              trailing: selected
                  ? const Icon(Icons.check_circle, color: GasilColors.primary)
                  : const Icon(Icons.circle_outlined,
                      color: GasilColors.textMuted),
              onTap: _saving ? null : () => _set(entry.key),
            ),
          );
        }),
      ],
    );
  }
}
