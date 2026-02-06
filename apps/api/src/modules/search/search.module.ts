import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CitiesController } from './cities.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SearchController, CitiesController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
