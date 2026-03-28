import { SetMetadata } from '@nestjs/common';
import { employeeRoleEnum } from 'src/db/schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (typeof employeeRoleEnum.enumValues[number] | 'ANY_EMPLOYEE' | 'CUSTOMER')[]) => 
  SetMetadata(ROLES_KEY, roles);
