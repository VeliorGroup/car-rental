import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto, DocumentEntityType } from './dto/documents.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        expiryDate: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException('Invalid file type'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.create(req.user.tenantId, data, file, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  async findAll(@Req() req: any, @Query() filters: DocumentFilterDto) {
    return this.documentsService.findAll(req.user.tenantId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  async getStats(@Req() req: any) {
    return this.documentsService.getStats(req.user.tenantId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring documents' })
  async getExpiring(@Req() req: any, @Query('days') days?: string) {
    return this.documentsService.getExpiringDocuments(
      req.user.tenantId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get documents for a specific entity' })
  async findByEntity(
    @Req() req: any,
    @Param('entityType') entityType: DocumentEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.documentsService.findByEntity(req.user.tenantId, entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateDocumentDto,
  ) {
    return this.documentsService.update(req.user.tenantId, id, data, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.remove(req.user.tenantId, id, req.user.id);
  }
}
