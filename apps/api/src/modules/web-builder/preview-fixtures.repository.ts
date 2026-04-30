import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

@Injectable()
export class PreviewFixturesRepository {
  private readonly fixtures = [
    { id: generateId('previewStateFixture'), surface: 'auth', stateKey: 'default_sign_in' },
    { id: generateId('previewStateFixture'), surface: 'auth', stateKey: 'validation_error' },
    { id: generateId('previewStateFixture'), surface: 'auth', stateKey: 'otp_sent' },
    { id: generateId('previewStateFixture'), surface: 'email', stateKey: 'verification_code' },
    { id: generateId('previewStateFixture'), surface: 'admin_shell', stateKey: 'desktop' },
    { id: generateId('previewStateFixture'), surface: 'admin_shell', stateKey: 'tablet' },
    { id: generateId('previewStateFixture'), surface: 'admin_shell', stateKey: 'mobile' },
  ];

  async listBySurface(surface: string) {
    return this.fixtures.filter((fixture) => fixture.surface === surface);
  }
}