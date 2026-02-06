import { Module } from '@nestjs/common';
import { FuelLogsController } from './fuel-logs.controller';
import { FuelLogsService } from './fuel-logs.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [FuelLogsController],
  providers: [FuelLogsService],
  exports: [FuelLogsService],
})
export class FuelLogsModule {}
