import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

import { ContactService } from './contact.service';
import { SubmitContactDtoSchema, type SubmitContactDto } from './dto/submit-contact.dto';

@ApiTags('contact')
@Controller({ path: 'contact' })
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a contact form message' })
  @ApiResponse({ status: 201, description: 'Message received.' })
  submit(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(SubmitContactDtoSchema)) dto: SubmitContactDto,
  ) {
    return this.contactService.submit(tenantId, dto);
  }
}
