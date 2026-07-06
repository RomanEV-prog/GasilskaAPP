import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit guard s slovenskim sporočilom (429).
 * V testnem okolju (NODE_ENV=test) je izklopljen, da E2E testi ne zadenejo meje.
 */
@Injectable()
export class GasilThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return process.env.NODE_ENV === 'test';
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      'Preveč zahtev. Počakajte trenutek in poskusite znova.',
    );
  }
}
