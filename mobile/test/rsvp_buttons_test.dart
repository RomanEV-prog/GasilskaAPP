// Gumbi za odziv na dogodek — izbrani mora biti jasno ločen od neizbranih.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gasilapp_mobile/widgets/rsvp_buttons.dart';

/// Barva podlage gumba z danim napisom.
Color? _bg(WidgetTester tester, String label) {
  final material = tester.widget<Material>(
    find.ancestor(of: find.text(label), matching: find.byType(Material)).first,
  );
  return material.color;
}

void main() {
  testWidgets('izbrani odziv ima polno podlago in kljukico', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: RsvpButtons(eventId: 'e1', initialStatus: 'attending'),
      ),
    ));

    // Izbran je natanko en gumb.
    expect(find.byIcon(Icons.check_circle), findsOneWidget);
    expect(find.byIcon(Icons.circle_outlined), findsNWidgets(2));

    // Izbrani je poln, neizbrani prosojen — razlika mora biti očitna.
    final selected = _bg(tester, 'Pridem')!;
    final other = _bg(tester, 'Ne pridem')!;
    expect(selected.a, 1.0);
    expect(other.a, lessThan(0.2));
  });

  testWidgets('brez odziva ni nobene kljukice', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: RsvpButtons(eventId: 'e1')),
    ));

    expect(find.byIcon(Icons.check_circle), findsNothing);
    expect(find.byIcon(Icons.circle_outlined), findsNWidgets(3));
  });
}
