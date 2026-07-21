// TypeScript tipi — zrcalijo backend entitete (docs/DATABASE.md)

export type SystemRole =
  | 'super_admin'
  | 'org_admin'
  | 'president'
  | 'commander'
  | 'deputy_commander'
  | 'secretary'
  | 'treasurer'
  | 'youth_mentor'
  | 'chief_machinist'
  | 'toolkeeper'
  | 'board_member'
  | 'supervisory_board_member'
  | 'assistant_breathing_apparatus'
  | 'assistant_communications'
  | 'assistant_first_aid'
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
  | 'operative_day'
  | 'other';

export type RsvpStatus = 'attending' | 'not_attending' | 'maybe' | 'late';

/** Oznaka vozila po tipizaciji GZS (GVC-1, PV-1 ...) ali stara vrednost. */
export type VehicleType = string;

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roles: SystemRole[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface User {
  id: string;
  organizationId: string;
  username: string;
  email?: string;
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
  spinNotifications: boolean;
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
  targetUserIds?: string[];
  /** Odziv trenutnega uporabnika (vrne ga GET /events in GET /events/:id). */
  myRsvpStatus?: RsvpStatus;
  requiresRsvp: boolean;
  sendNotification: boolean;
  reminderMinutes: number;
  reminderOffsets?: number[];
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

/**
 * Telo za create/update vozila. Datumska polja dovolijo `null` za IZBRIS
 * obstoječega roka — `undefined` bi backend izpustil in datum obdržal.
 */
export type VehicleWrite = Partial<
  Omit<
    Vehicle,
    'registrationExpires' | 'insuranceExpires' | 'serviceDue' | 'serviceMileage'
  >
> & {
  registrationExpires?: string | null;
  insuranceExpires?: string | null;
  serviceDue?: string | null;
  serviceMileage?: number | null;
};

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
  expiryDate?: string;
  notes?: string;
  qrCode?: string;
  /** Strojni UID NFC oznake (NTAG213). */
  nfcUid?: string | null;
  /** Datum nabave — podlaga za starost opreme. */
  purchaseDate?: string;
  isActive: boolean;
  vehicle?: { id: string; name: string };
  /** Trenutni imetnik; `null`, če je oprema prosta. */
  currentHolder?: EquipmentHolder | null;
  /** Kdaj je bila zadolžena (skupaj s `currentHolder`). */
  issuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Imetnik opreme — namerno brez kontaktnih podatkov. */
export interface EquipmentHolder {
  id: string;
  firstName: string;
  lastName: string;
}

/** Ena vrstica v zgodovini zadolžitev kosa opreme. */
export interface EquipmentAssignment {
  id: string;
  issuedAt: string;
  returnedAt?: string | null;
  conditionAtIssue?: EquipmentCondition;
  conditionAtReturn?: EquipmentCondition;
  issueNotes?: string;
  returnNotes?: string;
  user: EquipmentHolder | null;
}

/** Vnos v "Moja zadolžena oprema". */
export interface MyEquipmentAssignment {
  id: string;
  issuedAt: string;
  conditionAtIssue?: EquipmentCondition;
  issueNotes?: string;
  equipment: {
    id: string;
    name: string;
    category?: string;
    inventoryNumber?: string;
    condition: EquipmentCondition;
    expiryDate?: string;
    nextInspection?: string;
  } | null;
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
  spinObcine?: string[] | null;
  isActive: boolean;
}

/**
 * Vloge z upravljavskimi pravicami. Funkcije (predsednik, poveljnik ...) so
 * samo nazivi brez pravic (feedback PGD Pekre) — upravlja le administrator.
 */
export const LEADERSHIP_ROLES: SystemRole[] = ['org_admin'];

/** Vloge, ki smejo urejati vozila (zrcali backend @Roles). */
export const VEHICLE_MANAGE_ROLES: SystemRole[] = [
  'org_admin',
  'chief_machinist',
];

/** Vloge, ki smejo urejati opremo (zrcali backend @Roles). */
export const EQUIPMENT_MANAGE_ROLES: SystemRole[] = [
  'org_admin',
  'chief_machinist',
  'toolkeeper',
  'assistant_breathing_apparatus',
];

/** Predlagane kategorije opreme (prosto besedilo, to so le predlogi). */
export const EQUIPMENT_CATEGORY_SUGGESTIONS = [
  'IDA — izolirni dihalni aparat',
  'Vrvna tehnika',
  'Gasilni aparat',
  'Cevi in armature',
  'Črpalke',
  'Zaščitna oprema',
  'Zveze',
  'Prva pomoč',
  'Orodje',
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
  operative_day: 'Operativni dan',
  other: 'Drugo',
};

/** Možnosti opomnikov pred dogodkom (minute pred začetkom, zrcali backend). */
export const REMINDER_OFFSET_OPTIONS: { value: number; label: string }[] = [
  { value: 7 * 24 * 60, label: '7 dni prej' },
  { value: 3 * 24 * 60, label: '3 dni prej' },
  { value: 24 * 60, label: '1 dan prej' },
  { value: 3 * 60, label: '3 ure prej' },
  { value: 60, label: '1 uro prej' },
];

/**
 * Oznake vozil po tipizaciji GZS (tabela "Tipizacija vozil"), združene po
 * vrsti vozila — za <optgroup> v obrazcu.
 */
export const VEHICLE_OZNAKA_GROUPS: {
  group: string;
  oznake: { value: string; label: string }[];
}[] = [
  {
    group: 'Poveljniška vozila',
    oznake: [
      { value: 'PV-1', label: 'PV-1 — manjše poveljniško vozilo' },
      { value: 'PV-2', label: 'PV-2 — večje poveljniško vozilo' },
      { value: 'GVZ-1', label: 'GVZ-1 — gasilsko vozilo za zveze' },
      { value: 'GVRZ', label: 'GVRZ — gasilsko vozilo za radijske zveze' },
    ],
  },
  {
    group: 'Gasilska vozila',
    oznake: [
      { value: 'GV-1', label: 'GV-1 — manjše gasilsko vozilo' },
      { value: 'GVV-1', label: 'GVV-1 — manjše gasilsko vozilo z vodo' },
      { value: 'GVV-2', label: 'GVV-2 — večje gasilsko vozilo z vodo' },
    ],
  },
  {
    group: 'Gasilska vozila s cisterno',
    oznake: [
      { value: 'GVC-1', label: 'GVC-1 — gasilsko vozilo s cisterno' },
      { value: 'GVC-2', label: 'GVC-2 — gasilsko vozilo s cisterno' },
      { value: 'GVC-3', label: 'GVC-3 — gasilsko vozilo s cisterno' },
      { value: 'GVC-4', label: 'GVC-4 — gasilsko vozilo s cisterno' },
    ],
  },
  {
    group: 'Gasilska vozila s prahom',
    oznake: [
      { value: 'GVS-1000', label: 'GVS-1000 — gasilsko vozilo s prahom' },
      { value: 'GVS-2000', label: 'GVS-2000 — gasilsko vozilo s prahom' },
      { value: 'GVSV', label: 'GVSV — gasilsko vozilo s prahom in vodo' },
    ],
  },
  {
    group: 'Vozila za gašenje in reševanje z višin',
    oznake: [
      { value: 'ZD', label: 'ZD — gasilsko zgibno dvigalo' },
      { value: 'TD', label: 'TD — gasilsko teleskopsko dvigalo' },
      { value: 'ALK', label: 'ALK — gasilska avtolestev s košaro' },
      { value: 'GVCZD-1', label: 'GVCZD-1 — vozilo s cisterno in zgibnim dvigalom' },
      { value: 'GVCZD-2', label: 'GVCZD-2 — vozilo s cisterno in zgibnim dvigalom' },
      { value: 'GVCTD-1', label: 'GVCTD-1 — vozilo s cisterno in teleskopskim dvigalom' },
      { value: 'GVCTD-2', label: 'GVCTD-2 — vozilo s cisterno in teleskopskim dvigalom' },
      { value: 'GVCALK-1', label: 'GVCALK-1 — vozilo s cisterno in avtolestvijo' },
      { value: 'GVCALK-2', label: 'GVCALK-2 — vozilo s cisterno in avtolestvijo' },
    ],
  },
  {
    group: 'Tehnična in orodna vozila',
    oznake: [
      { value: 'HTRV', label: 'HTRV — hitro tehnično reševalno vozilo' },
      { value: 'TRV', label: 'TRV — tehnično reševalno vozilo' },
      { value: 'OVNS', label: 'OVNS — orodno vozilo za nevarne snovi' },
      { value: 'OVRV', label: 'OVRV — orodno vozilo za reševanje na vodi' },
    ],
  },
  {
    group: 'Gasilska vozila za gozdne požare',
    oznake: [
      { value: 'GVGP-1', label: 'GVGP-1 — manjše vozilo za gozdne požare' },
      { value: 'GVGP-2', label: 'GVGP-2 — večje vozilo za gozdne požare' },
      { value: 'GCGP-1', label: 'GCGP-1 — cisterna za gozdne požare (mala)' },
      { value: 'GCGP-2', label: 'GCGP-2 — cisterna za gozdne požare (srednja)' },
      { value: 'GCGP-3', label: 'GCGP-3 — cisterna za gozdne požare (večja)' },
    ],
  },
  {
    group: 'Gasilska logistična vozila',
    oznake: [
      { value: 'GVM-1', label: 'GVM-1 — vozilo za prevoz moštva' },
      { value: 'GVM-2', label: 'GVM-2 — večje vozilo za prevoz moštva' },
      { value: 'VGV', label: 'VGV — večnamensko gasilsko vozilo' },
      { value: 'GVL-1', label: 'GVL-1 — manjše vozilo za logistiko' },
      { value: 'GVL-2', label: 'GVL-2 — večje vozilo za logistiko' },
      { value: 'GVT', label: 'GVT — gasilsko tovorno vozilo' },
      { value: 'GVK', label: 'GVK — vozilo za prevoz kontejnerjev' },
      { value: 'GVO', label: 'GVO — gasilsko vozilo za opazovanje' },
    ],
  },
  {
    group: 'Gasilski čolni',
    oznake: [
      { value: 'GRČ-1', label: 'GRČ-1 — manjši gasilski reševalni čoln' },
      { value: 'GRČ-2', label: 'GRČ-2 — srednji gasilski reševalni čoln' },
      { value: 'GRČ-3', label: 'GRČ-3 — večnamenski gasilski čoln' },
    ],
  },
  {
    group: 'Gasilski priklopniki',
    oznake: [
      { value: 'PMB', label: 'PMB — priklopnik s prenosno motorno brizgalno' },
      { value: 'PR', label: 'PR — priklopnik za razsvetljavo' },
      { value: 'PŠ', label: 'PŠ — priklopnik za gasilni prah' },
      { value: 'PČ', label: 'PČ — priklopnik za reševalni čoln' },
      { value: 'PL', label: 'PL — priklopnik za logistiko' },
      { value: 'PVT', label: 'PVT — priklopnik z visokotlačno črpalko' },
    ],
  },
  {
    group: 'Drugo',
    oznake: [{ value: 'other', label: 'Drugo' }],
  },
];

/** Stare vrednosti (pred tipizacijo) — obstoječi zapisi jih še imajo. */
const LEGACY_VEHICLE_TYPE_LABELS: Record<string, string> = {
  gvc: 'GVC — gasilsko vozilo s cisterno (staro)',
  gvgp: 'GVGP — vozilo za gozdne požare (staro)',
  ac: 'AC — avtocisterna (staro)',
  pv: 'PV — poveljniško vozilo (staro)',
  van: 'Kombi (staro)',
  other: 'Drugo',
};

const OZNAKA_LABELS: Record<string, string> = Object.fromEntries(
  VEHICLE_OZNAKA_GROUPS.flatMap((g) =>
    g.oznake.map((o) => [o.value, o.label]),
  ),
);

/** Prikazna oznaka vozila — pozna nove oznake in stare vrednosti. */
export function vehicleTypeLabel(type: string): string {
  return OZNAKA_LABELS[type] ?? LEGACY_VEHICLE_TYPE_LABELS[type] ?? type;
}

export const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: 'Super admin',
  org_admin: 'Administrator',
  president: 'Predsednik',
  commander: 'Poveljnik',
  deputy_commander: 'Podpoveljnik',
  secretary: 'Tajnik',
  treasurer: 'Blagajnik',
  youth_mentor: 'Mentor mladine',
  chief_machinist: 'Glavni strojnik',
  toolkeeper: 'Orodjar',
  board_member: 'Član upravnega odbora',
  supervisory_board_member: 'Član nadzornega odbora',
  assistant_breathing_apparatus: 'Pomočnik podpoveljnika za zaščito dihal',
  assistant_communications: 'Pomočnik podpoveljnika za zveze',
  assistant_first_aid: 'Pomočnik podpoveljnika za prvo pomoč',
  member: 'Član',
};
