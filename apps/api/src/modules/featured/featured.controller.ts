import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('featured')
@Controller({ path: 'featured' })
export class FeaturedController {}
