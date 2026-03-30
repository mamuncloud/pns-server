import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { MailsService } from '../mails/mails.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import * as crypto from 'crypto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly mailsService: MailsService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async requestStaffLogin(identifier: string) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+?[0-9]{10,15}$/.test(identifier.replace(/\s/g, ''));

    if (!isEmail && !isPhone) {
      throw new UnauthorizedException('Please enter a valid email address or phone number.');
    }

    // 1. Check if employee exists
    let employee;
    if (isEmail) {
      employee = await this.db.query.employees.findFirst({
        where: eq(schema.employees.email, identifier),
      });
    } else {
      // Normalize phone for lookup
      let normalizedPhone = identifier.replace(/\D/g, '');
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '62' + normalizedPhone.slice(1);
      } else if (!normalizedPhone.startsWith('62')) {
        normalizedPhone = '62' + normalizedPhone;
      }

      employee = await this.db.query.employees.findFirst({
        where: eq(schema.employees.phone, normalizedPhone),
      });
    }

    if (!employee) {
      // For security, return generic message but log warning
      this.logger.warn(`Login attempt for non-existent staff identifier: ${identifier}`);
      return { 
        message: `If you are registered, a login link will be sent to your ${isEmail ? 'email' : 'WhatsApp'}.`,
        type: isEmail ? 'EMAIL' : 'WHATSAPP'
      };
    }

    // 2. Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // 3. Store token
    await this.db.insert(schema.authTokens).values({
      employeeId: employee.id,
      token,
      expiresAt,
    });

    // 4. Send link
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/verify?token=${token}`;
    const userName = employee.name || 'Staff';

    if (isEmail) {
      await this.mailsService.sendMagicLink(identifier, magicLink, userName);
    } else {
      const message = `Halo ${userName}! 👋\n\nBerikut adalah link login magic link Anda untuk masuk ke sistem PNS:\n\n${magicLink}\n\nLink ini akan kadaluarsa dalam 15 menit.`;
      await this.whatsappService.sendMessage(identifier, message);
    }

    return { 
      message: `If you are registered, a login link will be sent to your ${isEmail ? 'email' : 'WhatsApp'}.`,
      type: isEmail ? 'EMAIL' : 'WHATSAPP'
    };
  }

  async requestLogin(email: string) {
    // Keep for potential legacy use or public users
    return this.requestStaffLogin(email);
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
      }
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
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
    await this.db.update(schema.refreshTokens)
      .set({ 
        token: newRefreshToken, 
        expiresAt: newExpiresAt,
        createdAt: new Date() 
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
