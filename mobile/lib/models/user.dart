// Vloge in statusi zrcalijo backend enume (docs/DATABASE.md).

// Funkcije (predsednik, poveljnik ...) so samo nazivi brez pravic
// (feedback PGD Pekre) — upravljavske pravice ima le administrator.
const leadershipRoles = ['org_admin'];

// Tehnične vloge z modulskimi pravicami nad opremo — zrcali backend @Roles.
const equipmentManageRoles = [
  'org_admin',
  'chief_machinist',
  'toolkeeper',
  'assistant_breathing_apparatus',
];

// Vloge, odgovorne za vozila — zrcali backend @Roles (vehicles.controller).
const vehicleManageRoles = ['org_admin', 'chief_machinist'];

const availabilityLabels = {
  'available': 'Dosegljiv',
  'at_home': 'Doma',
  'at_work': 'V službi',
  'on_leave': 'Na dopustu',
  'sick': 'Bolan',
  'unavailable': 'Nedosegljiv',
};

const membershipLabels = {
  'operative': 'Operativec',
  'veteran': 'Veteran',
  'youth': 'Mladina',
  'trainee': 'Pripravnik',
  'support': 'Podporni član',
  'honorary': 'Častni član',
};

class AuthUser {
  final String id;
  final String username;
  final String? email; // neobvezna — člani je nimajo nujno
  final String firstName;
  final String lastName;
  final String organizationId;
  final List<String> roles;

  AuthUser({
    required this.id,
    required this.username,
    this.email,
    required this.firstName,
    required this.lastName,
    required this.organizationId,
    required this.roles,
  });

  bool get isLeadership => roles.any(leadershipRoles.contains);

  /// Sme urejati opremo (in povezovati NFC oznake).
  bool get canManageEquipment => roles.any(equipmentManageRoles.contains);

  /// Odgovoren za vozila — vidi zavihek Vozila v mobilni.
  bool get canManageVehicles => roles.any(vehicleManageRoles.contains);

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        username: json['username'] as String? ?? '',
        email: json['email'] as String?,
        firstName: json['firstName'] as String,
        lastName: json['lastName'] as String,
        organizationId: json['organizationId'] as String? ?? '',
        roles: (json['roles'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'organizationId': organizationId,
        'roles': roles,
      };
}
