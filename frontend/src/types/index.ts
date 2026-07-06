// TypeScript tipi — zrcalijo backend entitete (docs/DATABASE.md)

export type SystemRole =
  | 'super_admin'
  | 'org_admin'
  | 'president'
  | 'commander'
  | 'secretary'
  | 'treasurer'
  | 'youth_mentor'
  | 'member';

export type MembershipStatus =
  | 'operative'
  | 'veteran'
  | 'youth'
  | 'trainee'
  | 'support'
  | 'honorary';

export type AvailabilityStatus =
  | 'available'
  | 'at_home'
  | 'at_work'
  | 'on_leave'
  | 'sick'
  | 'unavailable';

export type EventType =
  | 'drill'
  | 'meeting'
  | 'competition'
  | 'intervention'
  | 'cleanup'
  | 'celebration'
  | 'assembly'
  | 'other';

export type RsvpStatus = 'attending' | 'not_attending' | 'maybe' | 'late';

export type VehicleType = 'gvc' | 'gvgp' | 'ac' | 'pv' | 'van' | 'other';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roles: SystemRole[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  dateOfBirth?: string;
  photoUrl?: string;
  membershipStatus: MembershipStatus;
  rank?: string;
  membershipNumber?: string;
  joinedAt?: string;
  isActive: boolean;
  availability: AvailabilityStatus;
  lastLoginAt?: string;
  roles?: SystemRole[];
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  organizationId: string;
  createdBy: string;
  title: string;
  description?: string;
  location?: string;
  eventType: EventType;
  startsAt: string;
  endsAt?: string;
  targetGroup?: MembershipStatus[];
  requiresRsvp: boolean;
  sendNotification: boolean;
  reminderMinutes: number;
  isCancelled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRsvpEntry {
  id: string;
  status: RsvpStatus;
  note?: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    membershipStatus: MembershipStatus;
  } | null;
}

export interface Vehicle {
  id: string;
  organizationId: string;
  name: string;
  vehicleType: VehicleType;
  licensePlate?: string;
  vin?: string;
  year?: number;
  mileage: number;
  registrationExpires?: string;
  insuranceExpires?: string;
  serviceDue?: string;
  serviceMileage?: number;
  notes?: string;
  isActive: boolean;
  drivers?: {
    id: string;
    userId: string;
    user?: { id: string; firstName: string; lastName: string; phone?: string };
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Training {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  provider?: string;
  completedAt: string;
  expiresAt?: string;
  documentUrl?: string;
  notes?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    membershipStatus: MembershipStatus;
  };
  createdAt: string;
  updatedAt: string;
}

export type NotificationTarget =
  | 'all'
  | 'operative'
  | 'youth'
  | 'leadership'
  | 'specific';

export interface AppNotification {
  id: string;
  organizationId: string;
  createdBy?: string;
  title: string;
  body: string;
  type: string;
  target: NotificationTarget;
  targetUserIds?: string[];
  sentAt?: string;
  createdAt: string;
  isRead?: boolean;
}

export interface AdminDashboard {
  members: {
    total: number;
    active: number;
    operatives: number;
    availableNow: number;
  };
  upcomingEvents: Event[];
  expiringTrainings: Training[];
  expiringVehicles: Vehicle[];
  availabilityBreakdown: Record<AvailabilityStatus, number>;
}

export interface MemberDashboard {
  upcomingEvents: Event[];
  myTrainings: Training[];
  myNotifications: AppNotification[];
  myAvailability: AvailabilityStatus;
  myRsvps: {
    id: string;
    status: RsvpStatus;
    note?: string;
    event: {
      id: string;
      title: string;
      startsAt: string;
      location?: string;
    } | null;
  }[];
}

export type EquipmentCondition =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'out_of_service';

export interface Equipment {
  id: string;
  organizationId: string;
  vehicleId?: string;
  name: string;
  category?: string;
  inventoryNumber?: string;
  location?: string;
  condition: EquipmentCondition;
  lastInspection?: string;
  nextInspection?: string;
  notes?: string;
  qrCode?: string;
  isActive: boolean;
  vehicle?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  excellent: 'Odlično',
  good: 'Dobro',
  fair: 'Zadovoljivo',
  poor: 'Slabo',
  out_of_service: 'Izven uporabe',
};

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
}

/** Vodstvene vloge — smejo urejati člane, dogodke ipd. */
export const LEADERSHIP_ROLES: SystemRole[] = [
  'org_admin',
  'president',
  'commander',
  'secretary',
];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Dosegljiv',
  at_home: 'Doma',
  at_work: 'V službi',
  on_leave: 'Na dopustu',
  sick: 'Bolan',
  unavailable: 'Nedosegljiv',
};

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  operative: 'Operativec',
  veteran: 'Veteran',
  youth: 'Mladina',
  trainee: 'Pripravnik',
  support: 'Podporni član',
  honorary: 'Častni član',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  drill: 'Vaja',
  meeting: 'Sestanek',
  competition: 'Tekmovanje',
  intervention: 'Intervencija',
  cleanup: 'Čistilna akcija',
  celebration: 'Proslava',
  assembly: 'Občni zbor',
  other: 'Drugo',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  gvc: 'GVC — gasilsko vozilo s cisterno',
  gvgp: 'GVGP — vozilo za gozdne požare',
  ac: 'AC — avtocisterna',
  pv: 'PV — poveljniško vozilo',
  van: 'Kombi',
  other: 'Drugo',
};

export const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: 'Super admin',
  org_admin: 'Administrator',
  president: 'Predsednik',
  commander: 'Poveljnik',
  secretary: 'Tajnik',
  treasurer: 'Blagajnik',
  youth_mentor: 'Mentor mladine',
  member: 'Član',
};
