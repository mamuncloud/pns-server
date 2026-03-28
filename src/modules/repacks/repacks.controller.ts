import { Controller, Get, Post, Body, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RepacksService } from './repacks.service';
import { CreateRepackDto } from './dto/create-repack.dto';

@ApiTags('Repacks')
@Controller('repacks')
export class RepacksController {
  constructor(private readonly repacksService: RepacksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all repack history' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
  async findAll(@Query('productId') productId?: string) {
    return this.repacksService.findAll(productId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new repack transaction' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createRepackDto: CreateRepackDto) {
    return this.repacksService.create(createRepackDto);
  }
}
