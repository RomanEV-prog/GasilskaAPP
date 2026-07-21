// Vozilo (zrcali backend Vehicle entiteto). Samo za branje v mobilni —
// urejanje ostane v spletnem portalu.

class VehicleDriver {
  final String id;
  final String? firstName;
  final String? lastName;

  VehicleDriver({required this.id, this.firstName, this.lastName});

  String get fullName =>
      [firstName, lastName].where((s) => s != null && s.isNotEmpty).join(' ');

  factory VehicleDriver.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return VehicleDriver(
      id: json['id'] as String? ?? '',
      firstName: user?['firstName'] as String?,
      lastName: user?['lastName'] as String?,
    );
  }
}

class Vehicle {
  final String id;
  final String name;
  final String vehicleType;
  final String? licensePlate;
  final String? vin;
  final int? year;
  final int? mileage;
  final String? registrationExpires; // ISO datum (yyyy-MM-dd) ali null
  final String? insuranceExpires;
  final String? serviceDue;
  final int? serviceMileage;
  final String? notes;
  final List<VehicleDriver> drivers;

  Vehicle({
    required this.id,
    required this.name,
    required this.vehicleType,
    this.licensePlate,
    this.vin,
    this.year,
    this.mileage,
    this.registrationExpires,
    this.insuranceExpires,
    this.serviceDue,
    this.serviceMileage,
    this.notes,
    this.drivers = const [],
  });

  /// GZS oznaka (npr. »GVC-1«) je že v berljivi obliki.
  String get typeLabel => vehicleType;

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        vehicleType: json['vehicleType'] as String? ?? 'other',
        licensePlate: json['licensePlate'] as String?,
        vin: json['vin'] as String?,
        year: json['year'] as int?,
        mileage: json['mileage'] as int?,
        registrationExpires: json['registrationExpires'] as String?,
        insuranceExpires: json['insuranceExpires'] as String?,
        serviceDue: json['serviceDue'] as String?,
        serviceMileage: json['serviceMileage'] as int?,
        notes: json['notes'] as String?,
        drivers: (json['drivers'] as List<dynamic>? ?? [])
            .map((e) => VehicleDriver.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
