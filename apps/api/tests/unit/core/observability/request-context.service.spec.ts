import { RequestContextService } from '../../../../src/core/observability/logging/request-context.service';

describe('RequestContextService', () => {
  it('stores and returns the active request context', () => {
    const service = new RequestContextService();

    service.run(
      {
        requestId: 'req_123',
        correlationId: 'corr_123',
      },
      () => {
        expect(service.get()).toEqual({
          requestId: 'req_123',
          correlationId: 'corr_123',
        });
      },
    );
  });
});