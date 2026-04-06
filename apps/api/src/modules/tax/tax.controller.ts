import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('tax')
@Controller({ path: 'tax', version: '1' })
export class TaxController {}
