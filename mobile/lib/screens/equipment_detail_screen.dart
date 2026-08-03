import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:nfc_manager/ndef_record.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/equipment_api.dart';
import '../api/users_api.dart';
import '../models/equipment.dart';
import '../providers/auth_provider.dart';
import '../services/nfc_service.dart';

class EquipmentDetailScreen extends StatefulWidget {
  final Equipment equipment;
  const EquipmentDetailScreen({required this.equipment, super.key});

  @override
  State<EquipmentDetailScreen> createState() => _EquipmentDetailScreenState();
}

class _EquipmentDetailScreenState extends State<EquipmentDetailScreen> {
  final _api = EquipmentApi();
  late Equipment _equipment = widget.equipment;
  bool _nfcAvailable = false;

  @override
  void initState() {
    super.initState();
    NfcService.isAvailable().then((v) {
      if (mounted) setState(() => _nfcAvailable = v);
    });
  }

  @override
  void dispose() {
    NfcService.stop();
    super.dispose();
  }

  Color _conditionColor(String condition) {
    switch (condition) {
      case 'excellent':
      case 'good':
        return Colors.green;
      case 'fair':
        return Colors.orange;
      default:
        return Colors.red;
    }
  }

  /// Po spremembi podatkov spomni, da je vsebina na oznaki zdaj zastarela.
  void _savedSnack(ScaffoldMessengerState messenger) {
    messenger.showSnackBar(SnackBar(
      content: Text(_equipment.nfcUid == null
          ? 'Podatki so shranjeni.'
          : 'Podatki so shranjeni — znova zapiši NFC oznako, da bo ažurna.'),
    ));
  }

  Future<void> _refresh() async {
    final fresh = await _api.getById(_equipment.id);
    if (mounted) setState(() => _equipment = fresh);
  }

