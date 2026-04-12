import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StockModule } from '../stock/stock.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [StockModule, FinanceModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
