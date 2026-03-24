import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('PNS Server API')
    .setDescription('The API documentation for PNS Server, providing endpoints for health monitoring, home page data, and product management.')
    .setVersion('1.0.50')
    .addTag('Health', 'System health and uptime monitoring')
    .addTag('Home', 'Homepage related content and metadata')
    .addTag('Products', 'Product catalog and management')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'PNS API Documentation',
  });
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  logger.log(`Server is running at http://localhost:${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}
bootstrap();
