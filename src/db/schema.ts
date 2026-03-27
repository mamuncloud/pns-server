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

export const productTasteEnum = pgEnum("ProductTaste", ["GURIH", "PEDAS", "MANIS"]);

export const productVariantLabelEnum = pgEnum("ProductVariantLabel", [
  "ES3",
  "ES4",
  "250gr",
  "500gr",
  "1kg",
  "bal",
]);

export const purchaseStatusEnum = pgEnum("PurchaseStatus", ["DRAFT", "COMPLETED"]);

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
  brandId: varchar("brandId", { length: 255 }).references(() => brands.id),
  taste: productTasteEnum("taste")
    .array()
    .notNull()
    .default(sql`'{}'::"ProductTaste"[]`),
  isActive: boolean("isActive").default(true).notNull(),
  currentHpp: integer("currentHpp").default(0).notNull(),
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
  label: productVariantLabelEnum("label").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").default(0).notNull(),
  sku: varchar("sku", { length: 255 }).unique(),
  sizeInGram: integer("sizeInGram"),
  expiredDate: timestamp("expiredDate"),
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


export const loyaltyPoints = pgTable("loyalty_points", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 255 })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  points: integer("points").notNull(),
  type: varchar("type", { length: 255 }).notNull(), // e.g., "EARN", "REDEEM"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const productImages = pgTable("product_images", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("productId", { length: 255 })
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  address: text("address"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const purchases = pgTable("purchases", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  supplierId: varchar("supplierId", { length: 255 })
    .references(() => suppliers.id)
    .notNull(),
  date: timestamp("date").notNull(),
  note: text("note"),
  status: purchaseStatusEnum("status").default("DRAFT").notNull(),
  totalAmount: integer("totalAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const purchaseItems = pgTable("purchase_items", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseId: varchar("purchaseId", { length: 255 })
    .references(() => purchases.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("productId", { length: 255 })
    .references(() => products.id)
    .notNull(),
  variantLabel: productVariantLabelEnum("variantLabel"),
  qty: integer("qty").notNull(),
  totalCost: integer("totalCost").notNull(),
  extraCosts: integer("extraCosts").default(0).notNull(),
  unitCost: integer("unitCost").notNull(),
  sellingPrice: integer("sellingPrice").notNull(),
  expiredDate: timestamp("expiredDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});


export const storeSettings = pgTable("store_settings", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  isStoreOpen: boolean("isStoreOpen").default(true).notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
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
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
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

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));
