import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {}
