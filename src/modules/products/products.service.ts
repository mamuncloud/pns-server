import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { CreateProductDto } from './dto/create-product.dto';
import { generateNextSku } from '../../lib/sku-generator.util';

@Injectable()
export class ProductsService {
  private readonly storageUrl: string;

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {
    this.storageUrl = this.configService.get<string>('SUPABASE_STORAGE_URL');
  }

  private normalizeImageUrl(imageUrl: string | null): string {
    const defaultImage = `${this.storageUrl}/product_default.png`;
    if (!imageUrl || imageUrl.trim() === '') return defaultImage;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${this.storageUrl}/${imageUrl}`;
  }

  async findAll(page: number = 1, limit: number = 10, taste?: string) {
    const offset = (page - 1) * limit;

    const where = taste ? sql`${schema.products.taste} @> ARRAY[${taste}]::text[]` : undefined;

    const rawData = await this.db.query.products.findMany({
      limit,
      offset,
      where,
      with: {
        variants: true,
        brand: true,
        pricingRules: true,
        images: true,
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    });

    const data = rawData.map((product) => {
      const normalizedImages = (product.images || []).map((img) => ({
        ...img,
        url: this.normalizeImageUrl(img.url),
      }));

      // Prefer primary image, then first image, then legacy imageUrl, then default
      const primaryImage = normalizedImages.find((img) => img.isPrimary) || normalizedImages[0];
      const displayImageUrl = primaryImage ? primaryImage.url : this.normalizeImageUrl(product.imageUrl);

      return {
        ...product,
        images: normalizedImages,
        imageUrl: displayImageUrl,
      };
    });

    const totalItemsResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(where);
    const totalItems = Number(totalItemsResult[0].count);

    return {
      data,
      totalItems,
    };
  }

  async findOne(id: string) {
    const product = await this.db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        variants: true,
        brand: true,
        pricingRules: true,
        images: true,
      },
    });

    if (!product) return null;

    const normalizedImages = (product.images || []).map((img) => ({
      ...img,
      url: this.normalizeImageUrl(img.url),
    }));

    const primaryImage = normalizedImages.find((img) => img.isPrimary) || normalizedImages[0];
    const displayImageUrl = primaryImage ? primaryImage.url : this.normalizeImageUrl(product.imageUrl);

    return {
      ...product,
      images: normalizedImages,
      imageUrl: displayImageUrl,
    };
  }

  async create(dto: CreateProductDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Insert Product
      const [product] = await tx
        .insert(schema.products)
        .values({
          name: dto.name,
          description: dto.description,
          brandId: dto.brandId,
          baseCostPerGram: dto.baseCostPerGram,
          packagingCost: dto.packagingCost,
          taste: dto.taste,
        })
        .returning();

      // 2. Handle Variants & SKU Generation
      let lastSku: string | null = null;
      const latestVariant = await tx.query.productVariants.findFirst({
        where: sql`${schema.productVariants.sku} LIKE 'PNS-%'`,
        orderBy: (variants, { desc }) => [desc(variants.sku)],
      });
      if (latestVariant) lastSku = latestVariant.sku;

      const createdVariants = [];
      for (const vDto of dto.variants) {
        let sku = vDto.sku;
        if (!sku) {
          sku = generateNextSku(lastSku);
          lastSku = sku;
        }

        const [variant] = await tx
          .insert(schema.productVariants)
          .values({
            productId: product.id,
            label: vDto.label,
            price: vDto.price,
            stock: vDto.initialStock || 0,
            sku: sku,
          })
          .returning();

        createdVariants.push(variant);

        // Record initial stock if provided
        if (vDto.initialStock && vDto.initialStock > 0) {
          await tx.insert(schema.stockAdjustments).values({
            productId: product.id,
            qty: vDto.initialStock,
            reason: 'RESTOCK',
            hppSnapshot: 0, // Initial stock might not have HPP yet
            totalLoss: 0,
          });
        }
      }

      // 3. Handle Images
      const createdImages = [];
      if (dto.images && dto.images.length > 0) {
        for (const iDto of dto.images) {
          const [image] = await tx
            .insert(schema.productImages)
            .values({
              productId: product.id,
              url: iDto.url,
              isPrimary: iDto.isPrimary || false,
            })
            .returning();
          createdImages.push(image);
        }
      }

      // 4. Handle Pricing Rules
      const createdRules = [];
      if (dto.pricingRules && dto.pricingRules.length > 0) {
        for (const rDto of dto.pricingRules) {
          const [rule] = await tx
            .insert(schema.pricingRules)
            .values({
              productId: product.id,
              type: rDto.type as any,
              weightGram: rDto.weightGram,
              targetPrice: rDto.targetPrice,
              marginPct: rDto.marginPct,
              rounding: rDto.rounding || 100,
            })
            .returning();
          createdRules.push(rule);
        }
      }

      // Update base product stock sum if variants were added
      if (createdVariants.length > 0) {
        const totalStock = createdVariants.reduce((sum, v) => sum + v.stock, 0);
        await tx
          .update(schema.products)
          .set({ stockQty: totalStock })
          .where(eq(schema.products.id, product.id));
      }

      return {
        ...product,
        variants: createdVariants,
        images: createdImages,
        pricingRules: createdRules,
      };
    });
  }
}
