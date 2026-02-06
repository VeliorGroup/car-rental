import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailTemplateType } from '@prisma/client';

export { EmailTemplateType };

export class CreateEmailTemplateDto {
  @ApiProperty({ enum: EmailTemplateType })
  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML content with {{variable}} placeholders' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text version' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Available variables for this template' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EmailTemplateFilterDto {
  @ApiPropertyOptional({ enum: EmailTemplateType })
  @IsOptional()
  @IsEnum(EmailTemplateType)
  type?: EmailTemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class PreviewEmailDto {
  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: 'Sample data to preview with' })
  @IsOptional()
  @IsObject()
  sampleData?: Record<string, any>;
}

export class SendTestEmailDto {
  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiProperty()
  @IsString()
  recipientEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sampleData?: Record<string, any>;
}
