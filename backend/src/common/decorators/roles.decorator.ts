import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '../enums/roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Omeji dostop do endpointa na določene vloge.
 * Uporaba: `@Roles(SystemRole.ORG_ADMIN, SystemRole.PRESIDENT)`
 */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
