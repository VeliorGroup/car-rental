import { Controller, Post, Body, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PayseraCallbackDto } from './dto/create-payment.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('initiate')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Initiate a payment' })
    @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
    async initiatePayment(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any) {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        return this.paymentsService.initiatePayment(tenantId, createPaymentDto, userId);
    }

    @Get('callback')
    @Public()
    @ApiOperation({ summary: 'Handle Paysera callback (webhook)' })
    async handleCallback(@Query() query: PayseraCallbackDto) {
        return this.paymentsService.handleCallback(query);
    }

    @Get('success')
    @Public()
    @ApiOperation({ summary: 'Handle successful payment redirect' })
    async handleSuccess(@Query('orderid') orderId: string) {
        return this.paymentsService.handleSuccess(orderId);
    }

    @Get('cancel')
    @Public()
    @ApiOperation({ summary: 'Handle cancelled payment redirect' })
    async handleCancel(@Query('orderid') orderId: string) {
        return this.paymentsService.handleCancel(orderId);
    }
}
