import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto, DocumentEntityType } from './dto/documents.dto';
import { addDays } from 'date-fns';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    data: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verify entity exists and belongs to tenant
    await this.verifyEntityAccess(tenantId, data.entityType, data.entityId);

    // Upload file to storage
    const fileKey = await this.storageService.uploadBuffer(
      file.buffer,
      `documents/${tenantId}/${data.entityType}/${data.entityId}`,
      `${Date.now()}-${file.originalname}`,
      file.mimetype,
    );

    const document = await this.prisma.document.create({
      data: {
        tenantId,
        type: data.type,
        name: data.name,
        description: data.description,
        entityType: data.entityType,
        entityId: data.entityId,
        fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes,
        uploadedById: userId,
      },
    });

    await this.auditService.log(
      tenantId,
      'CREATE_DOCUMENT',
      'Document',
      document.id,
      userId,
      null,
      { type: data.type, entityType: data.entityType, entityId: data.entityId },
    );

    return document;
  }

  async findAll(tenantId: string, filters: DocumentFilterDto) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.type) where.type = filters.type;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { fileName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.expiringWithinDays) {
      const days = parseInt(filters.expiringWithinDays);
      const expiryDate = addDays(new Date(), days);
      where.expiryDate = {
        lte: expiryDate,
        gte: new Date(),
      };
    }

    const orderBy = { [filters.sortBy || 'createdAt']: filters.order || 'desc' };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    // Batch generate presigned URLs to avoid N+1
    const fileKeys = documents.map(d => d.fileKey).filter(Boolean);
    const urlMap = await this.storageService.getPresignedUrls(fileKeys, 3600);
    const documentsWithUrls = documents.map((doc) => ({
      ...doc,
      url: urlMap[doc.fileKey] || null,
    }));

    return { documents: documentsWithUrls, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Generate presigned URL
    try {
      const url = await this.storageService.getPresignedUrl(document.fileKey, 3600);
      return { ...document, url };
    } catch {
      return { ...document, url: null };
    }
  }

  async findByEntity(tenantId: string, entityType: DocumentEntityType, entityId: string) {
    const documents = await this.prisma.document.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    // Batch generate presigned URLs to avoid N+1
    const fileKeys = documents.map(d => d.fileKey).filter(Boolean);
    const urlMap = await this.storageService.getPresignedUrls(fileKeys, 3600);
    return documents.map((doc) => ({
      ...doc,
      url: urlMap[doc.fileKey] || null,
    }));
  }

  async update(tenantId: string, id: string, data: UpdateDocumentDto, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const oldValues = { ...document };

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });

    await this.auditService.log(
      tenantId,
      'UPDATE_DOCUMENT',
      'Document',
      id,
      userId,
      oldValues,
      updated,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete file from storage
    try {
      await this.storageService.delete(document.fileKey);
    } catch (error) {
      this.logger.warn(`Failed to delete file from storage: ${error.message}`);
    }

    await this.prisma.document.delete({ where: { id } });

    await this.auditService.log(
      tenantId,
      'DELETE_DOCUMENT',
      'Document',
      id,
      userId,
      document,
      null,
    );
  }

  async getExpiringDocuments(tenantId: string, days: number = 30) {
    const expiryDate = addDays(new Date(), days);

    return this.prisma.document.findMany({
      where: {
        tenantId,
        expiryDate: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getStats(tenantId: string) {
    const [total, byType, expiringSoon] = await Promise.all([
      this.prisma.document.count({ where: { tenantId } }),
      this.prisma.document.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { type: true },
      }),
      this.prisma.document.count({
        where: {
          tenantId,
          expiryDate: {
            lte: addDays(new Date(), 30),
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count.type])),
      expiringSoon,
    };
  }

  private async verifyEntityAccess(tenantId: string, entityType: DocumentEntityType, entityId: string) {
    let entity;

    switch (entityType) {
      case DocumentEntityType.VEHICLE:
        entity = await this.prisma.vehicle.findFirst({
          where: { id: entityId, tenantId },
        });
        break;
      case DocumentEntityType.CUSTOMER:
        entity = await this.prisma.customer.findFirst({
          where: { id: entityId, tenantId },
        });
        break;
      case DocumentEntityType.BOOKING:
        entity = await this.prisma.booking.findFirst({
          where: { id: entityId, tenantId },
        });
        break;
      case DocumentEntityType.TENANT:
        if (entityId !== tenantId) {
          throw new BadRequestException('Invalid tenant access');
        }
        return;
    }

    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }
  }
}
