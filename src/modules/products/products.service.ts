import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';

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
}
