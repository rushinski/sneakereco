import { EmailWorker } from '../../../src/workers/email/email.worker';

function makeEvent(name: string, payload: Record<string, unknown>) {
  return { id: `evt_${name}`, name, aggregateType: 'test', aggregateId: 'agg_1', occurredAt: new Date().toISOString(), status: 'pending' as const, payload };
}

const authEmailService = {
  sendSetupInvitation: jest.fn().mockResolvedValue(undefined),
};

const platformEmailService = {
  sendSubmissionNotifications: jest.fn().mockResolvedValue(undefined),
  sendDeniedNotification: jest.fn().mockResolvedValue(undefined),
  sendApprovedNotification: jest.fn().mockResolvedValue(undefined),
};

const outboxRepository = {
  markDispatched: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
};

function makeWorker(events: ReturnType<typeof makeEvent>[]) {
  const dispatcher = { listPending: jest.fn().mockResolvedValue(events) };
  return new EmailWorker(dispatcher as never, outboxRepository as never, authEmailService as never, platformEmailService as never);
}

beforeEach(() => jest.clearAllMocks());

describe('EmailWorker.drain', () => {
  it('dispatches tenant.setup.email.requested to sendSetupInvitation', async () => {
    const worker = makeWorker([
      makeEvent('tenant.setup.email.requested', { tenantId: 'tnt_1', email: 'admin@example.com', invitationToken: 'tok' }),
    ]);
    await worker.drain();
    expect(authEmailService.sendSetupInvitation).toHaveBeenCalledWith({ tenantId: 'tnt_1', toEmail: 'admin@example.com', invitationToken: 'tok' });
    expect(outboxRepository.markDispatched).toHaveBeenCalledWith('evt_tenant.setup.email.requested');
  });

  it('dispatches tenant.application.submission_email.requested', async () => {
    const worker = makeWorker([
      makeEvent('tenant.application.submission_email.requested', { requestedByName: 'Alice', requestedByEmail: 'alice@example.com', businessName: 'Kicks' }),
    ]);
    await worker.drain();
    expect(platformEmailService.sendSubmissionNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ requestedByName: 'Alice', businessName: 'Kicks' }),
    );
    expect(outboxRepository.markDispatched).toHaveBeenCalled();
  });

  it('dispatches tenant.application.approved to sendApprovedNotification', async () => {
    const worker = makeWorker([
      makeEvent('tenant.application.approved', { requestedByName: 'Alice', requestedByEmail: 'alice@example.com', businessName: 'Kicks', setupUrl: 'https://example.com/setup' }),
    ]);
    await worker.drain();
    expect(platformEmailService.sendApprovedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ requestedByName: 'Alice', setupUrl: 'https://example.com/setup' }),
    );
    expect(outboxRepository.markDispatched).toHaveBeenCalled();
  });

  it('marks event as failed when handler throws', async () => {
    authEmailService.sendSetupInvitation.mockRejectedValueOnce(new Error('SMTP down'));
    const worker = makeWorker([
      makeEvent('tenant.setup.email.requested', { tenantId: 'tnt_1', email: 'x@y.com', invitationToken: 'tok' }),
    ]);
    await worker.drain();
    expect(outboxRepository.markFailed).toHaveBeenCalledWith('evt_tenant.setup.email.requested', 'SMTP down');
  });

  it('skips unknown event names without marking failed', async () => {
    const worker = makeWorker([makeEvent('some.unknown.event', {})]);
    await worker.drain();
    expect(outboxRepository.markDispatched).not.toHaveBeenCalled();
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
  });
});
