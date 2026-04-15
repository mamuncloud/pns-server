import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AllocateEventStockDto } from './dto/allocate-event-stock.dto';
import { ReturnEventStockDto } from './dto/return-event-stock.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Create a new event (MANAGER only)' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all events' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event details (public for event store)' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post(':id/allocate')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Allocate stock to an event (MANAGER only)' })
  allocateStock(@Param('id') eventId: string, @Body() dto: AllocateEventStockDto) {
    return this.eventsService.allocateStock(eventId, dto);
  }

  @Post(':id/return')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Return stock from an event back to warehouse (MANAGER only, supports Bulky)' })
  returnStock(@Param('id') eventId: string, @Body() dto: ReturnEventStockDto) {
    return this.eventsService.returnStock(eventId, dto);
  }

  @Patch(':id/status')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update event status (MANAGER only)' })
  updateStatus(@Param('id') id: string, @Body('status') status: 'OPEN' | 'CLOSED') {
    return this.eventsService.updateStatus(id, status);
  }

  @Get(':id/report')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Get event sales report (MANAGER only)' })
  getReport(@Param('id') id: string) {
    return this.eventsService.getReport(id);
  }
}
