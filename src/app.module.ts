import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { DatabaseModule } from 'src/common/database/database.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GracefulShutdownModule.forRoot(),
    DatabaseModule,
    HealthModule,
    HomeModule,
    ProductsModule,
    AuthModule,
    PurchasesModule,
    OrdersModule,
    StorageModule,
    SuppliersModule,
    StoreSettingsModule,
    RepacksModule,
  ],
})
export class AppModule {}
