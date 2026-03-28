import { Module } from '@nestjs/common';
import { RepacksController } from './repacks.controller';
import { RepacksService } from './repacks.service';
import { DatabaseModule } from '../../common/database/database.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [DatabaseModule, StockModule],
  controllers: [RepacksController],
  providers: [RepacksService],
  exports: [RepacksService],
})
export class RepacksModule {}
