import { InternalServerErrorException } from '@nestjs/common';
import {
  AdminGetUserCommand,
  type CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

import { throwCognitoError } from './cognito-error.mapper';

export async function getCognitoUserSub(
  client: CognitoIdentityProviderClient,
  params: { email: string; userPoolId: string; missingSubMessage?: string },
): Promise<string> {
  try {
    const response = await client.send(
      new AdminGetUserCommand({
        UserPoolId: params.userPoolId,
        Username: params.email,
      }),
    );

    const sub = response.UserAttributes?.find((attribute) => attribute.Name === 'sub')?.Value;

    if (!sub) {
      throw new InternalServerErrorException(
        params.missingSubMessage ?? 'Cognito user sub not found',
      );
    }

    return sub;
  } catch (error) {
    if (error instanceof InternalServerErrorException) {
      throw error;
    }

    throwCognitoError(error);
  }
}
