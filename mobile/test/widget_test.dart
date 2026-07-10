// Osnovni smoke test — preveri, da se aplikacija sestavi in prikaže login.
import 'package:flutter_test/flutter_test.dart';
import 'package:gasilapp_mobile/screens/login_screen.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('Login zaslon prikaže naslov', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

    // Naslov in gumb se prikažeta že ob prvem izrisu (neodvisno od omrežja).
    expect(find.text('GasilApp'), findsOneWidget);
    expect(find.text('Prijava'), findsOneWidget);

    // initState sproži omrežni klic (javni seznam društev), ki v testu spodleti.
    // Prevrtimo čas čez connectTimeout, da se timer sprosti in ne ostane čakajoč.
    await tester.pump(const Duration(seconds: 11));
  });
}
