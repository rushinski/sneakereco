import { SetMetadata } from '@nestjs/common';
import type { UserType } from '../../modules/auth/auth.types';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);
