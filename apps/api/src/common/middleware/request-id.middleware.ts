import { randomUUID } from 'crypto';

import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

type ReplyWithHeader = {
  header(name: string, value: string): void;
};

type Next = (error?: unknown) => void;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithHeaders, res: ReplyWithHeader, next: Next) {
    const incomingRequestId = req.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' ? incomingRequestId : incomingRequestId?.[0] ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    res.header('X-Request-ID', requestId);
    next();
  }
}
