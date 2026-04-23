import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { tenants } from '@sneakereco/db';

import { CustomerRegisteredEvent } from '../../../common/events/auth.events';
import { DatabaseService } from '../../../core/database/database.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(
    private readonly email: EmailService,
    private readonly db: DatabaseService,
  ) {}

  @OnEvent('auth.customer.registered')
  async handleCustomerRegistered(event: CustomerRegisteredEvent): Promise<void> {
    try {
      const [tenant] = await this.db.systemDb
        .select({ name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, event.tenantId))
        .limit(1);

      if (!tenant) return;

      await this.email.sendCustomerWelcome({
        email: event.email,
        tenantName: tenant.name,
        from: this.email.resolveFromAddress(tenant.slug, 'auth'),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email email=${event.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
