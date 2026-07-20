/**
 * Sistemske vloge (SystemRole).
 * Ujemajo se z `system_role` ENUM v bazi (docs/DATABASE.md).
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  PRESIDENT = 'president',
  COMMANDER = 'commander',
  DEPUTY_COMMANDER = 'deputy_commander',
  SECRETARY = 'secretary',
  TREASURER = 'treasurer',
  YOUTH_MENTOR = 'youth_mentor',
  CHIEF_MACHINIST = 'chief_machinist',
  TOOLKEEPER = 'toolkeeper',
  BOARD_MEMBER = 'board_member',
  SUPERVISORY_BOARD_MEMBER = 'supervisory_board_member',
  ASSISTANT_BREATHING_APPARATUS = 'assistant_breathing_apparatus',
  ASSISTANT_COMMUNICATIONS = 'assistant_communications',
  ASSISTANT_FIRST_AID = 'assistant_first_aid',
  MEMBER = 'member',
}

/**
 * Vloge, ki smejo videti polne osebne podatke članov (telefon, naslov, rojstvo).
 * Navadni člani dobijo le ime, priimek, prijavno ime in status članstva.
 *
 * Zavestno ozko: funkcije (predsednik, tajnik ...) so po dogovoru s PGD Pekre
 * samo nazivi brez pravic, zato tudi imenika ne odpirajo.
 */
export const MEMBER_DIRECTORY_ROLES: SystemRole[] = [
  SystemRole.SUPER_ADMIN,
  SystemRole.ORG_ADMIN,
];

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
