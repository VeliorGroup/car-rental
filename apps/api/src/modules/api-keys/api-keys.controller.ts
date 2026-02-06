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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyFilterDto, API_KEY_SCOPES } from './dto/api-keys.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created. Key shown only once.' })
  async create(@Req() req: any, @Body() data: CreateApiKeyDto) {
    return this.apiKeysService.create(req.user.tenantId, data, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys' })
  async findAll(@Req() req: any, @Query() filters: ApiKeyFilterDto) {
    return this.apiKeysService.findAll(req.user.tenantId, filters);
  }

  @Get('scopes')
  @ApiOperation({ summary: 'Get available API key scopes' })
  getScopes() {
    return {
      scopes: API_KEY_SCOPES.map(scope => ({
        id: scope,
        name: scope.replace(':', ' ').replace(/_/g, ' '),
        description: this.getScopeDescription(scope),
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API key by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.apiKeysService.findOne(req.user.tenantId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get API key usage statistics' })
  async getStats(@Req() req: any, @Param('id') id: string) {
    return this.apiKeysService.getUsageStats(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update API key' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(req.user.tenantId, id, data, req.user.id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: 200, description: 'New key generated. Shown only once.' })
  async regenerate(@Req() req: any, @Param('id') id: string) {
    return this.apiKeysService.regenerate(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke API key' })
  async revoke(@Req() req: any, @Param('id') id: string) {
    return this.apiKeysService.revoke(req.user.tenantId, id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API key' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.apiKeysService.remove(req.user.tenantId, id, req.user.id);
  }

  private getScopeDescription(scope: string): string {
    const descriptions: Record<string, string> = {
      'bookings:read': 'Read booking information',
      'bookings:write': 'Create and update bookings',
      'vehicles:read': 'Read vehicle information',
      'vehicles:write': 'Create and update vehicles',
      'customers:read': 'Read customer information',
      'customers:write': 'Create and update customers',
      'reports:read': 'Generate and download reports',
      'analytics:read': 'Access analytics data',
      'maintenance:read': 'Read maintenance records',
      'maintenance:write': 'Create and update maintenance records',
      'all': 'Full access to all resources',
    };
    return descriptions[scope] || scope;
  }
}
