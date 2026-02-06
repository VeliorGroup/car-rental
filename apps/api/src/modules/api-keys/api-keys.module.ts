import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
