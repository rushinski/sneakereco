import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPrincipal = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ authPrincipal?: unknown }>();
  return request.authPrincipal;
});