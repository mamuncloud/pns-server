import { Controller, Get, Patch, Body } from "@nestjs/common";
import { StoreSettingsService } from "./store-settings.service";
import { UpdateStoreSettingsDto } from "./dto/update-store-settings.dto";

@Controller("store-settings")
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Get()
  getSettings() {
    return this.storeSettingsService.getSettings();
  }

  @Patch()
  updateSettings(@Body() updateStoreSettingsDto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateSettings(updateStoreSettingsDto);
  }
}
