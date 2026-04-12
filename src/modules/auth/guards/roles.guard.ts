import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, method, url } = request;

    if (!user) {
      this.logger.warn(
        `Access denied [${method} ${url}]: No user found in request context for ${context.getHandler().name}`,
      );
      return false;
    }

    // Role-based fallback for ANY_EMPLOYEE to handle outdated tokens
    const isEmployeeRole = ['MANAGER', 'CASHIER'].includes(user.role);

    // Check if the user is an employee generally if 'ANY_EMPLOYEE' is specified
    if (requiredRoles.includes('ANY_EMPLOYEE') && (user.type === 'EMPLOYEE' || isEmployeeRole)) {
      return true;
    }

    // Check specific roles (MANAGER, CASHIER, CUSTOMER)
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied [${method} ${url}] for user ${user.id}: Required: [${requiredRoles.join(', ')}], Found: ${JSON.stringify(user)}`,
      );
    }

    return hasRole;
  }
}
