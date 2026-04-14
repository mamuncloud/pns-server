import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  NotFoundException,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Public: look up a customer by phone number for checkout form auto-fill.
   * Must be declared BEFORE :id route to avoid route conflict.
   */
  @Get('lookup-customer')
  @ApiOperation({ summary: 'Look up a customer name by phone number' })
  @ApiQuery({ name: 'phone', required: true })
  @ApiResponse({ status: 200, description: 'Customer found or not found' })
  async lookupCustomer(@Query('phone') phone: string) {
    if (!phone) return { name: null };
    const result = await this.ordersService.lookupCustomerByPhone(phone);
    return result ?? { name: null };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order (Public for MAYAR PRE_ORDER, Staff-only for WALK_IN)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Manually extract and verify JWT if present
    let authUser: any = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = this.jwtService.verify(token);
        // Map payload back to expected user object (matching JwtStrategy)
        authUser = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          name: payload.name,
          type: payload.type,
        };
      } catch {
        // Token invalid, treat as guest
      }
    }

    return this.ordersService.create(createOrderDto, authUser?.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'search', required: false, description: 'Search orders by customer name, phone, or ID' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll(@Query() query: PaginationQueryDto) {
    const { page, limit, search } = query;
    const { data, totalItems } = await this.ordersService.findAll(page, limit, search);
    return {
      message: 'Berhasil mengambil semua pesanan',
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get order status (Public/Customer)' })
  @ApiResponse({ status: 200, description: 'Order status retrieved' })
  async findPublic(@Param('id') id: string) {
    return this.ordersService.findPublic(id);
  }

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiOperation({ summary: 'Get order dashboard summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getSummary() {
    return this.ordersService.getDashboardSummary();
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiOperation({ summary: 'Update order status (PAID→READY, READY→COMPLETED, any→CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order detail retrieved successfully' })
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Pesanan dengan ID ${id} tidak ditemukan`);
    }
    return order;
  }
}
