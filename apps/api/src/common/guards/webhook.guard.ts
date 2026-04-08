import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export const WEBHOOK_SECRET_KEY = 'webhookSecret';

/**
 * Marks a controller or handler as a webhook endpoint and provides the header
 * name used to carry the HMAC signature.
 *
 * The guard itself does NOT look up the secret — the controller/service must
 * attach the resolved secret to `request.webhookSecret` before the guard runs.
 * In practice this means the webhook controller resolves the tenant-specific
 * secret (from SSM) and sets it on the request object via a preceding
 * middleware or an early step in the handler.
 *
 * @example
 * ```ts
 * @WebhookAuth('x-payrilla-signature')
 * @Post('webhooks/payrilla')
 * handlePayrilla(@Req() req: Request) { ... }
 * ```
 */
import { SetMetadata } from '@nestjs/common';
export const WEBHOOK_SIGNATURE_HEADER_KEY = 'webhookSignatureHeader';
export const WebhookAuth = (signatureHeader: string) =>
  SetMetadata(WEBHOOK_SIGNATURE_HEADER_KEY, signatureHeader);

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const signatureHeader = this.reflector.getAllAndOverride<string | undefined>(
      WEBHOOK_SIGNATURE_HEADER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Not a webhook-decorated route — skip
    if (!signatureHeader) return true;

    const request = context.switchToHttp().getRequest<
      Request & {
        rawBody?: Buffer;
        webhookSecret?: string;
      }
    >();

    const secret = request.webhookSecret;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret not resolved');
    }

    const signature = request.headers[signatureHeader.toLowerCase()];
    if (!signature || typeof signature !== 'string') {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException(
        'Raw body not available — enable rawBody in NestFactory.create options',
      );
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expected, 'utf-8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}