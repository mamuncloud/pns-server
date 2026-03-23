import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/common/database/database.module';
import { HealthModule } from 'src/modules/health/health.module';
import { HomeModule } from 'src/modules/home/home.module';
import { ProductsModule } from 'src/modules/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    HomeModule,
    ProductsModule,
  ],
})
export class AppModule {}
