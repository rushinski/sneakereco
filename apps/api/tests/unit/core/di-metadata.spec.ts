import 'reflect-metadata';

import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';

import { RequestHostRepository } from '../../../src/common/routing/request-host.repository';
import { RequestHostResolverService } from '../../../src/common/routing/request-host-resolver.service';
import { ValkeyService } from '../../../src/core/valkey/valkey.service';

describe('Nest DI metadata', () => {
  it('keeps runtime constructor tokens for ValkeyService dependencies', () => {
    const tokens = Reflect.getMetadata('design:paramtypes', ValkeyService) as unknown[];

    expect(tokens).toHaveLength(1);
  });

  it('keeps runtime constructor tokens for RequestHostResolverService dependencies', () => {
    const tokens = Reflect.getMetadata(
      'design:paramtypes',
      RequestHostResolverService,
    ) as unknown[];

    expect(tokens).toEqual([ConfigService, RequestHostRepository, ValkeyService]);
  });
});
