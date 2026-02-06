import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  UploadDocumentsDto,
  CustomerAuthResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
} from './dto/public-auth.dto';
import { CustomerJwtPayload } from './guards/customer-jwt.strategy';

@Injectable()
export class PublicAuthService {
  private readonly logger = new Logger(PublicAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterCustomerDto): Promise<CustomerAuthResponseDto> {
    // Check if email already exists
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create customer with optional licenseExpiry (set a far future date as placeholder)
    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        isVerified: false,
        licenseExpiry: new Date('2099-12-31'), // Placeholder, will be updated when documents uploaded
        // tenantId is null for marketplace customers
      },
    });

    // Generate JWT
    const token = this.generateToken(customer);

    // Send verification email (non-blocking)
    this.sendVerificationEmail(customer.id, customer.email)
      .catch((err) => this.logger.error(`Failed to send verification email to ${customer.email}: ${err}`));

    return {
      accessToken: token,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        isVerified: customer.isVerified,
      },
    };
  }

  async login(dto: LoginCustomerDto): Promise<CustomerAuthResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (customer.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isValid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(customer);

    return {
      accessToken: token,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        isVerified: customer.isVerified,
      },
    };
  }

  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        city: true,
        address: true,
        country: true,
        licenseNumber: true,
        licenseExpiry: true,
        idCardNumber: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        city: dto.city,
        address: dto.address,
      },
    });

    return customer;
  }

  async uploadDocuments(customerId: string, dto: UploadDocumentsDto) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        licenseNumber: dto.licenseNumber,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
        idCardNumber: dto.idCardNumber,
      },
    });

    return customer;
  }

  async getBookingHistory(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          customer: { id: customerId },
          deletedAt: null,
        },
        include: {
          vehicle: {
            select: {
              brand: true,
              model: true,
              category: true,
              photos: true,
            },
          },
          tenant: {
            select: {
              name: true,
              companyName: true,
            },
          },
          pickupBranch: {
            select: {
              name: true,
              city: true,
              address: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({
        where: {
          customer: { id: customerId },
          deletedAt: null,
        },
      }),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async requestPasswordReset(dto: ResetPasswordRequestDto): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    // Don't reveal if email exists
    if (!customer) return;

    // Generate reset token (simplified - in production, use a separate table)
    const resetToken = this.jwtService.sign(
      { sub: customer.id, type: 'customer-reset' },
      { expiresIn: '1h' },
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(
      customer.email,
      resetToken,
      `${customer.firstName} ${customer.lastName}`,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    try {
      const payload = this.jwtService.verify(dto.token);
      if (payload.type !== 'customer-reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const passwordHash = await bcrypt.hash(dto.newPassword, 12);

      await this.prisma.customer.update({
        where: { id: payload.sub },
        data: { passwordHash },
      });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  private generateToken(customer: { id: string; email: string }): string {
    const payload: CustomerJwtPayload = {
      sub: customer.id,
      email: customer.email,
      type: 'customer',
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });
  }

  private async sendVerificationEmail(customerId: string, email: string) {
    const token = this.jwtService.sign(
      { sub: customerId, type: 'customer-verify' },
      { expiresIn: '24h' },
    );

    const verifyUrl = `${this.configService.get('FRONTEND_URL')}/customer/verify?token=${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Verify your email',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`,
    });
  }
}
