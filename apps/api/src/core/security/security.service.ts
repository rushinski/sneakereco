import { Inject, Injectable } from '@nestjs/common';

import type { Env } from '../config';
import { ENVIRONMENT } from '../config/config.module';

@Injectable()
export class SecurityService {
  constructor(@Inject(ENVIRONMENT) private readonly env: Env) {}

  getRequestIdHeader() {
    return this.env.REQUEST_ID_HEADER;
  }

  getCorrelationIdHeader() {
    return this.env.CORRELATION_ID_HEADER;
  }
}