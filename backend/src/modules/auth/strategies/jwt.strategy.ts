import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

/** Oblika JWT payloada, ki ga podpišemo ob prijavi. */
export interface JwtPayload {
  sub: string; // userId
  organizationId: string;
  username?: string;
  email?: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    // Brez skrivnosti se aplikacija NE sme zagnati (fail-closed) — passport-jwt
    // v novi različici tega upravičeno ne sprejme več kot undefined.
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET ni nastavljen — zagon zavrnjen.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
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
