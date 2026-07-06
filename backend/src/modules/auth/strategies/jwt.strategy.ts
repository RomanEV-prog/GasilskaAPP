import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

/** Oblika JWT payloada, ki ga podpišemo ob prijavi. */
export interface JwtPayload {
  sub: string; // userId
  organizationId: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /** Vrnjena vrednost postane `request.user`. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub || !payload?.organizationId) {
      throw new UnauthorizedException('Neveljaven žeton.');
    }
    return {
      userId: payload.sub,
      organizationId: payload.organizationId,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
