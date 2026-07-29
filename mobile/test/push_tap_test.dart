// Obravnava tapa na push obvestilo — kam pelje uporabnika.
//
// SPIN obvestilo z veljavno povezavo odpre zunanji brskalnik (plugin, ki ga
// tu ne moremo pognati), zato se test omeji na primere brez odpiranja
// povezave: brez povezave in obvestila drugih vrst.
import 'package:flutter_test/flutter_test.dart';
import 'package:gasilapp_mobile/providers/app_nav.dart';
import 'package:gasilapp_mobile/services/fcm_service.dart';

void main() {
  setUp(() => requestedHomeTab.value = null);

  test('SPIN obvestilo brez povezave odpre zavihek SPIN', () async {
    await FcmService.handleTap({'type': 'spin', 'spinGuid': 'x'});
    expect(requestedHomeTab.value, HomeTab.spin);
  });

  test('SPIN obvestilo z neveljavno shemo ne odpre povezave', () async {
    await FcmService.handleTap({
      'type': 'spin',
      'link': 'javascript:alert(1)',
    });
    expect(requestedHomeTab.value, HomeTab.spin);
  });

  test('obvestilo o dogodku odpre zavihek Obvestila', () async {
    await FcmService.handleTap({'type': 'event', 'eventId': 'x'});
    expect(requestedHomeTab.value, HomeTab.notifications);
  });
}
