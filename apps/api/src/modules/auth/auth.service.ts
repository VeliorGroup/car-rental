import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import * as bcrypt from 'bcrypt';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const speakeasy = require('speakeasy');
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, RegisterDto, RegisterTenantDto, TwoFADto, TwoFAVerifyDto, TwoFADisableDto, ChangePasswordDto, ResetPasswordRequestDto, ResetPasswordDto, AuthResponseDto, TwoFASecretDto, UpdateProfileDto } from './dto/auth.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Log user activity
  private async logActivity(
    userId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    details?: any,
  ) {
    try {
      await this.prisma.userActivityLog.create({
        data: {
          userId,
          action,
          ipAddress,
          userAgent,
          details,
        },
      });
    } catch (error) {
      // Don't fail if logging fails
      this.logger.error('Failed to log activity:', error);
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, tenantId: string, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      // Log failed login attempt (find user by email for logging)
      const foundUser = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
      if (foundUser) {
        await this.logActivity(foundUser.id, 'LOGIN_FAILED', ipAddress, userAgent, { reason: 'Invalid credentials' });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if tenant is active
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant && !tenant.isActive) {
       await this.logActivity(user.id, 'LOGIN_BLOCKED', ipAddress, userAgent, { reason: 'Tenant subscription inactive' });
       throw new ForbiddenException('TENANT_INACTIVE');
    }

    if (user.is2FAEnabled) {
      if (!loginDto.totpCode) {
        return {
          access_token: '',
          user: undefined,
          requires2FA: true,
        };
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: loginDto.totpCode,
      });

      if (!isValid) {
        await this.logActivity(user.id, 'LOGIN_FAILED', ipAddress, userAgent, { reason: 'Invalid 2FA code' });
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Update lastLoginAt and log activity
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.logActivity(user.id, 'LOGIN', ipAddress, userAgent);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
      requires2FA: false,
    };
  }

  async register(registerDto: RegisterDto, tenantId: string): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        roleId: registerDto.roleId,
        tenantId,
      },
      include: { role: true },
    });

    const { password, ...result } = user;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: result as any,
    };
  }

  async registerTenant(dto: RegisterTenantDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate VAT number matches country
    if (dto.vatNumber && dto.country) {
      const { validateVatForCountry, formatVatNumber } = await import('../../common/utils/vat-validator');
      validateVatForCountry(dto.vatNumber, dto.country);
      dto.vatNumber = formatVatNumber(dto.vatNumber, dto.country);
    }

    // Generate subdomain
    let subdomain = dto.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });
    if (existingTenant) {
      subdomain = `${subdomain}-${Math.floor(Math.random() * 10000)}`;
    }

    // Transaction to create Tenant, Subscription, User
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Validate Referral Code if present
      let referrerId: string | null = null;
      if (dto.referralCode) {
        const referrer = await prisma.tenant.findUnique({
          where: { referralCode: dto.referralCode },
        });
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      // 2. Generate short, readable referral code (DN-XXXX format)
      const generateReferralCode = async (): Promise<string> => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: 0,1,I,O
        let code: string;
        let exists = true;
        
        while (exists) {
          const randomPart = Array.from({ length: 4 }, () => 
            chars.charAt(Math.floor(Math.random() * chars.length))
          ).join('');
          code = `DN-${randomPart}`;
          
          const existing = await prisma.tenant.findUnique({
            where: { referralCode: code },
          });
          exists = !!existing;
        }
        return code!;
      };
      
      const referralCode = await generateReferralCode();

      // 3. Create Tenant with short referral code
      const tenant = await prisma.tenant.create({
        data: {
          name: dto.companyName,
          companyName: dto.companyName,
          subdomain,
          vatNumber: dto.vatNumber,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          country: dto.country || 'AL',
          referralCode: referralCode, // Use generated short code
          referredBy: dto.referralCode,
        },
      });

      // 3. Create Referral Record if valid
      if (referrerId) {
        await prisma.referral.create({
          data: {
            referrerId: referrerId,
            referredId: tenant.id,
            status: 'PENDING',
          },
        });
      }

      // 4. Create Subscription - 14 day free trial with default plan
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial

      // Find default plan (starter or first available)
      const defaultPlan = await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (!defaultPlan) {
        throw new Error('No subscription plans available. Please seed plans.');
      }

      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: defaultPlan.id,
          status: 'TRIAL',
          interval: 'MONTHLY',
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
          trialEndsAt: trialEndsAt,
        },
      });

      // 3. Get Admin Role
      const adminRole = await prisma.userRole.findFirst({
        where: { name: 'ADMIN' },
      });

      if (!adminRole) {
        throw new Error('Admin role not found. Please seed roles.');
      }

      // 4. Create Admin User
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleId: adminRole.id,
          tenantId: tenant.id,
        },
        include: { role: true },
      });

      return { user, tenant };
    });

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role.name,
      tenantId: result.tenant.id,
    };

    const { password, ...userResult } = result.user;

    return {
      access_token: this.jwtService.sign(payload),
      user: userResult as any,
    };
  }

  async enable2FA(userId: string): Promise<TwoFASecretDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is2FAEnabled) {
      throw new BadRequestException('2FA already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: this.configService.get('TWO_FACTOR_ISSUER', 'Car Rental'),
    });

    // Generate QR code URL
    const qrCode = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.email,
      issuer: this.configService.get('TWO_FACTOR_ISSUER', 'Car Rental'),
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => uuidv4().replace(/-/g, '').substring(0, 8));

    // Store encrypted backup codes
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFASecret: secret.base32,
        backupCodes: backupCodes.map(code => bcrypt.hashSync(code, 10)),
      },
    });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  async verify2FA(userId: string, verifyDto: TwoFAVerifyDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token: verifyDto.totpCode,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2FAEnabled: true },
    });
  }

  async disable2FA(userId: string, disableDto: TwoFADisableDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.is2FAEnabled) {
      throw new BadRequestException('2FA not enabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(disableDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        is2FAEnabled: false,
        twoFASecret: null,
        backupCodes: [],
      },
    });
  }

  async useBackupCode(userId: string, backupCode: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.is2FAEnabled) {
      throw new UnauthorizedException('2FA not enabled');
    }

    // Check backup codes
    let validCode = false;
    for (const hashedCode of user.backupCodes) {
      if (await bcrypt.compare(backupCode, hashedCode)) {
        validCode = true;
        break;
      }
    }

    if (!validCode) {
      throw new UnauthorizedException('Invalid backup code');
    }

    // Remove used backup code
    const updatedCodes = [];
    for (const code of user.backupCodes) {
        if (!(await bcrypt.compare(backupCode, code))) {
            updatedCodes.push(code);
        }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes: updatedCodes },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user as any,
    };
  }

  async changePassword(userId: string, changeDto: ChangePasswordDto, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(changeDto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await bcrypt.hash(changeDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: newHashedPassword,
        passwordResetAt: new Date(),
      },
    });

    await this.logActivity(userId, 'PASSWORD_CHANGED', ipAddress, userAgent);
  }

  async requestPasswordReset(resetDto: ResetPasswordRequestDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: resetDto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate secure random token
    const token = uuidv4() + '-' + uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Delete any existing unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Create new reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send password reset email
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(user.email, token, resetUrl);

    await this.logActivity(user.id, 'PASSWORD_RESET_REQUESTED', undefined, undefined, { email: user.email });
  }

  async resetPassword(resetDto: ResetPasswordDto): Promise<void> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: resetDto.token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetDto.newPassword, 10);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          passwordResetAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.logActivity(resetToken.userId, 'PASSWORD_RESET_COMPLETED');
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateDto,
      include: { role: true },
    });
  }

  async getProfile(userId: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<{ avatar: string | null }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });
    return { avatar: user.avatar };
  }

  async removeAvatar(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });
  }
}