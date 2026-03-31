import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DB } from '../src/common/database/database.module';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';

export async function createTestActionApp(): Promise<INestApplication> {
  const dbMock = {
    query: {
      employees: { findFirst: jest.fn() },
      products: { findFirst: jest.fn(), findMany: jest.fn() },
      suppliers: { findFirst: jest.fn(), findMany: jest.fn() },
      consignments: { findFirst: jest.fn(), findMany: jest.fn() },
      consignmentItems: { findFirst: jest.fn(), findMany: jest.fn() },
      productVariants: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    transaction: jest.fn((callback) => callback(dbMock)),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DRIZZLE_DB)
    .useValue(dbMock)
    .compile();

  const app = moduleFixture.createNestApplication();
  setupGracefulShutdown({ app });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export function getTestToken(jwtService: JwtService, role: 'MANAGER' | 'CASHIER' | 'ADMIN' = 'MANAGER') {
  const payload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    role: role,
    name: 'Test User',
    type: 'EMPLOYEE',
  };
  return jwtService.sign(payload);
}
