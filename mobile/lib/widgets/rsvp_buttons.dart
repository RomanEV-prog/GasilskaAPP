import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/events_api.dart';
import '../providers/events_bus.dart';
import '../theme.dart';

/// Gumbi za potrditev udeležbe (RSVP). Brez možnosti "Morda".
/// Uporablja se na zaslonu dogodka in v koledarju.
class RsvpButtons extends StatefulWidget {
  final String eventId;
  final bool compact;

  /// Že oddani odziv uporabnika (myRsvpStatus iz API) — da je izbira vidna
  /// tudi v koledarju in po ponovnem odprtju zaslona.
  final String? initialStatus;

  /// Klic po uspešno oddanem odzivu — da starš osveži svoj seznam dogodkov.
  final ValueChanged<String>? onChanged;

  const RsvpButtons({
    required this.eventId,
    this.compact = false,
    this.initialStatus,
    this.onChanged,
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
      widget.onChanged?.call(status);
      // Ostali zavihki (plošča, koledar, seznam) so živi v IndexedStack —
      // brez signala bi še naprej kazali star odziv.
      notifyEventsChanged();
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

  /// Izbrani gumb je POLN (barva + bela pisava + kljukica), neizbrani je le
  /// obrobljen na svetli podlagi. Prej sta se ločila samo po prosojnosti
  /// (0,85 vs 1,0) in kljukici — razlike praktično ni bilo videti, zato je
  /// bil vtis, da odziv ni bil zabeležen.
  Widget _btn(String status, String label, Color color) {
    final selected = _status == status;
    final padding = widget.compact
        ? const EdgeInsets.symmetric(horizontal: 12, vertical: 8)
        : const EdgeInsets.symmetric(horizontal: 16, vertical: 12);
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          selected ? Icons.check_circle : Icons.circle_outlined,
          size: widget.compact ? 16 : 18,
          color: selected ? Colors.white : color,
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : color,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
            fontSize: widget.compact ? 13 : 14,
          ),
        ),
      ],
    );

    return Opacity(
      opacity: _submitting ? 0.6 : 1,
      child: Material(
        color: selected ? color : color.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: BorderSide(
            color: selected ? color : color.withValues(alpha: 0.45),
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: _submitting ? null : () => _rsvp(status),
          child: Padding(padding: padding, child: content),
        ),
      ),
    );
  }
}
