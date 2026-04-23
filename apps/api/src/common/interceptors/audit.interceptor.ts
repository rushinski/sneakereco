import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';

/**
 * Captures audit-worthy events (state-changing requests by authenticated users)
 * and logs them. Once the audit_events table and repository are wired up,
 * this interceptor will persist events to the database.
 *
 * Only captures POST, PUT, PATCH, DELETE — reads are not audited.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  private static readonly AUDITABLE_METHODS = new Set([
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedUser }
    >();

    if (!AuditInterceptor.AUDITABLE_METHODS.has(request.method)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const user = request.user;

        if (!user) return;

        // TODO: Persist to audit_events table via AuditRepository
        this.logger.debug({
          action: `${request.method} ${request.url}`,
          tenantId: user.tenantId,
          userId: user.cognitoSub,
          role: user.userType,
          duration,
          requestId: request.headers['x-request-id'],
        });
      }),
    );
  }
}
