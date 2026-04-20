import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, like, or, and } from 'drizzle-orm';
import { CustomerQueryDto } from './dto/customer-query.dto';
import {
  CustomerResponseDto,
  CustomerListResponseDto,
  CustomerMetaDto,
} from './dto/customer-query.dto';
import { CustomerDetailResponseDto } from './dto/customer-order.dto';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(query: CustomerQueryDto): Promise<CustomerListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;
    const search = query.search || '';
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Simple query - just get users
    let whereClause = undefined;
    if (search) {
      whereClause = and(
        or(
          like(schema.users.name, `%${search}%`),
          like(schema.users.phone, `%${search}%`),
        ),
      );
    }

    const allUsers = await this.db
      .select()
      .from(schema.users)
      .where(whereClause);

    // Get orders to calculate stats
    const allOrders = await this.db.query.orders.findMany();

    // Build customer data with order stats
    const customerMap = new Map();

    for (const user of allUsers) {
      customerMap.set(user.id, {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        createdAt: user.createdAt,
      });
    }

    // Aggregate order stats
    for (const order of allOrders) {
      if (order.userId && customerMap.has(order.userId)) {
        const cust = customerMap.get(order.userId);
        cust.totalOrders += 1;
        cust.totalSpent += order.totalAmount;
        if (!cust.lastOrderDate || order.createdAt > cust.lastOrderDate) {
          cust.lastOrderDate = order.createdAt;
        }
      }
    }

    const customersArray = Array.from(customerMap.values());

    // Sort
    customersArray.sort((a, b) => {
      const cmp = sortBy === 'name'
        ? (a.name || '').localeCompare(b.name || '')
        : sortBy === 'totalOrders'
          ? a.totalOrders - b.totalOrders
          : sortBy === 'totalSpent'
            ? a.totalSpent - b.totalSpent
            : a.createdAt.getTime() - b.createdAt.getTime();
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const totalItems = customersArray.length;
    const paginatedCustomers = customersArray.slice(offset, offset + limit);

    const customerData: CustomerResponseDto[] = paginatedCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      lastOrderDate: c.lastOrderDate ? c.lastOrderDate.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }));

    const meta: CustomerMetaDto = {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };

    return {
      message: 'Berhasil mengambil data pelanggan',
      data: customerData,
      meta,
    };
  }

  async findOne(id: string): Promise<CustomerDetailResponseDto | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    if (!user) {
      return null;
    }

    const userOrders = await this.db.query.orders.findMany({
      where: eq(schema.orders.userId, id),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: 20,
    });

    const totalSpent = userOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      totalOrders: userOrders.length,
      totalSpent,
      lastOrderDate: userOrders[0]?.createdAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      orders: [],
    };
  }

  async getSummary() {
    const allUsers = await this.db.select().from(schema.users);

    return {
      totalCustomers: allUsers.length,
      newThisMonth: 0,
      topSpenders: [],
    };
  }
}