import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req: any) {
    const { tenantId, id: userId } = req.user;
    return this.notificationsService.findAll(tenantId, userId);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const { tenantId, id: userId } = req.user;
    return this.notificationsService.getStats(tenantId, userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const { tenantId, id: userId } = req.user;
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const { tenantId } = req.user;
    return this.notificationsService.markAsRead(id, tenantId);
  }

  @Delete('clear-all')
  async clearAll(@Req() req: any) {
    const { tenantId, id: userId } = req.user;
    return this.notificationsService.clearAll(tenantId, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const { tenantId } = req.user;
    return this.notificationsService.delete(id, tenantId);
  }
}
