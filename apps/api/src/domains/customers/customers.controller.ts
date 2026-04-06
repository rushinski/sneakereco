import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('customers')
@Controller({ path: 'customers', version: '1' })
export class CustomersController {}
