import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../api/api_client.dart';
import '../api/equipment_api.dart';
import '../api/vehicles_api.dart';
import '../models/equipment.dart';
import '../models/vehicle.dart';

/// Vnos nove opreme — tok »najprej nalepka, potem podatki«.
///
/// Strojnik nalepko najprej nalepi na kos in jo prisloni v skenerju; ker še
/// ni povezana, skener ponudi ta zaslon z že ujetim UID. Ob shranjevanju se
/// kos ustvari skupaj s povezano oznako, nato se odpre podrobnost, kjer se
/// na oznako zapiše še vsebina.
class EquipmentCreateScreen extends StatefulWidget {
  /// UID prislonjene oznake; `null`, če zaslon odprt brez skeniranja.
  final String? nfcUid;

  const EquipmentCreateScreen({this.nfcUid, super.key});

  @override
  State<EquipmentCreateScreen> createState() => _EquipmentCreateScreenState();
}

class _EquipmentCreateScreenState extends State<EquipmentCreateScreen> {
  final _api = EquipmentApi();
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _category = TextEditingController();
  final _invNo = TextEditingController();
  final _location = TextEditingController();
  String _condition = 'good';
  String? _vehicleId;
  List<Vehicle> _vehicles = const [];
  DateTime? _nextInspection;
  DateTime? _expiryDate;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    // Ob napaki izbirnik vozila preprosto ostane skrit — vnos mora delovati.
    VehiclesApi().list().then((v) {
      if (mounted) setState(() => _vehicles = v);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    _name.dispose();
    _category.dispose();
    _invNo.dispose();
    _location.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);

    String? iso(DateTime? d) =>
        d == null ? null : DateFormat('yyyy-MM-dd').format(d);
    String? blankToNull(String s) => s.trim().isEmpty ? null : s.trim();

    try {
      final created = await _api.create({
        'name': _name.text.trim(),
        if (blankToNull(_category.text) != null)
          'category': _category.text.trim(),
        if (blankToNull(_invNo.text) != null)
          'inventoryNumber': _invNo.text.trim(),
        if (blankToNull(_location.text) != null)
          'location': _location.text.trim(),
        'condition': _condition,
        if (_vehicleId != null) 'vehicleId': _vehicleId,
        if (_nextInspection != null) 'nextInspection': iso(_nextInspection),
        if (_expiryDate != null) 'expiryDate': iso(_expiryDate),
        if (widget.nfcUid != null) 'nfcUid': widget.nfcUid,
      });
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(
        content: Text(widget.nfcUid == null
            ? 'Oprema je dodana.'
            : 'Oprema je dodana in povezana z oznako — zdaj nanjo '
                'zapiši še vsebino.'),
      ));
      context.pushReplacement('/equipment/${created.id}', extra: created);
    } on ApiException catch (err) {
      if (!mounted) return;
      setState(() => _saving = false);
      messenger.showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  Widget _dateRow(
    String label,
    DateTime? value,
    void Function(DateTime?) set,
  ) {
    final df = DateFormat('d. M. yyyy', 'sl');
    return Row(
      children: [
        Expanded(child: Text('$label: ${value == null ? '—' : df.format(value)}')),
        TextButton(
          onPressed: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: value ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (picked != null) setState(() => set(picked));
          },
          child: const Text('Izberi'),
        ),
        if (value != null)
          IconButton(
            icon: const Icon(Icons.clear, size: 18),
            tooltip: 'Počisti',
            onPressed: () => setState(() => set(null)),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nova oprema')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.nfcUid != null)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.nfc),
                  title: const Text('NFC oznaka bo povezana'),
                  subtitle: Text(widget.nfcUid!),
                ),
              ),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Naziv *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Vnesite naziv.' : null,
            ),
            TextFormField(
              controller: _category,
              decoration:
                  const InputDecoration(labelText: 'Vrsta / kategorija'),
            ),
            TextFormField(
              controller: _invNo,
              decoration: const InputDecoration(labelText: 'Inventarna št.'),
            ),
            TextFormField(
              controller: _location,
              decoration: const InputDecoration(labelText: 'Lokacija'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: const InputDecoration(labelText: 'Stanje'),
              items: equipmentConditionLabels.entries
                  .map((c) =>
                      DropdownMenuItem(value: c.key, child: Text(c.value)))
                  .toList(),
              onChanged: (v) => setState(() => _condition = v ?? _condition),
            ),
            if (_vehicles.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                initialValue: _vehicleId,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Na vozilu'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('— ni na vozilu —'),
                  ),
                  ..._vehicles.map((v) => DropdownMenuItem<String?>(
                        value: v.id,
                        child: Text(v.name, overflow: TextOverflow.ellipsis),
                      )),
                ],
                onChanged: (v) => setState(() => _vehicleId = v),
              ),
            ],
            const SizedBox(height: 12),
            _dateRow('Naslednji pregled', _nextInspection,
                (v) => _nextInspection = v),
            _dateRow('Rok veljave', _expiryDate, (v) => _expiryDate = v),
            const SizedBox(height: 24),
            FilledButton.icon(
              icon: const Icon(Icons.save_outlined),
              label: Text(_saving ? 'Shranjujem …' : 'Shrani opremo'),
              onPressed: _saving ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}
