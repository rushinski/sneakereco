import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('shipping')
@Controller({ path: 'shipping', version: '1' })
export class ShippingController {}
