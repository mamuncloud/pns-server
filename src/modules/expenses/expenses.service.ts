import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly financeService: FinanceService,
  ) {}

  /**
   * Kategori Biaya
   */
  async createCategory(dto: CreateExpenseCategoryDto) {
    const [category] = await this.db.insert(schema.expenseCategories).values({
      name: dto.name,
      description: dto.description,
    }).returning();
    return category;
  }

  async findAllCategories() {
    return await this.db.query.expenseCategories.findMany({
      orderBy: [desc(schema.expenseCategories.createdAt)],
    });
  }

  async findOneCategory(id: string) {
    const category = await this.db.query.expenseCategories.findFirst({
      where: eq(schema.expenseCategories.id, id),
    });
    if (!category) {
      throw new NotFoundException(`Kategori biaya dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto) {
    const [category] = await this.db
      .update(schema.expenseCategories)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.expenseCategories.id, id))
      .returning();

    if (!category) {
      throw new NotFoundException(`Kategori biaya dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }

  async removeCategory(id: string) {
    // Check if there are expenses using this category
    const expenseCount = await this.db.query.expenses.findFirst({
      where: eq(schema.expenses.categoryId, id),
    });

    if (expenseCount) {
      throw new Error('Kategori tidak dapat dihapus karena masih digunakan oleh data biaya');
    }

    const [category] = await this.db
      .delete(schema.expenseCategories)
      .where(eq(schema.expenseCategories.id, id))
      .returning();

    if (!category) {
      throw new NotFoundException(`Kategori biaya dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }

  /**
   * Biaya (Expenses)
   */
  async create(dto: CreateExpenseDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Verify category
      const category = await tx.query.expenseCategories.findFirst({
        where: eq(schema.expenseCategories.id, dto.categoryId),
      });

      if (!category) {
        throw new NotFoundException(`Kategori biaya dengan ID ${dto.categoryId} tidak ditemukan`);
      }

      // 2. Create expense record
      const [expense] = await tx.insert(schema.expenses).values({
        categoryId: dto.categoryId,
        amount: dto.amount,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
        employeeId: dto.employeeId,
        date: dto.date ? new Date(dto.date) : new Date(),
      }).returning();

      // 3. Record in financial ledger
      await this.financeService.recordTransaction({
        type: 'EXPENSE',
        category: 'OPERATIONAL_EXPENSE',
        amount: dto.amount,
        description: `${category.name} | ${dto.description || ''}`,
        paymentMethod: 'CASH',
        referenceId: expense.id,
        employeeId: dto.employeeId,
        date: expense.date,
      }, tx);

      return expense;
    });
  }

  async findAll(params?: { categoryId?: string }) {
    return await this.db.query.expenses.findMany({
      where: params?.categoryId ? eq(schema.expenses.categoryId, params.categoryId) : undefined,
      with: {
        category: true,
        employee: {
          columns: { name: true }
        }
      },
      orderBy: [desc(schema.expenses.date)],
    });
  }

  async findOne(id: string) {
    const expense = await this.db.query.expenses.findFirst({
      where: eq(schema.expenses.id, id),
      with: {
        category: true,
        employee: {
          columns: { name: true }
        }
      },
    });
    if (!expense) {
      throw new NotFoundException(`Biaya dengan ID ${id} tidak ditemukan`);
    }
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Get current expense
      const oldExpense = await tx.query.expenses.findFirst({
        where: eq(schema.expenses.id, id),
      });

      if (!oldExpense) {
        throw new NotFoundException(`Biaya dengan ID ${id} tidak ditemukan`);
      }

      // 2. Update expense record
      const [expense] = await tx
        .update(schema.expenses)
        .set({
          categoryId: dto.categoryId,
          amount: dto.amount,
          description: dto.description,
          receiptUrl: dto.receiptUrl,
          employeeId: dto.employeeId,
          date: dto.date ? new Date(dto.date) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.expenses.id, id))
        .returning();

      // 3. Sync with ledger
      const category = await tx.query.expenseCategories.findFirst({
        where: eq(schema.expenseCategories.id, expense.categoryId),
      });

      await this.financeService.updateTransactionByReference(
        expense.id,
        {
          amount: expense.amount,
          description: `${category?.name || 'Lain-lain'} | ${expense.description || ''}`,
          date: expense.date,
          employeeId: expense.employeeId,
        },
        tx,
      );

      return expense;
    });
  }

  async remove(id: string) {
    return await this.db.transaction(async (tx) => {
      // 1. Delete expense
      const [expense] = await tx
        .delete(schema.expenses)
        .where(eq(schema.expenses.id, id))
        .returning();

      if (!expense) {
        throw new NotFoundException(`Biaya dengan ID ${id} tidak ditemukan`);
      }

      // 2. Remove ledger entry
      await this.financeService.deleteTransactionByReference(id, tx);

      return expense;
    });
  }
}
