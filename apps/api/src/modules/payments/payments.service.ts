import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayseraService } from '../../common/services/paysera.service';
import { CreatePaymentDto, PayseraCallbackDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus, PaymentType } from '@prisma/client';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly payseraService: PayseraService,
        private readonly configService: ConfigService,
    ) { }

    async initiatePayment(tenantId: string, data: CreatePaymentDto, userId: string) {
        // Validate booking belongs to this tenant
        const booking = await this.prisma.booking.findFirst({
            where: { id: data.bookingId, tenantId },
            include: {
                customer: {
                    select: { email: true, firstName: true, lastName: true }
                }
            }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Prevent double payment: check if a SUCCEEDED payment already exists for this booking and type
        const existingSucceeded = await this.prisma.payment.findFirst({
            where: {
                bookingId: data.bookingId,
                type: data.type,
                status: PaymentStatus.SUCCEEDED,
            },
        });

        if (existingSucceeded) {
            throw new BadRequestException(`A successful ${data.type} payment already exists for this booking`);
        }

        const orderId = `ORD-${Date.now()}-${booking.id.substring(0, 8)}`;
        const callbackUrl = `${this.configService.get('API_URL')}/api/v1/payments/callback`;
        const returnUrl = `${this.configService.get('FRONTEND_URL')}/bookings/${booking.id}/payment/success`;
        const cancelUrl = `${this.configService.get('FRONTEND_URL')}/bookings/${booking.id}/payment/cancel`;

        // Create payment record in DB
        await this.prisma.payment.create({
            data: {
                tenantId,
                bookingId: booking.id,
                amount: data.amount,
                currency: 'EUR',
                status: PaymentStatus.PENDING,
                provider: 'PAYSERA',
                transactionId: orderId,
                type: data.type,
                metadata: {
                    description: data.description,
                },
                createdById: userId,
            },
        });

        // Create Paysera order with actual customer email
        const payseraOrder = await this.payseraService.createOrder({
            amount: data.amount,
            currency: 'EUR',
            order_id: orderId,
            description: data.description,
            email: booking.customer?.email || 'noreply@carrental.com',
            status: '2', // Immediate charge
            callback_url: callbackUrl,
            return_url: returnUrl,
        });

        return {
            paymentUrl: payseraOrder.url,
            orderId,
        };
    }

    async handleCallback(query: PayseraCallbackDto) {
        try {
            // Verify Paysera callback signature using ss1 (md5 of data + sign_password)
            const { createHmac } = await import('crypto');
            const expectedSs1 = createHmac('md5', this.configService.get('PAYSERA_SIGN_PASSWORD', ''))
                .update(query.data)
                .digest('hex');

            if (query.ss1 !== expectedSs1) {
                this.logger.warn(`Invalid Paysera callback signature. Expected: ${expectedSs1}, Got: ${query.ss1}`);
                throw new BadRequestException('Invalid callback signature');
            }

            // Decode data
            const decodedData = Buffer.from(query.data.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString('utf-8');
            const params = new URLSearchParams(decodedData);
            const orderId = params.get('orderid');
            const status = params.get('status');
            const amount = params.get('amount');

            if (!orderId) throw new BadRequestException('Missing orderid');

            this.logger.log(`Payment callback for order ${orderId}, status: ${status}`);

            if (status === '1') { // 1 = Success
                const payment = await this.prisma.payment.findFirst({
                    where: { transactionId: orderId },
                });

                if (!payment) {
                    this.logger.warn(`Payment not found for order ${orderId}`);
                    throw new BadRequestException('Payment not found');
                }

                // Idempotency: if already succeeded, return OK immediately
                if (payment.status === PaymentStatus.SUCCEEDED) {
                    this.logger.log(`Payment ${orderId} already processed (idempotent). Returning OK.`);
                    return 'OK';
                }

                // Verify the callback amount matches the payment amount
                if (amount && Math.abs(parseFloat(amount) - Number(payment.amount) * 100) > 1) {
                    this.logger.warn(`Amount mismatch for order ${orderId}: expected ${Number(payment.amount) * 100}, got ${amount}`);
                    throw new BadRequestException('Amount mismatch');
                }

                // Use transaction to ensure atomicity
                await this.prisma.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: { status: PaymentStatus.SUCCEEDED },
                    });

                    // Update booking status if it was a deposit or full payment
                    if (payment.type === PaymentType.DEPOSIT || payment.type === PaymentType.FULL_PAYMENT) {
                        await tx.booking.update({
                            where: { id: payment.bookingId },
                            data: { status: BookingStatus.CONFIRMED },
                        });
                    }
                });
            }

            return 'OK';
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Callback error for data: ${query.data?.substring(0, 50)}... - ${errorMsg}`);
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException('Callback processing failed');
        }
    }

    async handleSuccess(orderId: string) {
        // Verify status with Paysera API
        const status = await this.payseraService.getOrderStatus(orderId);
        // Update DB if needed
        return { status: 'success', orderId };
    }

    async handleCancel(orderId: string) {
        await this.prisma.payment.updateMany({
            where: { transactionId: orderId },
            data: { status: PaymentStatus.FAILED },
        });
        return { status: 'cancelled', orderId };
    }
}
