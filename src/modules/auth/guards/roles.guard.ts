import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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

    const isEmployeeRole = ['MANAGER', 'CASHIER'].includes(user.role);

    if (requiredRoles.includes('ANY_EMPLOYEE') && (user.type === 'EMPLOYEE' || isEmployeeRole)) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied [${method} ${url}] for user ${user.id}: Required: [${requiredRoles.join(', ')}], Found: ${JSON.stringify(user)}`,
      );
    }

    return hasRole;
  }
}
