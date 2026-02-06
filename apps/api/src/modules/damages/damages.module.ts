import { Module } from '@nestjs/common';
import { DamagesController } from './damages.controller';
import { DamagesService } from './damages.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';


@Module({
  imports: [
    PrismaModule,
    CommonModule,

  ],
  controllers: [DamagesController],
  providers: [DamagesService],
  exports: [DamagesService],
})
export class DamagesModule {}