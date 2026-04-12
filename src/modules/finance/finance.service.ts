import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, desc, sql, sum, and, gte, lte } from 'drizzle-orm';

export interface RecordTransactionPayload {
  type: (typeof schema.transactionTypeEnum.enumValues)[number];
  category: (typeof schema.transactionCategoryEnum.enumValues)[number];
  amount: number;
  description?: string;
  paymentMethod?: (typeof schema.paymentMethodEnum.enumValues)[number];
  referenceId?: string;
  employeeId?: string;
  date?: Date;
}

@Injectable()
export class FinanceService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Records a financial transaction. Can be used within an existing database transaction.
   */
  async recordTransaction(payload: RecordTransactionPayload, tx?: NodePgDatabase<typeof schema>) {
    const db = tx || this.db;

    return await db
      .insert(schema.financialTransactions)
      .values({
        type: payload.type,
        category: payload.category,
        amount: payload.amount,
        description: payload.description,
        paymentMethod: payload.paymentMethod || 'CASH',
        referenceId: payload.referenceId,
        employeeId: payload.employeeId,
        date: payload.date || new Date(),
      })
      .returning();
  }

  /**
   * Updates a transaction found by its referenceId (e.g. Expense ID)
   */
  async updateTransactionByReference(
    referenceId: string,
    payload: Partial<RecordTransactionPayload>,
    tx?: NodePgDatabase<typeof schema>,
  ) {
    const db = tx || this.db;
    return await db
      .update(schema.financialTransactions)
      .set({
        amount: payload.amount,
        description: payload.description,
        type: payload.type,
        category: payload.category,
        paymentMethod: payload.paymentMethod,
        date: payload.date,
        updatedAt: new Date(),
      })
      .where(eq(schema.financialTransactions.referenceId, referenceId))
      .returning();
  }

  /**
   * Deletes a transaction found by its referenceId
   */
  async deleteTransactionByReference(referenceId: string, tx?: NodePgDatabase<typeof schema>) {
    const db = tx || this.db;
    return await db
      .delete(schema.financialTransactions)
      .where(eq(schema.financialTransactions.referenceId, referenceId))
      .returning();
  }

  /**
   * Get ledger entries with filters
   */
  async getLedger(params?: { startDate?: string; endDate?: string; category?: any; type?: any }) {
    const conditions = [];

    if (params?.startDate) {
      conditions.push(gte(schema.financialTransactions.date, new Date(params.startDate)));
    }
    if (params?.endDate) {
      conditions.push(lte(schema.financialTransactions.date, new Date(params.endDate)));
    }
    if (params?.type) {
      conditions.push(eq(schema.financialTransactions.type, params.type));
    }
    if (params?.category) {
      conditions.push(eq(schema.financialTransactions.category, params.category));
    }

    return await this.db.query.financialTransactions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.financialTransactions.date)],
      with: {
        employee: {
          columns: { name: true },
        },
      },
    });
  }

  /**
   * Get financial summary (P&L) with deep business insights
   */
  async getSummary() {
    // 1. Get total per type (Income vs Expense)
    const typeSummary = await this.db
      .select({
        type: schema.financialTransactions.type,
        total: sum(schema.financialTransactions.amount),
      })
      .from(schema.financialTransactions)
      .groupBy(schema.financialTransactions.type);

    const _totalIncome = Number(typeSummary.find((r) => r.type === 'INCOME')?.total || 0);
    const _totalExpense = Number(typeSummary.find((r) => r.type === 'EXPENSE')?.total || 0);

    // 2. Get specific breakdowns
    const categoryBreakdown = await this.db
      .select({
        category: schema.financialTransactions.category,
        total: sum(schema.financialTransactions.amount),
      })
      .from(schema.financialTransactions)
      .groupBy(schema.financialTransactions.category);

    const revenue = Number(categoryBreakdown.find((r) => r.category === 'SALES')?.total || 0);
    const cogs = Number(categoryBreakdown.find((r) => r.category === 'STOCK_PURCHASE')?.total || 0);
    const expenses = Number(
      categoryBreakdown.find((r) => r.category === 'OPERATIONAL_EXPENSE')?.total || 0,
    );

    // 3. Get cash vs qris balance
    const paymentSummary = await this.db
      .select({
        method: schema.financialTransactions.paymentMethod,
        type: schema.financialTransactions.type,
        total: sum(schema.financialTransactions.amount),
      })
      .from(schema.financialTransactions)
      .groupBy(schema.financialTransactions.paymentMethod, schema.financialTransactions.type);

    const cashIncome = Number(
      paymentSummary.find((r) => r.method === 'CASH' && r.type === 'INCOME')?.total || 0,
    );
    const cashExpense = Number(
      paymentSummary.find((r) => r.method === 'CASH' && r.type === 'EXPENSE')?.total || 0,
    );
    const edcBcaIncome = Number(
      paymentSummary.find((r) => r.method === 'EDC_BCA' && r.type === 'INCOME')?.total || 0,
    );
    const edcBcaExpense = Number(
      paymentSummary.find((r) => r.method === 'EDC_BCA' && r.type === 'EXPENSE')?.total || 0,
    );
    const mayarIncome = Number(
      paymentSummary.find((r) => r.method === 'MAYAR' && r.type === 'INCOME')?.total || 0,
    );
    const mayarExpense = Number(
      paymentSummary.find((r) => r.method === 'MAYAR' && r.type === 'EXPENSE')?.total || 0,
    );

    return {
      totalRevenue: revenue,
      totalCogs: cogs,
      totalExpenses: expenses,
      grossProfit: revenue - cogs,
      netProfit: revenue - cogs - expenses,
      transactionCount: await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.financialTransactions)
        .then((r) => Number(r[0].count)),
      cashBalance: cashIncome - cashExpense,
      edcBcaBalance: edcBcaIncome - edcBcaExpense,
      mayarBalance: mayarIncome - mayarExpense,
      qrisBalance: (edcBcaIncome + mayarIncome) - (edcBcaExpense + mayarExpense), // backward compat
    };
  }
}
