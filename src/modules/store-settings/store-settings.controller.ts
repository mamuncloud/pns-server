import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Store Settings')
@Controller('store-settings')
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get store settings',
    description: 'Returns the current store settings, including open/close status.',
  })
  @ApiResponse({ status: 200, description: 'Store settings retrieved successfully' })
  getSettings() {
    return this.storeSettingsService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store settings' })
  @ApiResponse({ status: 200, description: 'Store settings updated successfully' })
  updateSettings(@Body() updateStoreSettingsDto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateSettings(updateStoreSettingsDto);
  }
}
