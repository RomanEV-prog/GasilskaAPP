import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/events_api.dart';
import '../theme.dart';

/// Gumbi za potrditev udeležbe (RSVP). Brez možnosti "Morda".
/// Uporablja se na zaslonu dogodka in v koledarju.
class RsvpButtons extends StatefulWidget {
  final String eventId;
  final bool compact;

  /// Že oddani odziv uporabnika (myRsvpStatus iz API) — da je izbira vidna
  /// tudi v koledarju in po ponovnem odprtju zaslona.
  final String? initialStatus;

  const RsvpButtons({
    required this.eventId,
    this.compact = false,
    this.initialStatus,
    super.key,
  });

  @override
  State<RsvpButtons> createState() => _RsvpButtonsState();
}

class _RsvpButtonsState extends State<RsvpButtons> {
  final _api = EventsApi();
  String? _status;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
  }

  @override
  void didUpdateWidget(covariant RsvpButtons oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Ob osvežitvi seznama (pull-to-refresh) prevzemi svež odziv s strežnika.
    if (widget.initialStatus != oldWidget.initialStatus) {
      _status = widget.initialStatus;
    }
  }

  Future<void> _rsvp(String status) async {
    setState(() => _submitting = true);
    try {
      await _api.rsvp(widget.eventId, status);
      setState(() => _status = status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prijava je zabeležena.')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _btn('attending', 'Pridem', GasilColors.success),
        _btn('late', 'Zamudim', GasilColors.warning),
        _btn('not_attending', 'Ne pridem', GasilColors.danger),
      ],
    );
  }

  Widget _btn(String status, String label, Color color) {
    final selected = _status == status;
    return FilledButton(
      onPressed: _submitting ? null : () => _rsvp(status),
      style: FilledButton.styleFrom(
        backgroundColor: selected ? color : color.withValues(alpha: 0.85),
        foregroundColor: Colors.white,
        visualDensity: widget.compact ? VisualDensity.compact : null,
        padding: widget.compact
            ? const EdgeInsets.symmetric(horizontal: 12, vertical: 6)
            : null,
      ),
      child: Text(selected ? '✓ $label' : label),
    );
  }
}
