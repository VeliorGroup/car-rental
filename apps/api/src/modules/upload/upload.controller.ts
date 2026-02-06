import { Controller, Post, UseInterceptors, UploadedFile, Req, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a file' })
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        const tenantId = req.tenant.id;
        return this.uploadService.uploadFile(tenantId, file);
    }
}
