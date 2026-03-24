import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async requestLogin(email: string) {
    // 1. Check if employee exists
    const employee = await this.db.query.employees.findFirst({
      where: eq(schema.employees.email, email),
    });

    // 2. Check if user exists (consumer)
    const user = !employee ? await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    }) : null;

    if (!employee && !user) {
      // For security reasons, don't reveal if the email exists
      this.logger.warn(`Login attempt for non-existent email: ${email}`);
      return { message: 'If you are registered, a login link will be sent to your email.' };
    }

    // 3. Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    // 4. Store token
    await this.db.insert(schema.authTokens).values({
      employeeId: employee?.id || null,
      userId: user?.id || null,
      token,
      expiresAt,
    });

    // 5. Send email (mock for now)
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/login/verify?token=${token}`;
    this.logger.log(`Magic link for ${email}: ${magicLink}`);
    
    return { message: 'If you are registered, a login link will be sent to your email.' };
  }

  async verifyLogin(token: string) {
    // 1. Find token
    const storedToken = await this.db.query.authTokens.findFirst({
      where: and(
        eq(schema.authTokens.token, token),
        gt(schema.authTokens.expiresAt, new Date()),
      ),
      with: {
        employee: true,
        user: true,
      }
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // 2. Determine entity
    let entity: { id: string; email: string | null; name: string | null; role: string; type: 'EMPLOYEE' | 'USER' } | null = null;

    if (storedToken.employee) {
      entity = {
        id: storedToken.employee.id,
        email: storedToken.employee.email,
        name: storedToken.employee.name,
        role: storedToken.employee.role,
        type: 'EMPLOYEE',
      };
    } else if (storedToken.user) {
      entity = {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: 'CUSTOMER', // Default role for consumers
        type: 'USER',
      };
    }

    if (!entity) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    // 3. Delete token after use
    await this.db.delete(schema.authTokens).where(eq(schema.authTokens.id, storedToken.id));

    // 4. Generate JWT
    const payload = {
      sub: entity.id,
      email: entity.email,
      role: entity.role,
      name: entity.name,
      type: entity.type,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: entity,
    };
  }
}
