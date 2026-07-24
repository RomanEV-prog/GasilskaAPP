import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../api/organizations_api.dart';

/// Logotip društva; če ga ni naloženega, pade nazaj na ikono znamke Plamen
/// (enako kot prijavni zaslon — emoji 🔥 je bil vizualno tuj).
/// Bajti se prenesejo enkrat na sejo (statični predpomnilnik).
class OrgLogo extends StatefulWidget {
  final double size;
  const OrgLogo({this.size = 40, super.key});

  @override
  State<OrgLogo> createState() => _OrgLogoState();
}

class _OrgLogoState extends State<OrgLogo> {
  static Uint8List? _cached;
  static bool _loaded = false;
  late final Future<Uint8List?> _future = _load();

  Future<Uint8List?> _load() async {
    if (_loaded) return _cached;
    _cached = await OrganizationsApi().logo();
    _loaded = true;
    return _cached;
  }

  /// Ikona znamke — privzetek, kadar društvo nima (veljavnega) logotipa.
  Widget _brandIcon() => ClipRRect(
        borderRadius: BorderRadius.circular(widget.size * 0.22),
        child: Image.asset(
          'assets/plamen-icon.png',
          width: widget.size,
          height: widget.size,
          fit: BoxFit.contain,
        ),
      );

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List?>(
      future: _future,
      builder: (context, snap) {
        final bytes = snap.data;
        if (bytes == null || bytes.isEmpty) {
          return _brandIcon();
        }
        return ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.memory(
            bytes,
            width: widget.size,
            height: widget.size,
            fit: BoxFit.contain,
            // Neveljavni/pokvarjeni bajti ne smejo pokazati rdeče napake —
            // gracefully pade na ikono znamke.
            errorBuilder: (context, error, stack) => _brandIcon(),
          ),
        );
      },
    );
  }
}
