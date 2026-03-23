import { pgTable, varchar, integer, boolean, timestamp, pgEnum, text } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums (Must match PascalCase names in DB)
export const orderTypeEnum = pgEnum("OrderType", ["PRE_ORDER", "WALK_IN"]);
export const orderStatusEnum = pgEnum("OrderStatus", [
  "PENDING",
  "PAID",
  "FAILED",
  "READY",
  "COMPLETED",
  "CANCELLED",
]);

// Tables
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  totalPoints: integer("totalPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const products = pgTable("products", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  taste: text("taste")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const productVariants = pgTable("product_variants", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("productId", { length: 255 })
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").default(0).notNull(),
  sku: varchar("sku", { length: 255 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orders = pgTable("orders", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 255 }).references(() => users.id),
  orderType: orderTypeEnum("orderType").notNull(),
  totalAmount: integer("totalAmount").notNull(),
  status: orderStatusEnum("status").default("PENDING").notNull(),
  qrCode: text("qrCode"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: varchar("orderId", { length: 255 })
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productVariantId: varchar("productVariantId", { length: 255 })
    .references(() => productVariants.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const loyaltyPoints = pgTable("loyalty_points", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 255 })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  points: integer("points").notNull(),
  type: varchar("type", { length: 255 }).notNull(), // e.g., "EARN", "REDEEM"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  loyaltyPoints: many(loyaltyPoints),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  productVariant: one(productVariants, {
    fields: [orderItems.productVariantId],
    references: [productVariants.id],
  }),
}));

export const loyaltyPointsRelations = relations(loyaltyPoints, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyPoints.userId],
    references: [users.id],
  }),
}));
