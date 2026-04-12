import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff member (MANAGER only)' })
  @ApiResponse({ status: 201, description: 'Employee successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff members (MANAGER only)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search employees by name' })
  findAll(@Query('search') search?: string) {
    return this.employeesService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific staff member by ID (MANAGER only)' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff member (MANAGER only)' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a staff member (MANAGER only)' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
