import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../modules/organizations/organization.entity';
import { ALLOW_EXPIRED_KEY } from '../decorators/allow-expired.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SystemRole } from '../enums/roles.enum';
import { isExpired } from '../utils/subscription.util';

/** Metode, ki podatkov ne spreminjajo — po poteku ostanejo dovoljene. */
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Po poteku naročnine društva dovoli samo branje.
 *
 * Društvo ne izgubi ničesar — vsi podatki ostanejo vidni, blokirano je le
 * ustvarjanje in spreminjanje. Odklene se z unovčenjem nove aktivacijske
 * kode (`POST /organizations/me/redeem-code`, označen z `@AllowExpired`).
 *
 * Namenoma poizveduje v bazo ob vsaki spreminjajoči zahtevi namesto branja
 * iz JWT: rok poteka se ob podaljšanju spremeni takoj, žeton pa bi bil star
 * do enega dneva. Spreminjajočih zahtev je malo, poizvedba je po primarnem
 * ključu.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_EXPIRED_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (READ_ONLY_METHODS.has(request.method)) {
      return true;
    }

    const user = request.user;
    if (!user?.organizationId) {
      return true;
    }
    // Upravitelj platforme mora priti do podaljšanja tudi v poteklem društvu.
    if ((user.roles ?? []).includes(SystemRole.SUPER_ADMIN)) {
      return true;
    }

    const org = await this.orgsRepo.findOne({
      where: { id: user.organizationId },
      select: { id: true, subscriptionExpiresAt: true },
    });
    if (!isExpired(org?.subscriptionExpiresAt)) {
      return true;
    }

    // 402 Payment Required — vmesnik po tej kodi loči potek naročnine od
    // navadne prepovedi (403) in prikaže pasico s podaljšanjem.
    throw new HttpException(
      'Naročnina društva je potekla, zato je dostop samo za branje. ' +
        'Za podaljšanje vnesite novo aktivacijsko kodo v Nastavitvah.',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
