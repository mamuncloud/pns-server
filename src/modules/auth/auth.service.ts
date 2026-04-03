import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { MailsService } from '../mails/mails.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { eq, and, gt, or } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly mailsService: MailsService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async requestLogin(identifier: string) {
    const isEmail = identifier.includes('@');
    const isPhone = /^[0-9+\-\s()]+$/.test(identifier);
    const channel = isEmail ? 'email' : isPhone ? 'phone' : null;

    if (!channel) {
      throw new BadRequestException(
        'Invalid identifier. Please provide a valid email or phone number.',
      );
    }

    const employee = await this.db.query.employees.findFirst({
      where: or(
        eq(schema.employees.email, identifier.toLowerCase()),
        eq(schema.employees.phone, identifier),
      ),
    });

    const user = !employee
      ? await this.db.query.users.findFirst({
          where: or(
            eq(schema.users.email, identifier.toLowerCase()),
            eq(schema.users.phone, identifier),
          ),
        })
      : null;

    if (!employee && !user) {
      this.logger.warn(`Login attempt for non-existent identifier: ${identifier}`);
      return { message: 'If you are registered, a login link will be sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.db.insert(schema.authTokens).values({
      employeeId: employee?.id || null,
      userId: user?.id || null,
      token,
      channel,
      expiresAt,
    });

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/staff/verify?token=${token}`;
    const userName = employee?.name || user?.name || 'User';

    if (channel === 'email') {
      const deliveryEmail = employee?.email || user?.email;
      if (deliveryEmail) {
        await this.mailsService.sendMagicLink(deliveryEmail, magicLink, userName);
      }
    } else if (channel === 'phone') {
      const phone = employee?.phone || user?.phone;
      if (phone) {
        this.whatsappService.sendMagicLink(phone, magicLink, userName).catch((err) => {
          this.logger.error(`Error sending WhatsApp magic link: ${err.message}`);
        });
      }
    }

    return { message: 'If you are registered, a login link will be sent.' };
  }

  async verifyLogin(token: string) {
    // 1. Find token
    const storedToken = await this.db.query.authTokens.findFirst({
      where: and(eq(schema.authTokens.token, token), gt(schema.authTokens.expiresAt, new Date())),
      with: {
        employee: true,
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // 2. Determine entity
    let entity: {
      id: string;
      email: string | null;
      name: string | null;
      role: string;
      type: 'EMPLOYEE' | 'USER';
    } | null = null;

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

    // 3. Delete auth token after use
    await this.db.delete(schema.authTokens).where(eq(schema.authTokens.id, storedToken.id));

    // 4. Generate JWT payload
    const payload = {
      sub: entity.id,
      email: entity.email,
      role: entity.role,
      name: entity.name,
      type: entity.type,
    };

    // 5. Generate Access Token (Short-lived)
    const accessToken = this.jwtService.sign(payload);

    // 6. Generate Refresh Token (Long-lived, stored in DB)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days

    await this.db.insert(schema.refreshTokens).values({
      employeeId: entity.type === 'EMPLOYEE' ? entity.id : null,
      userId: entity.type === 'USER' ? entity.id : null,
      token: refreshToken,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: entity,
    };
  }

  async refresh(token: string) {
    // 1. Find and validate refresh token
    const storedToken = await this.db.query.refreshTokens.findFirst({
      where: and(
        eq(schema.refreshTokens.token, token),
        gt(schema.refreshTokens.expiresAt, new Date()),
      ),
      with: {
        employee: true,
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // 2. Determine entity
    let entity: {
      id: string;
      email: string | null;
      name: string | null;
      role: string;
      type: 'EMPLOYEE' | 'USER';
    } | null = null;

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
        role: 'CUSTOMER',
        type: 'USER',
      };
    }

    if (!entity) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    // 3. Optional: Refresh token rotation (generate new refresh token)
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update the existing refresh token with a new value and expiry
    await this.db
      .update(schema.refreshTokens)
      .set({
        token: newRefreshToken,
        expiresAt: newExpiresAt,
        createdAt: new Date(),
      })
      .where(eq(schema.refreshTokens.id, storedToken.id));

    // 4. Generate new Access Token
    const payload = {
      sub: entity.id,
      email: entity.email,
      role: entity.role,
      name: entity.name,
      type: entity.type,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
    };
  }

  async logout(token: string) {
    if (token) {
      await this.db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.token, token));
    }
    return { success: true };
  }
}
