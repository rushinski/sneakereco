import { ConsoleLogger, Injectable } from '@nestjs/common';

import { RequestContextService } from './request-context.service';

export interface StructuredLogInput {
  eventName: string;
  metadata?: Record<string, unknown>;
  actorType?: string;
  actorId?: string;
  tenantId?: string;
  sessionId?: string;
}

@Injectable()
export class LoggerService extends ConsoleLogger {
  constructor(private readonly requestContextService: RequestContextService) {
    super();
  }

  override log(message: unknown, ...optionalParams: unknown[]) {
    super.log(this.serialize('info', String(message), this.getStructuredInput(optionalParams)));
  }

  override warn(message: unknown, ...optionalParams: unknown[]) {
    super.warn(this.serialize('warn', String(message), this.getStructuredInput(optionalParams)));
  }

  override error(message: unknown, ...optionalParams: unknown[]) {
    const [firstParam, secondParam] = optionalParams;
    const trace = typeof firstParam === 'string' ? firstParam : undefined;
    const context = this.getStructuredInput(
      trace ? [secondParam] : [firstParam],
    );
    super.error(this.serialize('error', String(message), context), trace);
  }

  private serialize(level: string, message: string, context?: StructuredLogInput) {
    const requestContext = this.requestContextService.get();

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      request_id: requestContext?.requestId,
      correlation_id: requestContext?.correlationId,
      actor_type: context?.actorType,
      actor_id: context?.actorId,
      tenant_id: context?.tenantId,
      session_id: context?.sessionId,
      event_name: context?.eventName,
      metadata: context?.metadata ?? {},
    });
  }

  private getStructuredInput(optionalParams: unknown[]) {
    const [firstParam] = optionalParams;
    return firstParam && typeof firstParam === 'object' ? (firstParam as StructuredLogInput) : undefined;
  }
}