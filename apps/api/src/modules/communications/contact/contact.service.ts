import { Injectable } from '@nestjs/common';
import { generateId } from '@sneakereco/shared';

import { ContactRepository } from './contact.repository';
import type { SubmitContactDto } from './dto/submit-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async submit(tenantId: string, dto: SubmitContactDto): Promise<{ received: true }> {
    await this.contactRepository.insert({
      id: generateId('contactMessage'),
      tenantId,
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });

    return { received: true };
  }
}
