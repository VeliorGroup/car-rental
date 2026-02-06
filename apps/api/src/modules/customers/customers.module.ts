import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { LicenseExpiryProcessor } from './processors/license-expiry.processor';


@Module({
  imports: [
  ],
  controllers: [CustomersController],
  providers: [CustomersService, LicenseExpiryProcessor],
  exports: [CustomersService],
})
export class CustomersModule {}