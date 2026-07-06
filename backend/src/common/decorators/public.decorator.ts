import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Označi endpoint kot javen (brez JWT avtentikacije).
 * Uporaba: `@Public()` nad login/register.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
