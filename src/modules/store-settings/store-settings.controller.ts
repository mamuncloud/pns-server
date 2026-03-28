import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { StoreSettingsService } from "./store-settings.service";
import { UpdateStoreSettingsDto } from "./dto/update-store-settings.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("store-settings")
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Get()
  getSettings() {
    return this.storeSettingsService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ANY_EMPLOYEE') // Restrict to any employee (Manager or Cashier)
  updateSettings(@Body() updateStoreSettingsDto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateSettings(updateStoreSettingsDto);
  }
}