  /// Urejanje podatkov, ki so tudi na NFC oznaki (in stanja/lokacije).
  Future<void> _editDetails() async {
    final e = _equipment;
    final messenger = ScaffoldMessenger.of(context);
    final df = DateFormat('d. M. yyyy', 'sl');
    final name = TextEditingController(text: e.name);
    final category = TextEditingController(text: e.category ?? '');
    final invNo = TextEditingController(text: e.inventoryNumber ?? '');
    final location = TextEditingController(text: e.location ?? '');
    var condition = e.condition;
    DateTime? nextInspection = e.nextInspection;
    DateTime? expiryDate = e.expiryDate;

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          Widget dateRow(
            String label,
            DateTime? value,
            void Function(DateTime?) set,
          ) {
            return Row(
              children: [
                Expanded(
                  child: Text('$label: ${value == null ? '—' : df.format(value)}'),
                ),
                TextButton(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: value ?? DateTime.now(),
                      firstDate: DateTime(2000),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) setSheet(() => set(picked));
                  },
                  child: const Text('Izberi'),
                ),
                if (value != null)
                  IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    tooltip: 'Počisti',
                    onPressed: () => setSheet(() => set(null)),
                  ),
              ],
            );
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Uredi opremo',
                    style: Theme.of(ctx).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Naziv'),
                  ),
                  TextField(
                    controller: category,
                    decoration:
                        const InputDecoration(labelText: 'Vrsta / kategorija'),
                  ),
                  TextField(
                    controller: invNo,
                    decoration:
                        const InputDecoration(labelText: 'Inventarna št.'),
                  ),
                  TextField(
                    controller: location,
                    decoration: const InputDecoration(labelText: 'Lokacija'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: condition,
                    decoration: const InputDecoration(labelText: 'Stanje'),
                    items: equipmentConditionLabels.entries
                        .map((c) => DropdownMenuItem(
                            value: c.key, child: Text(c.value)))
                        .toList(),
                    onChanged: (v) => condition = v ?? condition,
                  ),
                  const SizedBox(height: 12),
                  dateRow('Naslednji pregled', nextInspection,
                      (v) => nextInspection = v),
                  dateRow('Rok veljave', expiryDate, (v) => expiryDate = v),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Shrani'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    if (saved != true) return;

    String? iso(DateTime? d) =>
        d == null ? null : DateFormat('yyyy-MM-dd').format(d);
    String? blankToNull(String s) => s.trim().isEmpty ? null : s.trim();

    try {
      // Brisljiva polja pošljemo kot null (izpuščeno polje se ne bi počistilo).
      final updated = await _api.update(_equipment.id, {
        if (name.text.trim().isNotEmpty) 'name': name.text.trim(),
        'category': blankToNull(category.text),
        'inventoryNumber': blankToNull(invNo.text),
        'location': blankToNull(location.text),
        'condition': condition,
        'nextInspection': iso(nextInspection),
        'expiryDate': iso(expiryDate),
      });
      if (!mounted) return;
      setState(() => _equipment = updated);
      _savedSnack(messenger);
    } on ApiException catch (err) {
      messenger.showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  /// Zadolžitev prostega kosa članu — izbirnik s seznamom članov.
  Future<void> _assign() async {
    final messenger = ScaffoldMessenger.of(context);
    final List<MemberRef> members;
    try {
      members = await UsersApi().members();
    } on ApiException catch (err) {
      messenger.showSnackBar(SnackBar(content: Text(err.message)));
      return;
    }
    if (!mounted) return;

    final picked = await showDialog<MemberRef>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Zadolži članu'),
        children: members
            .map((m) => SimpleDialogOption(
                  onPressed: () => Navigator.pop(ctx, m),
                  child: Text(m.fullName),
                ))
            .toList(),
      ),
    );
    if (picked == null) return;

    try {
      await _api.issue(_equipment.id, picked.id);
      await _refresh();
      _savedSnack(messenger);
    } on ApiException catch (err) {
      messenger.showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  /// Vračilo trenutno odprte zadolžitve.
  Future<void> _return() async {
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Vrni opremo'),
        content: Text(
          'Zaključim zadolžitev (${_equipment.currentHolderName})?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Prekliči'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Vrni'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await _api.returnItem(_equipment.id);
      await _refresh();
      _savedSnack(messenger);
    } on ApiException catch (err) {
      messenger.showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  /// Besedilo, ki se zapiše na oznako — posnetek stanja ob zapisu.
  /// Vrstice brez podatka izpustimo, da ne trošimo prostora na oznaki.
  String _tagText() {
    final e = _equipment;
    final df = DateFormat('d. M. yyyy', 'sl');
    final lines = <String>[
      'Plamen — ${e.name}',
      if (e.category?.isNotEmpty == true) 'Vrsta: ${e.category}',
      if (e.inventoryNumber?.isNotEmpty == true)
        'Inv. št.: ${e.inventoryNumber}',
      'Zadolženo: ${e.currentHolderName ?? 'Prosto'}',
      if (e.nextInspection != null)
        'Pregled do: ${df.format(e.nextInspection!)}',
      if (e.expiryDate != null) 'Velja do: ${df.format(e.expiryDate!)}',
    ];
    return lines.join('\n');
  }

  /// Prislon oznake → nanjo zapiše vsebino IN shrani njen UID na ta kos
  /// opreme. Če oznaka zapisa ne podpira (ali je zaklenjena), se poveže samo
  /// UID — evidenca v bazi je vir resnice, vsebina na oznaki je bonus.
  Future<void> _writeNfcTag() async {
    final messenger = ScaffoldMessenger.of(context);
    var done = false;

    showModalBottomSheet<void>(
      context: context,
      isDismissible: true,
      builder: (_) => const Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.nfc, size: 48),
            SizedBox(height: 16),
            Text(
              'Prisloni telefon na NFC nalepko …',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 8),
            Text(
              'Na oznako se zapišejo vrsta, zadolžitev in roki; '
              'oznaka se poveže s tem kosom opreme.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    ).then((_) {
      if (!done) NfcService.stop();
    });

    final message = NdefMessage(records: [NfcService.textRecord(_tagText())]);

    await NfcService.startWrite(message, (result) async {
      if (done) return;
      done = true;
      await NfcService.stop();

      final uid = result.uid;
      if (uid == null) {
        if (!mounted) return;
        Navigator.of(context).pop();
        messenger.showSnackBar(
          const SnackBar(content: Text('Oznake ni bilo mogoče prebrati.')),
        );
        return;
      }

      const writeNote = {
        NfcWriteStatus.ok: 'NFC oznaka je zapisana in povezana.',
        NfcWriteStatus.notNdef:
            'Oznaka je povezana; zapis vsebine na to oznako ni podprt.',
        NfcWriteStatus.readOnly:
            'Oznaka je povezana; oznaka je zaklenjena za pisanje.',
        NfcWriteStatus.tooLarge:
            'Oznaka je povezana; vsebina presega kapaciteto oznake.',
      };

      try {
        final updated = await _api.linkNfc(_equipment.id, uid);
        if (!mounted) return;
        setState(() => _equipment = updated);
        Navigator.of(context).pop(); // zapri listič
        messenger.showSnackBar(
          SnackBar(content: Text(writeNote[result.status]!)),
        );
      } on ApiException catch (err) {
        if (!mounted) return;
        Navigator.of(context).pop();
        // Zapis na oznako je morda uspel, povezava v bazo pa ne — povej oboje.
        final prefix = result.status == NfcWriteStatus.ok
            ? 'Vsebina je zapisana, povezava v bazo pa ni uspela: '
            : '';
        messenger.showSnackBar(SnackBar(content: Text('$prefix${err.message}')));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final e = _equipment;
    final df = DateFormat('d. M. yyyy', 'sl');
    final canManage =
        context.watch<AuthProvider>().user?.canManageEquipment ?? false;

    return Scaffold(
      appBar: AppBar(title: Text(e.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  e.name,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _conditionColor(e.condition).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  e.conditionLabel,
                  style: TextStyle(
                    color: _conditionColor(e.condition),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (!e.isActive)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Ta oprema je označena kot neaktivna.',
                style: TextStyle(color: Colors.red),
              ),
            ),
          const SizedBox(height: 24),

          // Zadolžitev je glavni podatek ob skeniranju — zato na vrhu.
          _row(
            context,
            Icons.person_outline,
            'Zadolženo',
            e.currentHolderName ?? 'Prosto',
          ),
          if (e.issuedAt != null)
            _row(
              context,
              Icons.login_outlined,
              'Zadolženo od',
              df.format(e.issuedAt!),
            ),
          const Divider(height: 24),

          _row(context, Icons.category_outlined, 'Kategorija', e.category),
          _row(context, Icons.tag, 'Inventarna št.', e.inventoryNumber),
          _row(context, Icons.place_outlined, 'Lokacija', e.location),
          _row(context, Icons.fire_truck_outlined, 'Na vozilu', e.vehicleName),
          _row(
            context,
            Icons.shopping_bag_outlined,
            'Datum nabave',
            e.purchaseDate != null ? df.format(e.purchaseDate!) : null,
          ),
          _row(context, Icons.timelapse_outlined, 'Starost', e.starost),
          _row(
            context,
            Icons.event_available_outlined,
            'Zadnji pregled',
            e.lastInspection != null ? df.format(e.lastInspection!) : null,
          ),
          _row(
            context,
            Icons.event_outlined,
            'Naslednji pregled',
            e.nextInspection != null ? df.format(e.nextInspection!) : null,
            highlight: e.nextInspection != null &&
                e.nextInspection!.isBefore(DateTime.now()),
          ),
          _row(
            context,
            Icons.hourglass_bottom_outlined,
            'Rok veljave',
            e.expiryDate != null ? df.format(e.expiryDate!) : null,
            highlight:
                e.expiryDate != null && e.expiryDate!.isBefore(DateTime.now()),
          ),
          _row(context, Icons.qr_code, 'QR koda', e.qrCode),
          _row(context, Icons.nfc, 'NFC oznaka', e.nfcUid),

          if (canManage) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Uredi podatke'),
              onPressed: _editDetails,
            ),
            const SizedBox(height: 8),
            e.currentHolderName == null
                ? OutlinedButton.icon(
                    icon: const Icon(Icons.person_add_alt_outlined),
                    label: const Text('Zadolži članu'),
                    onPressed: _assign,
                  )
                : OutlinedButton.icon(
                    icon: const Icon(Icons.person_remove_outlined),
                    label: const Text('Vrni opremo'),
                    onPressed: _return,
                  ),
            if (_nfcAvailable) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                icon: const Icon(Icons.nfc),
                label: Text(
                  e.nfcUid == null
                      ? 'Zapiši in poveži NFC oznako'
                      : 'Znova zapiši NFC oznako',
                ),
                onPressed: _writeNfcTag,
              ),
            ],
          ],

          if (e.notes != null && e.notes!.isNotEmpty) ...[
            const Divider(height: 32),
            Text('Opombe', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(e.notes!),
          ],
        ],
      ),
    );
  }

  Widget _row(
    BuildContext context,
    IconData icon,
    String label,
    String? value, {
    bool highlight = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          Expanded(
            child: Text(
              value?.isNotEmpty == true ? value! : '—',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: highlight ? Colors.red : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
