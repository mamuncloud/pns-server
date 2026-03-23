import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    return {
      message: 'Berhasil mengambil semua produk',
      data: products,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }
    return {
      message: 'Berhasil mengambil detail produk',
      data: product,
    };
  }
}
