/**
 * Sistemske vloge (SystemRole).
 * Ujemajo se z `system_role` ENUM v bazi (docs/DATABASE.md).
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  PRESIDENT = 'president',
  COMMANDER = 'commander',
  SECRETARY = 'secretary',
  TREASURER = 'treasurer',
  YOUTH_MENTOR = 'youth_mentor',
  MEMBER = 'member',
}

/**
 * Status članstva (membership_status ENUM).
 */
export enum MembershipStatus {
  OPERATIVE = 'operative',
  VETERAN = 'veteran',
  YOUTH = 'youth',
  TRAINEE = 'trainee',
  SUPPORT = 'support',
  HONORARY = 'honorary',
}

/**
 * Status razpoložljivosti (availability_status ENUM).
 */
export enum AvailabilityStatus {
  AVAILABLE = 'available',
  AT_HOME = 'at_home',
  AT_WORK = 'at_work',
  ON_LEAVE = 'on_leave',
  SICK = 'sick',
  UNAVAILABLE = 'unavailable',
}
