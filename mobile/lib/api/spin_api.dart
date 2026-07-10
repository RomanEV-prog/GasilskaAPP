import 'dart:io';

import 'package:dio/dio.dart';

import '../models/spin_intervention.dart';
import 'api_client.dart';

/// SPIN (spin3.sos112.si) je geo-omejen na slovenske IP-je, zato ga strežnik
/// v tujini ne doseže. Zato mobilna aplikacija bere feed NEPOSREDNO s telefona
/// (telefoni v Sloveniji SPIN dosežejo), občino društva pa dobi iz backenda.
class SpinApi {
  static const _feedUrl = 'https://spin3.sos112.si/Javno/ODApi/True';

  final _client = ApiClient.instance;
  final _raw = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 12),
    receiveTimeout: const Duration(seconds: 12),
  ));

  /// Občine društva (nastavi jih admin v spletnem portalu). Prazno = brez.
  Future<List<String>> myObcine() async {
    final data = await _client.get('/spin/settings') as Map<String, dynamic>;
    final o = data['obcine'];
    if (o is List) {
      return o.whereType<String>().where((s) => s.isNotEmpty).toList();
    }
    return [];
  }

  /// Nedavne intervencije SPIN za občine društva (feed prebran s telefona).
  Future<List<SpinIntervention>> interventions() async {
    final obcine = await myObcine();
    if (obcine.isEmpty) return [];
    final res = await _raw.get<String>(
      _feedUrl,
      options: Options(responseType: ResponseType.plain),
    );
    final xml = res.data ?? '';
    return _parse(xml).where((it) {
      final desc = it.description ?? it.obcina ?? '';
      return obcine.any((o) => _matchesObcina(desc, o));
    }).toList();
  }

  // ─── Parsanje RSS (brez dodatnih odvisnosti) ───────────────

  List<SpinIntervention> _parse(String xml) {
    final items = <SpinIntervention>[];
    final itemRe = RegExp(r'<item\b[^>]*>([\s\S]*?)<\/item>');
    for (final m in itemRe.allMatches(xml)) {
      final block = m.group(1)!;
      final guid = _field(block, 'guid') ?? _field(block, 'link');
      final title = _field(block, 'title');
      if (guid == null || title == null) continue;
      final descRaw = (_field(block, 'description') ?? '').trim();
      final isBare = descRaw.isNotEmpty && descRaw.length < 60 && !descRaw.contains('.');
      items.add(SpinIntervention(
        id: guid,
        spinType: _stripDate(title),
        obcina: isBare ? descRaw : null,
        title: title,
        description: descRaw.isEmpty ? null : descRaw,
        link: _field(block, 'link'),
        occurredAt: _parseDate(_field(block, 'pubDate')),
      ));
    }
    return items;
  }

  String? _field(String block, String tag) {
    final m = RegExp('<$tag\\b[^>]*>([\\s\\S]*?)<\\/$tag>').firstMatch(block);
    if (m == null) return null;
    var v = m.group(1)!;
    final cdata = RegExp(r'<!\[CDATA\[([\s\S]*?)\]\]>').firstMatch(v);
    if (cdata != null) v = cdata.group(1)!;
    return _decode(v).trim();
  }

  String _decode(String s) => s
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll(RegExp(r'&#0?39;'), "'")
      .replaceAll('&apos;', "'")
      .replaceAll('&amp;', '&');

  String _stripDate(String title) =>
      title.replaceAll(RegExp(r'\s+\d{1,2}\.\s*\d{1,2}\.\s*\d{4}.*$'), '').trim();

  DateTime? _parseDate(String? s) {
    if (s == null || s.isEmpty) return null;
    try {
      return HttpDate.parse(s).toLocal(); // RFC 1123, npr. "Wed, 08 Jul 2026 09:21:31 GMT"
    } catch (_) {
      return null;
    }
  }

  // ─── Ujemanje po občini ───────────────────────────────────

  String _norm(String s) => s
      .toLowerCase()
      .replaceAll('č', 'c')
      .replaceAll('š', 's')
      .replaceAll('ž', 'z')
      .replaceAll('ć', 'c')
      .replaceAll('đ', 'd')
      .trim();

  bool _matchesObcina(String desc, String obcina) {
    final t = _norm(obcina);
    final d = _norm(desc);
    if (t.isEmpty || d.isEmpty) return false;
    if (d == t) return true; // golo ime — sveža intervencija
    return RegExp('\\b${RegExp.escape(t)}\\b').hasMatch(d);
  }
}
