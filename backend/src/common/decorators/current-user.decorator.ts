import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Vsebina JWT payloada, ki jo JwtStrategy prilepi na `request.user`.
 */
export interface AuthUser {
  userId: string;
  organizationId: string;
  email: string;
  roles: string[];
}

/**
 * Vrne prijavljenega uporabnika iz JWT (ali eno njegovo lastnost).
 * Uporaba:
 *   `@CurrentUser() user: AuthUser`
 *   `@CurrentUser('organizationId') orgId: string`
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
