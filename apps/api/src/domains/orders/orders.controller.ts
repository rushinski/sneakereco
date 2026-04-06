import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {}
