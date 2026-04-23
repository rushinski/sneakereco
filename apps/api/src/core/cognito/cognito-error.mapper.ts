import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CognitoIdentityProviderServiceException,
  CodeMismatchException,
  ExpiredCodeException,
  LimitExceededException,
  NotAuthorizedException,
  UserNotConfirmedException,
  UserNotFoundException,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';

export function throwCognitoError(error: unknown): never {
  if (error instanceof NotAuthorizedException) {
    throw new UnauthorizedException('Invalid email or password');
  }
  if (error instanceof UserNotConfirmedException) {
    throw new BadRequestException(
      'Email not confirmed. Check your inbox or request a new code at POST /v1/auth/confirm/resend',
    );
  }
  if (error instanceof UserNotFoundException) {
    throw new NotFoundException('User not found');
  }
  if (error instanceof UsernameExistsException) {
    throw new ConflictException('An account with this email already exists');
  }
  if (error instanceof CodeMismatchException) {
    throw new BadRequestException('Invalid code');
  }
  if (error instanceof ExpiredCodeException) {
    throw new BadRequestException('Code has expired');
  }
  if (error instanceof LimitExceededException) {
    throw new BadRequestException('Request limit exceeded. Try again later.');
  }
  if (error instanceof CognitoIdentityProviderServiceException) {
    throw new InternalServerErrorException('Authentication service error');
  }

  throw error;
}
