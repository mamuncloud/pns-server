import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { DatabaseModule } from 'src/common/database/database.module';
import { HealthModule } from 'src/modules/health/health.module';
import { HomeModule } from 'src/modules/home/home.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { AuthModule } from 'src/modules/auth/auth.module';

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
  ],
})
export class AppModule {}
