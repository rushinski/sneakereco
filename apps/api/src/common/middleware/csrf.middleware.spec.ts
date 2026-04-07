import type { NextFunction, Request, Response } from 'express';

import { CsrfMiddleware } from './csrf.middleware';

function createNext(): jest.MockedFunction<NextFunction> {
  return jest.fn();
}

describe('CsrfMiddleware', () => {
  const middleware = new CsrfMiddleware();

  it('skips safe methods', () => {
    const next = createNext();

    middleware.use({ method: 'GET' } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('skips non-browser requests with no origin header', () => {
    const next = createNext();

    middleware.use({ headers: {}, method: 'POST' } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects requests with mismatched csrf values', () => {
    const next = createNext();

    middleware.use(
      {
        cookie: 'csrf_token=cookie-token',
        headers: {
          cookie: 'csrf_token=cookie-token',
          origin: 'https://sneakereco.com',
          'x-csrf-token': 'header-token',
        },
        method: 'POST',
      } as unknown as Request,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('allows requests with matching csrf header and cookie', () => {
    const next = createNext();

    middleware.use(
      {
        headers: {
          cookie: 'csrf_token=matching-token',
          origin: 'https://sneakereco.com',
          'x-csrf-token': 'matching-token',
        },
        method: 'POST',
      } as unknown as Request,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });
});
