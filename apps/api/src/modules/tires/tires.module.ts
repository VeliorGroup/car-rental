import { Module } from '@nestjs/common';
import { TiresController } from './tires.controller';
import { TiresService } from './tires.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';


@Module({
  imports: [
    PrismaModule,
    CommonModule,

  ],
  controllers: [TiresController],
  providers: [TiresService],
  exports: [TiresService],
})
export class TiresModule {}