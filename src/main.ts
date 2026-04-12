import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import { AppModule } from 'src/app.module';
import { Logger, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Increase payload limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));

  // Enable robust graceful shutdown
  setupGracefulShutdown({ app });

  // CORS Configuration
  const configService = app.get(ConfigService);
  const allowedOrigins = [
    'http://localhost:3000',
    'https://planetnyemilsnack.store',
    'https://www.planetnyemilsnack.store',
  ];

  const envAppUrl = configService.get<string>('NEXT_PUBLIC_APP_URL');
  if (envAppUrl && !allowedOrigins.includes(envAppUrl)) {
    allowedOrigins.push(envAppUrl);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        console.error('Validation Errors:', JSON.stringify(errors, null, 2));
        return new BadRequestException(errors);
      },
    }),
  );

  // Swagger Configuration
  const isProduction = configService.get('NODE_ENV') === 'production';

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('PNS Server API')
      .setDescription(
        'The API documentation for PNS Server, providing endpoints for health monitoring, home page data, and product management.',
      )
      .setVersion('1.0.50')
      .addTag('Auth', 'Security and access control for the staff dashboard')
      .addTag('Home', 'Initial discovery and homepage metadata')
      .addTag('Products', 'Product catalog search and management')
      .addTag('Pricing Rules', 'Dynamic pricing logic and bulk rules')
      .addTag('Orders', 'Checkout and ordering transactions')
      .addTag('Stock Adjustments', 'Manual inventory corrections (e.g., loss, damage)')
      .addTag('Purchases', 'Supply chain management and restocking with HPP calculation')
      .addTag('Health', 'Internal system maintenance and performance monitoring')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    app.use(
      '/docs',
      apiReference({
        spec: {
          content: document,
        },
        theme: 'deepSpace',
      }),
    );
  }

  // Serve static files from public directory
  app.use('/uploads', express.static(join(process.cwd(), 'public', 'uploads')));

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  logger.log(`Server is running at http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`Scalar documentation available at http://localhost:${port}/docs`);
  }
}
bootstrap();
