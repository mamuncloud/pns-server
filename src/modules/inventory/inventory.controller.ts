import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getStockSummary() {
    return this.inventoryService.getStockSummary();
  }

  @Get(':productId')
  async getProductInventory(@Param('productId') productId: string) {
    const inventory = await this.inventoryService.getProductInventory(productId);
    if (!inventory) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan`);
    }
    return inventory;
  }
}
