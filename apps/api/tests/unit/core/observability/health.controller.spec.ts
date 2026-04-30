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
    );

    await expect(controller.getHealth()).resolves.toEqual({
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
    });
  });
});