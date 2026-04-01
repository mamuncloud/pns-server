import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DB } from '../../common/database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, sql, like, desc } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { generateNextSku } from '../../lib/sku-generator.util';
import { UpdateProductDto } from './dto/update-product.dto';
import { and, inArray } from 'drizzle-orm';

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
    
    // Handle local uploads
    if (imageUrl.startsWith('uploads/')) {
      const apiBaseUrl = this.configService.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3001';
      return `${apiBaseUrl}/${imageUrl}`;
    }
    
    return `${this.storageUrl}/${imageUrl}`;
  }

  async findAll(page: number = 1, limit: number = 10, taste?: string, search?: string, hasStock?: boolean) {
    const offset = (page - 1) * limit;

    let where = taste ? sql`${schema.products.taste} @> ARRAY[${taste}]::"ProductTaste"[]` : undefined;

    if (search) {
      const searchWhere = like(schema.products.name, `%${search}%`);
      where = where ? and(where, searchWhere) : searchWhere;
    }

    if (hasStock === true || hasStock === 'true' as any) {
      const stockExist = sql`EXISTS (
        SELECT 1 FROM ${schema.productVariants} v 
        WHERE v.product_id = ${schema.products.id} AND v.stock > 0
      )`;
      where = where ? and(where, stockExist) : stockExist;
    }

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

      // Find primary image or first available
      const primaryImage = normalizedImages.find((img) => img.isPrimary) || normalizedImages[0];
      const displayImageUrl = primaryImage ? primaryImage.url : this.normalizeImageUrl(null);

      // Get latest HPP for each product
      // Note: In a production environment with large datasets, this should be optimized 
      // with a subquery or a dedicated materialized view for performance.
      return {
        ...product,
        images: normalizedImages,
        imageUrl: displayImageUrl,
      };
    });

    const productsWithHpp = await Promise.all(
      data.map(async (product) => {
        const latestItem = await this.db.query.purchaseItems.findFirst({
          where: eq(schema.purchaseItems.productId, product.id),
          orderBy: (items, { desc }) => [desc(items.createdAt)],
        });
        return {
          ...product,
          currentHpp: latestItem?.unitCost || 0,
        };
      }),
    );

    const totalItemsResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(where);
    const totalItems = Number(totalItemsResult[0].count);

    return {
      data: productsWithHpp,
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

    if (!product) {
      return null;
    }

    const normalizedImages = (product.images || []).map((img) => ({
      ...img,
      url: this.normalizeImageUrl(img.url),
    }));

    const primaryImage = normalizedImages.find((img) => img.isPrimary) || normalizedImages[0];
    const displayImageUrl = primaryImage ? primaryImage.url : this.normalizeImageUrl(null);

    // Get latest supplier for this product
    const latestPurchaseItem = await this.db.query.purchaseItems.findFirst({
      where: eq(schema.purchaseItems.productId, id),
      with: {
        purchase: {
          with: {
            supplier: true,
          },
        },
      },
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });

    const latestSupplier = latestPurchaseItem?.purchase?.supplier || null;
    const currentHpp = latestPurchaseItem?.unitCost || 0;

    return {
      ...product,
      images: normalizedImages,
      imageUrl: displayImageUrl,
      latestSupplier,
      currentHpp,
    };
  }

  async create(dto: CreateProductDto) {
    return await this.db.transaction(async (tx) => {
      // 1. Insert product
      const [product] = await tx
        .insert(schema.products)
        .values({
          name: dto.name,
          description: dto.description,
          brandId: dto.brandId,
          taste: dto.taste,
        })
        .returning();

      // 2. Insert images if provided
      if (dto.images && dto.images.length > 0) {
        await tx.insert(schema.productImages).values(
          dto.images.map((img) => ({
            productId: product.id,
            url: img.url,
            isPrimary: img.isPrimary ?? false,
          })),
        );
      }

      // 3. Insert variants if provided
      if (dto.variants && dto.variants.length > 0) {
        await tx.insert(schema.productVariants).values(
          dto.variants.map((v) => ({
            productId: product.id,
            package: v.package,
            price: v.price,
            stock: v.initialStock ?? 0,
            sku: v.sku,
            sizeInGram: v.sizeInGram,
          })),
        );
      }

      return this.findOne(product.id);
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    return await this.db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, id),
      });

      if (!product) {
        throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
      }

      // 1. Update basic product info
      const updateValues: Partial<typeof schema.products.$inferInsert> = {};
      if (dto.name !== undefined) updateValues.name = dto.name;
      if (dto.description !== undefined) updateValues.description = dto.description;
      if (dto.brandId !== undefined) updateValues.brandId = dto.brandId;
      if (dto.taste !== undefined) updateValues.taste = dto.taste;

      if (Object.keys(updateValues).length > 0) {
        await tx
          .update(schema.products)
          .set(updateValues)
          .where(eq(schema.products.id, id));
      }

      // 2. Remove images if requested
      if (dto.removeImageIds && dto.removeImageIds.length > 0) {
        await tx
          .delete(schema.productImages)
          .where(
            and(
              eq(schema.productImages.productId, id),
              inArray(schema.productImages.id, dto.removeImageIds)
            )
          );
      }

      // 3. Handle image updates/additions
      if (dto.images && dto.images.length > 0) {
        for (const imgDto of dto.images) {
          if (imgDto.id) {
            // Update existing image
            await tx
              .update(schema.productImages)
              .set({
                url: imgDto.url,
                isPrimary: imgDto.isPrimary,
              })
              .where(
                and(
                  eq(schema.productImages.id, imgDto.id),
                  eq(schema.productImages.productId, id)
                )
              );
          } else {
            // Add new image
            await tx.insert(schema.productImages).values({
              productId: id,
              url: imgDto.url,
              isPrimary: imgDto.isPrimary,
            });
          }
        }
      }

      return this.findOne(id);
    });
  }

  async findBrands(search?: string) {
    if (search) {
      return this.db.query.brands.findMany({
        where: like(schema.brands.name, `%${search}%`),
        orderBy: (brands, { asc }) => [asc(brands.name)],
      });
    }
    return this.db.query.brands.findMany({
      orderBy: (brands, { asc }) => [asc(brands.name)],
    });
  }

  async createBrand(dto: CreateBrandDto) {
    const [brand] = await this.db
      .insert(schema.brands)
      .values({
        name: dto.name,
      })
      .returning();
    return brand;
  }

  async createVariant(productId: string, dto: { package: string; price: number; initialStock?: number; sku?: string; sizeInGram?: number }) {
    return await this.db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, productId),
      });

      if (!product) {
        throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan`);
      }

      const lastVariant = await tx.query.productVariants.findFirst({
        where: eq(schema.productVariants.productId, productId),
        orderBy: [desc(schema.productVariants.createdAt)],
      });

      const sku = dto.sku || generateNextSku(lastVariant?.sku || null);

      const [variant] = await tx
        .insert(schema.productVariants)
        .values({
          productId,
          package: dto.package as typeof schema.productVariantLabelEnum.enumValues[number],
          price: dto.price,
          stock: dto.initialStock ?? 0,
          sku,
          sizeInGram: dto.sizeInGram,
        })
        .returning();

      return variant;
    });
  }
}
