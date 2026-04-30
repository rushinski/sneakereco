import { Controller, Get, Post, Query, UseGuards, Param, ForbiddenException } from '@nestjs/common';

import { OutboxRepository } from '../../core/events/outbox.repository';
import { CurrentPrincipal } from '../auth/shared/current-principal.decorator';
import { AuthPrincipalGuard } from '../auth/shared/auth-principal.guard';
import type { AuthPrincipal } from '../auth/shared/auth.types';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AuthPrincipalGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  @Get('events')
  async listEvents(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query('tenantId') tenantId?: string,
    @Query('eventName') eventName?: string,
  ) {
    const scopedTenantId =
      principal.actorType === 'tenant_admin' ? principal.tenantId : tenantId;

    return this.auditService.list({
      tenantId: scopedTenantId,
      eventName,
    });
  }

  @Get('dead-letters')
  async listDeadLetters(@CurrentPrincipal() principal: AuthPrincipal) {
    this.assertPlatformAdmin(principal);
    return this.outboxRepository.listFailed();
  }

  @Post('dead-letters/:eventId/replay')
  async replayDeadLetter(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('eventId') eventId: string,
  ) {
    this.assertPlatformAdmin(principal);
    const replayed = await this.outboxRepository.requeueFailed(eventId);
    return replayed ?? { status: 'not_found', eventId };
  }

  private assertPlatformAdmin(principal: AuthPrincipal) {
    if (principal.actorType !== 'platform_admin') {
      throw new ForbiddenException('Only platform admins can inspect or replay dead letters');
    }
  }
}