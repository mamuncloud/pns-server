import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RepacksService } from './repacks.service';
import { CreateRepackDto } from './dto/create-repack.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Repacks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ANY_EMPLOYEE')
@Controller('repacks')
export class RepacksController {
  constructor(private readonly repacksService: RepacksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all repack history' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search repacks by product name' })
  async findAll(@Query('productId') productId?: string, @Query('search') search?: string) {
    return this.repacksService.findAll(productId, search);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new repack transaction' })
  @ApiResponse({ status: 201, description: 'Repack berhasil dilakukan.' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createRepackDto: CreateRepackDto) {
    return this.repacksService.create(createRepackDto);
  }
}
