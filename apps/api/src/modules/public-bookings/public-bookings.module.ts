import { Module } from '@nestjs/common';
import { PublicBookingsController } from './public-bookings.controller';
import { PublicBookingsService } from './public-bookings.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { PublicAuthModule } from '../public-auth/public-auth.module';

@Module({
  imports: [PrismaModule, CommonModule, PublicAuthModule],
  controllers: [PublicBookingsController],
  providers: [PublicBookingsService],
  exports: [PublicBookingsService],
})
export class PublicBookingsModule {}
