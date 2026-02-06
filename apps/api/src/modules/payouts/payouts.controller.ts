import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { PayoutFilterDto, WalletSummaryDto } from './dto/payouts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Wallet & Payouts')
@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('wallet')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get wallet summary for current tenant' })
  @ApiResponse({ status: 200, type: WalletSummaryDto })
  async getWalletSummary(@Req() req: any): Promise<WalletSummaryDto> {
    return this.payoutsService.getWalletSummary(req.tenant.id);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get payout history for current tenant' })
  async getPayouts(@Req() req: any, @Query() filters: PayoutFilterDto) {
    return this.payoutsService.getPayouts(req.tenant.id, filters);
  }

  @Get('earnings')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get detailed earnings breakdown' })
  async getEarningsBreakdown(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.payoutsService.getEarningsBreakdown(
      req.tenant.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // Admin-only endpoint to trigger payout processing
  @Post('process')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Trigger payout processing (admin only)' })
  async processPayouts() {
    return this.payoutsService.processPayouts();
  }
}
