import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('shipping')
@Controller({ path: 'shipping' })
export class ShippingController {}
