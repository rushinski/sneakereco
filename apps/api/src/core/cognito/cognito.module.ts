import { Global, Module } from '@nestjs/common';
import { CognitoClientProvider } from './cognito.client';

@Global()
@Module({
  providers: [CognitoClientProvider],
  exports: [CognitoClientProvider],
})
export class CognitoModule {}
