import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getRoles() {
    return this.prisma.userRole.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(createUserDto: CreateUserDto, tenantId: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Verify role exists
    const role = await this.prisma.userRole.findUnique({
      where: { id: createUserDto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        roleId: createUserDto.roleId,
        tenantId,
      },
      include: { role: true },
    });

    // Remove password from response
    const { password, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto, tenantId: string) {
    // Verify user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: any = {};

    if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.roleId) {
      // Verify role exists
      const role = await this.prisma.userRole.findUnique({
        where: { id: updateUserDto.roleId },
      });
      if (!role) {
        throw new BadRequestException('Invalid role');
      }
      updateData.roleId = updateUserDto.roleId;
    }
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: string, tenantId: string, currentUserId: string) {
    // Prevent self-deletion
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    // Verify user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
