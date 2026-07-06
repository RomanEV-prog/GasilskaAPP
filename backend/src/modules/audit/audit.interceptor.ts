import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Globalni audit interceptor — po uspešni mutaciji (POST/PATCH/PUT/DELETE)
 * zapiše dogodek v audit_logs. Prijava se ne logira (ni mutacija podatkov,
 * telo vsebuje geslo — čeprav bi ga redaction prestregel).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const action = METHOD_TO_ACTION[request.method];

    // Samo mutacije; login/forgot/reset preskočimo.
    const path: string = request.url ?? '';
    const skip =
      !action ||
      path.includes('/auth/login') ||
      path.includes('/auth/forgot-password') ||
      path.includes('/auth/reset-password');

    if (skip) {
      return next.handle();
    }

    // Segment za globalnim prefixom: /api/v1/<entity>/...
    const entity =
      path.replace(/^\/api\/v1\//, '').split(/[/?]/)[0] || 'unknown';

    return next.handle().pipe(
      tap((response) => {
        const paramId = request.params?.id;
        const responseId = response && typeof response === 'object' ? response.id : undefined;
        const entityId = [paramId, responseId].find(
          (v) => typeof v === 'string' && UUID_RE.test(v),
        );

        // fire-and-forget — AuditService napake pogoltne
        void this.auditService.log({
          organizationId: request.user?.organizationId,
          userId: request.user?.userId,
          action,
          entity,
          entityId,
          newData:
            request.body && Object.keys(request.body).length > 0
              ? request.body
              : undefined,
          ipAddress: request.ip,
        });
      }),
    );
  }
}
