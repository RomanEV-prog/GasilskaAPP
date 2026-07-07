// Vloge in statusi zrcalijo backend enume (docs/DATABASE.md).

const leadershipRoles = [
  'org_admin',
  'president',
  'commander',
  'secretary',
];

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
