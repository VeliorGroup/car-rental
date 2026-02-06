import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantDto, CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async getReferralStats(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        referralCode: true,
        _count: {
          select: {
            referrals: {
              where: { status: 'QUALIFIED' }
            }
          }
        }
      }
    });

    return {
      referralCode: tenant?.referralCode,
      qualifiedReferrals: tenant?._count.referrals || 0,
    };
  }

  async regenerateReferralCode(id: string) {
    // Generate short, readable referral code (DN-XXXX format)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: 0,1,I,O
    let code: string;
    let exists = true;
    
    while (exists) {
      const randomPart = Array.from({ length: 4 }, () => 
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
      code = `DN-${randomPart}`;
      
      const existing = await this.prisma.tenant.findUnique({
        where: { referralCode: code },
      });
      exists = !!existing;
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { referralCode: code! },
      select: { referralCode: true },
    });
  }

  // Payment Methods
  async getPaymentMethods(tenantId: string) {
    return this.prisma.tenantPaymentMethod.findMany({
      where: { tenantId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
    });
  }

  async addPaymentMethod(tenantId: string, dto: CreatePaymentMethodDto) {
    // If this is the first payment method or isDefault is true, set it as default
    const existing = await this.prisma.tenantPaymentMethod.count({
      where: { tenantId },
    });

    const isDefault = dto.isDefault || existing === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.prisma.tenantPaymentMethod.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tenantPaymentMethod.create({
      data: {
        tenantId,
        cardType: dto.cardType,
        last4: dto.last4,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        isDefault,
      },
    });
  }

  async updatePaymentMethod(tenantId: string, id: string, dto: UpdatePaymentMethodDto) {
    const method = await this.prisma.tenantPaymentMethod.findFirst({
      where: { id, tenantId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (dto.isDefault) {
      await this.prisma.tenantPaymentMethod.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tenantPaymentMethod.update({
      where: { id },
      data: dto,
    });
  }

  async deletePaymentMethod(tenantId: string, id: string) {
    const method = await this.prisma.tenantPaymentMethod.findFirst({
      where: { id, tenantId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prisma.tenantPaymentMethod.delete({
      where: { id },
    });

    // If deleted method was default, set another one as default
    if (method.isDefault) {
      const another = await this.prisma.tenantPaymentMethod.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      if (another) {
        await this.prisma.tenantPaymentMethod.update({
          where: { id: another.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  async setDefaultPaymentMethod(tenantId: string, id: string) {
    const method = await this.prisma.tenantPaymentMethod.findFirst({
      where: { id, tenantId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset all defaults
    await this.prisma.tenantPaymentMethod.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.tenantPaymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
