import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _storage = const FlutterSecureStorage();
  final _authApi = AuthApi();

  final _codeCtrl = TextEditingController();

  List<PublicOrganization> _organizations = [];
  String? _organizationId;
  bool _loadingOrgs = true;
  bool _orgsFailed = false;
  bool _showPassword = false;
  bool _submitting = false;
  String? _error;
  // 2FA drugi korak: po pravilnem geslu backend vrne vmesni žeton (5 min).
  String? _pendingToken;

  @override
  void initState() {
    super.initState();
    _loadOrganizations();
  }

  /// Naloži javni seznam društev; zadnja izbira se zapomni.
  ///
  /// Branje shrambe je LOČENO od omrežnega klica: pokvarjena šifrirana
  /// shramba (npr. obnovljena iz backupa brez ključa v Keystore) ne sme
  /// podreti seznama — udarilo 3. 8. 2026 in izgledalo kot omrežna napaka.
  Future<void> _loadOrganizations() async {
    String? last;
    try {
      last = await _storage.read(key: 'lastOrganizationId');
    } catch (_) {
      // Neberljivo shrambo počistimo, da ne moti niti prihodnjih zagonov.
      try {
        await _storage.deleteAll();
      } catch (_) {}
    }
    try {
      final orgs = await _authApi.publicOrganizations();
      if (!mounted) return;
      setState(() {
        _organizations = orgs;
        _organizationId =
            orgs.any((o) => o.id == last) ? last : null;
        _loadingOrgs = false;
        _orgsFailed = false;
        _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingOrgs = false;
        _orgsFailed = true;
        _error = 'Seznama društev ni bilo mogoče naložiti. Preverite povezavo.';
      });
    }
  }

  Future<void> _retryOrganizations() async {
    setState(() {
      _loadingOrgs = true;
      _error = null;
    });
    await _loadOrganizations();
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final username = _usernameCtrl.text.trim();
    if (!username.contains('@') && _organizationId == null) {
      setState(() => _error = 'Izberite svoje društvo.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final pendingToken = await context.read<AuthProvider>().login(
            username,
            _passwordCtrl.text,
            organizationId: _organizationId,
          );
      if (_organizationId != null) {
        await _storage.write(
            key: 'lastOrganizationId', value: _organizationId);
      }
      if (pendingToken != null && mounted) {
        // Račun ima 2FA — pokaži vnos kode.
        setState(() => _pendingToken = pendingToken);
      }
      // Sicer se navigacija sproži prek GoRouter redirect (auth state).
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Prišlo je do napake.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitCode() async {
    final code = _codeCtrl.text.trim();
    if (code.length < 6) {
      setState(() => _error = 'Vnesite kodo iz aplikacije.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await context.read<AuthProvider>().verify2fa(_pendingToken!, code);
      // Navigacija prek GoRouter redirect (auth state).
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Prišlo je do napake.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _backToLogin() {
    setState(() {
      _pendingToken = null;
      _codeCtrl.clear();
      _error = null;
    });
  }

  /// Dialog za pozabljeno geslo: vnos e-pošte → backend pošlje povezavo.
  /// Novo geslo se nastavi prek povezave v pošti (odpre spletno stran).
  Future<void> _forgotPassword() async {
    final emailCtrl = TextEditingController(
      text: _usernameCtrl.text.contains('@') ? _usernameCtrl.text.trim() : '',
    );
    final email = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pozabljeno geslo'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Vnesite e-poštni naslov svojega računa. Poslali vam bomo '
              'povezavo za ponastavitev gesla.',
            ),
            const SizedBox(height: 16),
            TextField(
              controller: emailCtrl,
              autofocus: true,
              autocorrect: false,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'E-poštni naslov',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Prekliči'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, emailCtrl.text.trim()),
            child: const Text('Pošlji'),
          ),
        ],
      ),
    );
    if (email == null || !email.contains('@') || !mounted) return;
    try {
      await _authApi.forgotPassword(email);
    } catch (_) {
      // Odgovor je namerno vedno enak — tudi ob napaki ne razkrivamo nič.
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Če račun obstaja, smo poslali navodila za ponastavitev gesla. '
          'Preverite e-pošto (tudi neželeno).',
        ),
        duration: Duration(seconds: 6),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GasilColors.bg,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.asset(
                          'assets/plamen-icon.png',
                          width: 64,
                          height: 64,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Plamen',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'Portal za gasilska društva',
                        style: TextStyle(color: GasilColors.textMuted),
                      ),
                      const SizedBox(height: 24),
                      if (_pendingToken != null) ...[
                        const Text(
                          'Vnesite 6-mestno kodo iz avtentikacijske '
                          'aplikacije (ali rezervno kodo).',
                          style: TextStyle(color: GasilColors.textMuted),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _codeCtrl,
                          autofocus: true,
                          autocorrect: false,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Koda',
                            hintText: '123456',
                            border: OutlineInputBorder(),
                          ),
                          onFieldSubmitted: (_) => _submitCode(),
                        ),
                      ] else ...[
                      DropdownButtonFormField<String>(
                        // ignore: deprecated_member_use
                        value: _organizationId,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Društvo',
                          border: const OutlineInputBorder(),
                          suffixIcon: _loadingOrgs
                              ? const Padding(
                                  padding: EdgeInsets.all(12),
                                  child: SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ),
                                )
                              : null,
                        ),
                        items: _organizations
                            .map((o) => DropdownMenuItem(
                                  value: o.id,
                                  child: Text(
                                    o.name,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() => _organizationId = v),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _usernameCtrl,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Uporabniško ime',
                          hintText: 'ime.priimek',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Vnesite uporabniško ime.'
                            : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          labelText: 'Geslo',
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(_showPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined),
                            tooltip:
                                _showPassword ? 'Skrij geslo' : 'Pokaži geslo',
                            onPressed: () => setState(
                                () => _showPassword = !_showPassword),
                          ),
                        ),
                        validator: (v) => (v == null || v.isEmpty)
                            ? 'Vnesite geslo.'
                            : null,
                        onFieldSubmitted: (_) => _submit(),
                      ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: GasilColors.danger.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(
                                  color: GasilColors.danger,
                                  fontSize: 13,
                                ),
                              ),
                              // Neuspelo nalaganje seznama društev ima pot
                              // do ponovnega poskusa brez ponovnega zagona.
                              if (_orgsFailed)
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: _retryOrganizations,
                                    child: const Text('Poskusi znova'),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _submitting
                              ? null
                              : (_pendingToken != null
                                  ? _submitCode
                                  : _submit),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Text(
                              _submitting
                                  ? (_pendingToken != null
                                      ? 'Preverjanje ...'
                                      : 'Prijavljanje ...')
                                  : (_pendingToken != null
                                      ? 'Potrdi'
                                      : 'Prijava'),
                            ),
                          ),
                        ),
                      ),
                      if (_pendingToken != null)
                        TextButton(
                          onPressed: _submitting ? null : _backToLogin,
                          child: const Text('Nazaj na prijavo'),
                        )
                      else
                        TextButton(
                          onPressed: _submitting ? null : _forgotPassword,
                          child: const Text('Pozabljeno geslo?'),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
