import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth.types';

import { DisableMfaDtoSchema, type DisableMfaDto } from './disable-mfa.dto';
import { MfaLifecycleService } from './mfa-lifecycle.service';
import { VerifyMfaDtoSchema, type VerifyMfaDto } from './verify-mfa.dto';

@Controller('auth')
export class MfaLifecycleController {
  constructor(private readonly mfaLifecycleService: MfaLifecycleService) {}

  @Post('mfa/associate')
  @HttpCode(HttpStatus.OK)
  associate(
    @Headers('authorization') authorization: string | undefined,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.mfaLifecycleService.associate(this.getBearerToken(authorization));
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Body(new ZodValidationPipe(VerifyMfaDtoSchema)) dto: VerifyMfaDto,
    @Headers('authorization') authorization: string | undefined,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.mfaLifecycleService.verify(dto, this.getBearerToken(authorization));
  }

  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  enable(
    @Headers('authorization') authorization: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertCustomer(user, 'Only customers can enable MFA preferences');
    return this.mfaLifecycleService.enable(this.getBearerToken(authorization));
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  disable(
    @Body(new ZodValidationPipe(DisableMfaDtoSchema)) dto: DisableMfaDto,
    @Headers('authorization') authorization: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertCustomer(user, 'Only customers can disable MFA preferences');
    return this.mfaLifecycleService.disable(dto, this.getBearerToken(authorization));
  }

  private assertCustomer(user: AuthenticatedUser, message: string): void {
    if (user.userType !== 'customer') {
      throw new ForbiddenException(message);
    }
  }

  private getBearerToken(header: string | undefined): string {
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    return header.replace(/^Bearer\s+/i, '');
  }
}
