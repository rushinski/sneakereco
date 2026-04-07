import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('tenants')
@Controller({ path: 'tenants' })
export class TenantsController {}
