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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailTemplatesService } from './email-templates.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateFilterDto,
  PreviewEmailDto,
  SendTestEmailDto,
} from './dto/email-templates.dto';

@ApiTags('email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  async create(@Req() req: any, @Body() data: CreateEmailTemplateDto) {
    return this.emailTemplatesService.create(req.user.tenantId, data, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all email templates' })
  async findAll(@Req() req: any, @Query() filters: EmailTemplateFilterDto) {
    return this.emailTemplatesService.findAll(req.user.tenantId, filters);
  }

  @Get('defaults')
  @ApiOperation({ summary: 'Get default email templates' })
  async getDefaults() {
    return this.emailTemplatesService.getDefaultTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email template by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.emailTemplatesService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update email template' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.update(req.user.tenantId, id, data, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete email template' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.emailTemplatesService.remove(req.user.tenantId, id, req.user.id);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview email template with sample data' })
  async preview(@Req() req: any, @Body() data: PreviewEmailDto) {
    return this.emailTemplatesService.preview(
      req.user.tenantId,
      data.templateId,
      data.sampleData,
    );
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test email' })
  async sendTest(@Req() req: any, @Body() data: SendTestEmailDto) {
    return this.emailTemplatesService.sendTestEmail(
      req.user.tenantId,
      data.templateId,
      data.recipientEmail,
      data.sampleData,
      req.user.id,
    );
  }
}
