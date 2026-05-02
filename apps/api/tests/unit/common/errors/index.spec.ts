import {
  AppError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  InternalError,
} from '@/common/errors';

describe('AppError', () => {
  it('sets code, message, statusCode, and name', () => {
    const err = new AppError('SOME_CODE', 'something went wrong', 418);
    expect(err.code).toBe('SOME_CODE');
    expect(err.message).toBe('something went wrong');
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe('AppError');
  });

  it('preserves instanceof chain', () => {
    const err = new AppError('X', 'msg', 500);
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('stores optional details and fieldErrors', () => {
    const err = new AppError('X', 'msg', 422, { foo: 'bar' }, { email: ['required'] });
    expect(err.details).toEqual({ foo: 'bar' });
    expect(err.fieldErrors).toEqual({ email: ['required'] });
  });
});

describe('NotFoundError', () => {
  it('uses defaults', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
  });

  it('accepts custom message', () => {
    const err = new NotFoundError('Tenant not found');
    expect(err.message).toBe('Tenant not found');
  });

  it('is instanceof AppError', () => {
    expect(new NotFoundError() instanceof AppError).toBe(true);
  });
});

describe('ForbiddenError', () => {
  it('uses defaults', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('UnauthorizedError', () => {
  it('uses defaults', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });
});

describe('ConflictError', () => {
  it('uses 409 and stores details', () => {
    const err = new ConflictError('Email taken', { field: 'email' });
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('ValidationError', () => {
  it('uses 422 and stores fieldErrors', () => {
    const err = new ValidationError('Invalid input', { name: ['too short'] });
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.fieldErrors).toEqual({ name: ['too short'] });
  });
});

describe('InternalError', () => {
  it('uses defaults', () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });
});
