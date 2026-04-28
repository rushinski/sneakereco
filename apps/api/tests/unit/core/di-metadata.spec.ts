import 'reflect-metadata';

import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';

import { OriginResolverService } from '../../../src/common/services/origin-resolver.service';
import { DatabaseService } from '../../../src/core/database/database.service';
import { ValkeyService } from '../../../src/core/valkey/valkey.service';

describe('Nest DI metadata', () => {
  it('keeps runtime constructor tokens for ValkeyService dependencies', () => {
    const [configToken] = Reflect.getMetadata('design:paramtypes', ValkeyService) as unknown[];

    expect(configToken).toBe(ConfigService);
  });

  it('keeps runtime constructor tokens for OriginResolverService dependencies', () => {
    const tokens = Reflect.getMetadata(
      'design:paramtypes',
      OriginResolverService,
    ) as unknown[];

    expect(tokens).toEqual([ConfigService, DatabaseService, ValkeyService]);
  });
});
