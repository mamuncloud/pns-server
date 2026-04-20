import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { DatabaseModule } from 'src/common/database/database.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from 'src/modules/health/health.module';
import { HomeModule } from 'src/modules/home/home.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PurchasesModule } from 'src/modules/purchases/purchases.module';
import { OrdersModule } from 'src/modules/orders/orders.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { SuppliersModule } from 'src/modules/suppliers/suppliers.module';
import { StoreSettingsModule } from 'src/modules/store-settings/store-settings.module';
import { RepacksModule } from 'src/modules/repacks/repacks.module';
import { StockModule } from 'src/modules/stock/stock.module';
import { EmployeesModule } from 'src/modules/employees/employees.module';
import { FinanceModule } from 'src/modules/finance/finance.module';
import { ExpensesModule } from 'src/modules/expenses/expenses.module';
import { EventsModule } from 'src/modules/events/events.module';
import { CustomersModule } from 'src/modules/customers/customers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GracefulShutdownModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    HealthModule,
    HomeModule,
    ProductsModule,
    AuthModule,
    StockModule,
    PurchasesModule,
    OrdersModule,
    StorageModule,
    SuppliersModule,
    StoreSettingsModule,
    RepacksModule,
    EmployeesModule,
    FinanceModule,
    ExpensesModule,
    EventsModule,
    CustomersModule,
  ],
})
export class AppModule {}
