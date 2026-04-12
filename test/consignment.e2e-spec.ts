import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestActionApp, getTestToken } from './test-utils';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DB } from '../src/common/database/database.module';

describe('Consignment (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dbMock: any;

  beforeAll(async () => {
    app = await createTestActionApp();
    jwtService = app.get<JwtService>(JwtService);
    dbMock = app.get(DRIZZLE_DB);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /consignment', () => {
    const createDto = {
      supplierId: 'supplier-uuid',
      date: new Date().toISOString(),
      items: [
        {
          productVariantId: 'variant-uuid',
          qtyReceived: 10,
          unitCost: 15000,
        },
      ],
    };

    it('should create a consignment (201)', async () => {
      const token = getTestToken(jwtService, 'MANAGER');

      // Mock DB interactions for successful creation
      dbMock.query.productVariants.findFirst.mockResolvedValue({ id: 'variant-uuid', stock: 0 }); // Added this
      dbMock.insert.mockReturnThis();
      dbMock.values.mockReturnThis();
      dbMock.returning.mockResolvedValue([{ id: 'consignment-uuid' }]);
      dbMock.transaction.mockImplementation(async (cb) => cb(dbMock));

      const response = await request(app.getHttpServer())
        .post('/consignment')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'consignment-uuid');
    });

    it('should return 401 if unauthorized', async () => {
      const response = await request(app.getHttpServer()).post('/consignment').send(createDto);

      expect(response.status).toBe(401);
    });

    it('should return 403 if role is insufficient', async () => {
      // Assuming 'ANY_EMPLOYEE' doesn't have MANAGER/CASHIER permissions for this endpoint
      // Our controller requires 'MANAGER' or 'CASHIER'
      // Wait, RolesGuard checks 'MANAGER', 'CASHIER'.
      // If I use a role not in that list, it should be 403.

      const tokenUser = getTestToken(jwtService, 'ADMIN' as any);

      const response = await request(app.getHttpServer())
        .post('/consignment')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send(createDto);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /consignment', () => {
    it('should return list of consignments (200)', async () => {
      const token = getTestToken(jwtService, 'CASHIER');

      dbMock.query.consignments.findMany.mockResolvedValue([
        { id: 'c1', status: 'OPEN', totalAmount: 150000 },
        { id: 'c2', status: 'CLOSED', totalAmount: 200000 },
      ]);

      const response = await request(app.getHttpServer())
        .get('/consignment')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('POST /consignment/settle', () => {
    const settleDto = {
      consignmentId: 'consignment-uuid',
      items: [
        {
          id: 'item-uuid',
          qtyReturned: 2,
          currentStock: 3,
        },
      ],
      note: 'Routine settlement',
    };

    it('should settle a consignment (201/200)', async () => {
      const token = getTestToken(jwtService, 'MANAGER');

      // Mock findOne in service (used in settle)
      dbMock.query.productVariants.findFirst.mockResolvedValue({ id: 'v1', stock: 5 }); // Added this
      dbMock.query.consignments.findFirst.mockResolvedValue({
        id: 'consignment-uuid',
        status: 'OPEN',
        totalSettled: 0,
        items: [
          {
            id: 'item-uuid',
            qtyReceived: 10,
            qtyReturned: 0,
            qtySettled: 0,
            unitCost: 15000,
            productVariantId: 'v1',
            productVariant: { product: { name: 'Snack' } },
          },
        ],
      });

      // Mock update
      dbMock.update.mockReturnThis();
      dbMock.set.mockReturnThis();
      dbMock.where.mockReturnThis();
      dbMock.returning.mockResolvedValue([{ id: 'updated' }]);

      // Mock findMany for status check
      dbMock.query.consignmentItems.findMany.mockResolvedValue([
        { qtyReceived: 10, qtySettled: 5, qtyReturned: 5 }, // Fully cleared
      ]);

      const response = await request(app.getHttpServer())
        .post('/consignment/settle')
        .set('Authorization', `Bearer ${token}`)
        .send(settleDto);

      expect(response.status).toBe(201); // NestJS default for @Post is 201
      expect(response.body.status).toBe('CLOSED');
      expect(response.body.totalAmountSettledDelta).toBe(5 * 15000); // (10 - 2 - 3) * 15000 = 5 * 15000
    });

    it('should throw BadRequest if stock is more than received', async () => {
      const token = getTestToken(jwtService, 'MANAGER');

      dbMock.query.consignments.findFirst.mockResolvedValue({
        id: 'consignment-uuid',
        status: 'OPEN',
        items: [
          {
            id: 'item-uuid',
            qtyReceived: 10,
            qtyReturned: 0,
            qtySettled: 0,
            unitCost: 15000,
            productVariant: { product: { name: 'Invalid Item' } },
          },
        ],
      });

      const invalidSettleDto = {
        ...settleDto,
        items: [{ ...settleDto.items[0], currentStock: 15 }], // 15 > 10 received
      };

      const response = await request(app.getHttpServer())
        .post('/consignment/settle')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidSettleDto);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Stok aktual (15) melebihi sisa barang');
    });
  });
});
