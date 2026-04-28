import { Body, Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/auth.types';

import { TenantConfigService } from './tenant-config/tenant-config.service';
import { UpdateThemeDtoSchema, type UpdateThemeDto } from './dto/update-theme.dto';

/**
 * Tenant self-service settings — requires a store-admin JWT.
 * All routes are scoped to the tenant extracted from the access token.
 */
@ApiTags('tenant-settings')
@Controller('tenant')
export class TenantSettingsController {
  constructor(private readonly tenantConfig: TenantConfigService) {}

  /** Update the tenant's theme / branding configuration. */
  @Roles('store-admin')
  @Patch('theme')
  @HttpCode(HttpStatus.OK)
  async updateTheme(
    @Body(new ZodValidationPipe(UpdateThemeDtoSchema)) dto: UpdateThemeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.tenantId) {
      return { success: false };
    }
    await this.tenantConfig.updateTheme(user.tenantId, dto);
    return { success: true };
  }
}
