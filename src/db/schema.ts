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

export const employeeRoleEnum = pgEnum("EmployeeRole", ["MANAGER", "CASHIER"]);

export const pricingTypeEnum = pgEnum("PricingType", ["WEIGHT", "FIXED_PRICE", "BULK"]);

export const adjustmentReasonEnum = pgEnum("AdjustmentReason", [
  "DEFECT",
  "EXPIRED",
  "LOST",
  "RESTOCK",
  "PURCHASE",
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

export const employees = pgTable("employees", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: employeeRoleEnum("role").notNull().default("CASHIER"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const authTokens = pgTable("auth_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employeeId", { length: 255 })
    .references(() => employees.id, { onDelete: "cascade" }),
  userId: varchar("userId", { length: 255 })
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const brands = pgTable("brands", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
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
  brandId: varchar("brandId", { length: 255 }).references(() => brands.id),
  sellingPrice: integer("sellingPrice").default(0).notNull(),
  currentHpp: integer("currentHpp").default(0).notNull(),
  stockQty: integer("stockQty").default(0).notNull(),
  baseCostPerGram: integer("baseCostPerGram").default(0).notNull(),
  packagingCost: integer("packagingCost").default(0).notNull(),
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

export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("productId", { length: 255 })
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  type: pricingTypeEnum("type").notNull(),
  weightGram: integer("weightGram"),
  targetPrice: integer("targetPrice"),
  marginPct: integer("marginPct").notNull(),
  rounding: integer("rounding").default(100).notNull(),
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
  pricingRuleId: varchar("pricingRuleId", { length: 255 })
    .references(() => pricingRules.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const stockAdjustments = pgTable("stock_adjustments", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("productId", { length: 255 })
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  qty: integer("qty").notNull(),
  reason: adjustmentReasonEnum("reason").notNull(),
  hppSnapshot: integer("hppSnapshot").notNull(),
  totalLoss: integer("totalLoss").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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

export const employeesRelations = relations(employees, ({ many }) => ({
  authTokens: many(authTokens),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  employee: one(employees, {
    fields: [authTokens.employeeId],
    references: [employees.id],
  }),
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  variants: many(productVariants),
  pricingRules: many(pricingRules),
  stockAdjustments: many(stockAdjustments),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one, many }) => ({
  product: one(products, {
    fields: [pricingRules.productId],
    references: [products.id],
  }),
  orderItems: many(orderItems),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  product: one(products, {
    fields: [stockAdjustments.productId],
    references: [products.id],
  }),
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
  pricingRule: one(pricingRules, {
    fields: [orderItems.pricingRuleId],
    references: [pricingRules.id],
  }),
}));

export const loyaltyPointsRelations = relations(loyaltyPoints, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyPoints.userId],
    references: [users.id],
  }),
}));
