import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('addresses')
@Controller({ path: 'addresses' })
export class AddressesController {}