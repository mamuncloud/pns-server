import { Module } from '@nestjs/common';
import { ConsignmentService } from './consignment.service';
import { ConsignmentController } from './consignment.controller';
import { StockService } from '../stock/stock.service';

@Module({
  controllers: [ConsignmentController],
  providers: [ConsignmentService, StockService],
})
export class ConsignmentModule {}
