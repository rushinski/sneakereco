import { HealthController } from '../../../../src/core/observability/health/health.controller';

describe('HealthController', () => {
  it('reports database, cache, queue, and worker heartbeat status', async () => {
    const controller = new HealthController(
      {
        appPool: {
          query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        },
      } as never,
      {
        ping: jest.fn().mockResolvedValue('PONG'),
      } as never,
      {
        ping: jest.fn().mockResolvedValue('PONG'),
      } as never,
      {
        getStatus: jest.fn().mockResolvedValue({
          status: 'ok',
          lastHeartbeatAt: '2026-04-28T12:00:00.000Z',
        }),
      } as never,
      {
        listPending: jest.fn().mockResolvedValue([]),
        listFailed: jest.fn().mockResolvedValue([]),
      } as never,
      {
        list: jest.fn().mockResolvedValue([]),
      } as never,
      {
        setGauge: jest.fn(),
        snapshot: jest.fn().mockReturnValue({
          counters: {},
          gauges: {},
        }),
      } as never,
      {
        hasValidOpsToken: jest.fn().mockReturnValue(true),
      } as never,
    );

    expect(controller.getHealth()).toEqual({
      status: 'ok',
    });

    await expect(controller.getReadiness('ops-token-test-1234')).resolves.toEqual({
      status: 'ok',
      checks: {
        database: 'ok',
        cache: 'PONG',
        queue: 'PONG',
        worker: {
          status: 'ok',
          lastHeartbeatAt: '2026-04-28T12:00:00.000Z',
        },
      },
      backlogs: {
        outboxPending: 0,
        outboxFailed: 0,
        sentEmails: 0,
      },
      metrics: {
        counters: {},
        gauges: {},
      },
    });
  });
});