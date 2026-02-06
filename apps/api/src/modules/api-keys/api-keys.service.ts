import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyFilterDto } from './dto/api-keys.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, data: CreateApiKeyDto, userId: string) {
    // Generate API key
    const keyPrefix = 'fp_'; // carrental prefix
    const rawKey = `${keyPrefix}${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPreview = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        keyHash,
        keyPreview,
        scopes: data.scopes || ['all'],
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        allowedIps: data.allowedIps || [],
        rateLimit: data.rateLimit || 1000,
        createdById: userId,
      },
    });

    await this.auditService.log(
      tenantId,
      'CREATE_API_KEY',
      'ApiKey',
      apiKey.id,
      userId,
      null,
      { name: data.name, scopes: data.scopes },
    );

    // Return the raw key only once - it cannot be retrieved again
    return {
      ...apiKey,
      key: rawKey,
      message: 'Save this key securely. It will not be shown again.',
    };
  }

  async findAll(tenantId: string, filters: ApiKeyFilterDto) {
    const where: any = { tenantId };

    if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        keyPreview: true,
        scopes: true,
        expiresAt: true,
        allowedIps: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPreview: true,
        scopes: true,
        expiresAt: true,
        allowedIps: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async update(tenantId: string, id: string, data: UpdateApiKeyDto, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const oldValues = { ...apiKey };

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPreview: true,
        scopes: true,
        expiresAt: true,
        allowedIps: true,
        rateLimit: true,
        isActive: true,
      },
    });

    await this.auditService.log(
      tenantId,
      'UPDATE_API_KEY',
      'ApiKey',
      id,
      userId,
      oldValues,
      updated,
    );

    return updated;
  }

  async revoke(tenantId: string, id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });

    await this.auditService.log(
      tenantId,
      'REVOKE_API_KEY',
      'ApiKey',
      id,
      userId,
      { isActive: true },
      { isActive: false },
    );
  }

  async remove(tenantId: string, id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id } });

    await this.auditService.log(
      tenantId,
      'DELETE_API_KEY',
      'ApiKey',
      id,
      userId,
      apiKey,
      null,
    );
  }

  async regenerate(tenantId: string, id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Generate new key
    const keyPrefix = 'fp_';
    const rawKey = `${keyPrefix}${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPreview = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`;

    await this.prisma.apiKey.update({
      where: { id },
      data: { keyHash, keyPreview },
    });

    await this.auditService.log(
      tenantId,
      'REGENERATE_API_KEY',
      'ApiKey',
      id,
      userId,
      null,
      { regenerated: true },
    );

    return {
      id,
      key: rawKey,
      keyPreview,
      message: 'Key regenerated. Save this key securely. It will not be shown again.',
    };
  }

  // Validate API key for external API access
  async validateApiKey(rawKey: string, requiredScope: string, clientIp?: string) {
    // Find keys that match the prefix
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        tenant: { select: { id: true, isActive: true } },
      },
    });

    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(rawKey, apiKey.keyHash);
      
      if (isValid) {
        // Check tenant status
        if (!apiKey.tenant.isActive) {
          throw new UnauthorizedException('Tenant is not active');
        }

        // Check IP whitelist
        if (apiKey.allowedIps && apiKey.allowedIps.length > 0 && clientIp) {
          if (!apiKey.allowedIps.includes(clientIp)) {
            throw new UnauthorizedException('IP address not allowed');
          }
        }

        // Check scope
        const hasScope = apiKey.scopes.includes('all') || apiKey.scopes.includes(requiredScope);
        if (!hasScope) {
          throw new UnauthorizedException('Insufficient permissions');
        }

        // Update usage stats
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 },
          },
        });

        return {
          tenantId: apiKey.tenantId,
          apiKeyId: apiKey.id,
          scopes: apiKey.scopes,
        };
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  async getUsageStats(tenantId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }
}
