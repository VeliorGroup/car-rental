import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createBranchDto: CreateBranchDto) {
    // Check if code already exists for this tenant
    const existing = await this.prisma.branch.findFirst({
      where: {
        tenantId,
        code: createBranchDto.code.toUpperCase(),
      },
    });

    if (existing) {
      throw new BadRequestException(`Branch with code ${createBranchDto.code} already exists`);
    }

    // If this is the first branch or isDefault is true, set as default
    const branchCount = await this.prisma.branch.count({ where: { tenantId } });
    const isDefault = branchCount === 0 || createBranchDto.isDefault;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.prisma.branch.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.create({
      data: {
        tenantId,
        name: createBranchDto.name,
        code: createBranchDto.code.toUpperCase(),
        address: createBranchDto.address,
        city: createBranchDto.city,
        country: createBranchDto.country || 'AL',
        phone: createBranchDto.phone,
        email: createBranchDto.email,
        isActive: createBranchDto.isActive ?? true,
        isDefault,
        openingHours: createBranchDto.openingHours ?? undefined,
        coordinates: createBranchDto.coordinates ?? undefined,
        notes: createBranchDto.notes,
      },
    });
  }

  async findAll(tenantId: string, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              vehicles: true,
              pickupBookings: true,
              dropoffBookings: true,
            },
          },
        },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      branches,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            vehicles: true,
            pickupBookings: true,
            dropoffBookings: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch not found`);
    }

    return branch;
  }

  async update(tenantId: string, id: string, updateBranchDto: UpdateBranchDto) {
    await this.findOne(tenantId, id);

    // If updating code, check for uniqueness
    if (updateBranchDto.code) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          tenantId,
          code: updateBranchDto.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException(`Branch with code ${updateBranchDto.code} already exists`);
      }
    }

    // If setting as default, unset other defaults
    if (updateBranchDto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { tenantId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        ...updateBranchDto,
        code: updateBranchDto.code?.toUpperCase(),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const branch = await this.findOne(tenantId, id);

    // Check if branch has vehicles
    const vehicleCount = await this.prisma.vehicle.count({
      where: { branchId: id },
    });

    if (vehicleCount > 0) {
      throw new BadRequestException(
        `Cannot delete branch with ${vehicleCount} vehicles. Move vehicles to another branch first.`,
      );
    }

    // Check if branch is default
    if (branch.isDefault) {
      throw new BadRequestException('Cannot delete the default branch. Set another branch as default first.');
    }

    return this.prisma.branch.delete({ where: { id } });
  }

  async getStats(tenantId: string, search?: string) {
    const where: any = { tenantId };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, active, vehiclesByBranch] = await Promise.all([
      this.prisma.branch.count({ where }),
      this.prisma.branch.count({ where: { ...where, isActive: true } }),
      this.prisma.branch.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { vehicles: true },
          },
        },
      }),
    ]);

    return {
      total,
      active,
      vehiclesByBranch: vehiclesByBranch.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        vehicleCount: b._count.vehicles,
      })),
    };
  }
}
