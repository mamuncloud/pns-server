import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { HomeModule } from './modules/home/home.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    HomeModule,
  ],
})
export class AppModule {}
