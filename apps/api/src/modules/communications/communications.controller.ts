import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('communications')
@Controller({ path: 'communications', version: '1' })
export class CommunicationsController {}