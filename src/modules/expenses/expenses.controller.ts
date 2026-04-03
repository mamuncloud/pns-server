import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List all expense categories' })
  @ApiResponse({ status: 200, description: 'Return categories' })
  async getCategories() {
    return await this.expensesService.findAllCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a specific expense category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Return category' })
  async getCategory(@Param('id') id: string) {
    return await this.expensesService.findOneCategory(id);
  }

  @Post('categories')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Create a new expense category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return await this.expensesService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update an expense category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return await this.expensesService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Delete an expense category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async removeCategory(@Param('id') id: string) {
    return await this.expensesService.removeCategory(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all expenses with filters' })
  @ApiResponse({ status: 200, description: 'Return expenses' })
  async getExpenses(@Query('categoryId') categoryId?: string) {
    return await this.expensesService.findAll({ categoryId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific expense record' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Return expense' })
  async getExpense(@Param('id') id: string) {
    return await this.expensesService.findOne(id);
  }

  @Post()
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Record a new expense' })
  @ApiResponse({ status: 201, description: 'Expense recorded' })
  async createExpense(@Body() dto: CreateExpenseDto) {
    return await this.expensesService.create(dto);
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update an existing expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return await this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Delete an expense record' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense deleted' })
  async removeExpense(@Param('id') id: string) {
    return await this.expensesService.remove(id);
  }
}
