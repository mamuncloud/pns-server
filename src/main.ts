import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  logger.log(`Server is running at http://localhost:${port}`);
}
bootstrap();
