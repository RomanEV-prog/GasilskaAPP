import 'package:flutter/material.dart';

import '../models/user.dart';
import '../theme.dart';

/// Barvna značka razpoložljivosti.
class AvailabilityBadge extends StatelessWidget {
  final String status;
  const AvailabilityBadge(this.status, {super.key});

  Color get _color {
    switch (status) {
      case 'available':
        return GasilColors.success;
      case 'at_home':
      case 'at_work':
        return GasilColors.warning;
      case 'sick':
      case 'unavailable':
        return GasilColors.danger;
      default:
        return GasilColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        availabilityLabels[status] ?? status,
        style: TextStyle(
          color: _color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
