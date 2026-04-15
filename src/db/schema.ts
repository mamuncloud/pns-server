import { pgTable, varchar, integer, boolean, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums (Must match PascalCase names in DB)
export const orderTypeEnum = pgEnum('OrderType', ['PRE_ORDER', 'WALK_IN']);
export const orderStatusEnum = pgEnum('OrderStatus', [
  'PENDING',
  'PAID',
  'FAILED',
  'READY',
  'COMPLETED',
  'CANCELLED',
]);

export const employeeRoleEnum = pgEnum('EmployeeRole', ['MANAGER', 'CASHIER']);

export const productTasteEnum = pgEnum('ProductTaste', ['GURIH', 'PEDAS', 'MANIS']);

export const productVariantLabelEnum = pgEnum('ProductVariantLabel', [
  'Medium',
  'Small',
  '250gr',
  '500gr',
  '1kg',
  'bal',
]);

export const purchaseStatusEnum = pgEnum('PurchaseStatus', ['DRAFT', 'COMPLETED']);

export const stockMovementTypeEnum = pgEnum('StockMovementType', [
  'PURCHASE',
  'PURCHASE_REVERSAL',
  'SALE',
  'REPACK_SOURCE',
  'REPACK_TARGET',
  'ADJUSTMENT',
  'RETURN',
  'EVENT_ALLOCATION',
  'EVENT_RETURN',
]);

export const paymentMethodEnum = pgEnum('PaymentMethod', ['CASH', 'EDC_BCA', 'MAYAR']);

export const transactionTypeEnum = pgEnum('TransactionType', ['INCOME', 'EXPENSE']);

export const transactionCategoryEnum = pgEnum('TransactionCategory', [
  'SALES',
  'STOCK_PURCHASE',
  'OPERATIONAL_EXPENSE',
  'CAPITAL_INJECTION',
  'ADJUSTMENT',
]);

export const paymentStatusEnum = pgEnum('PaymentStatus', ['PENDING', 'PAID', 'FAILED', 'EXPIRED']);

export const paymentProviderEnum = pgEnum('PaymentProvider', ['MAYAR', 'CASH']);

export const eventStatusEnum = pgEnum('EventStatus', ['OPEN', 'CLOSED']);

// Tables
export const users = pgTable('users', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  totalPoints: integer('totalPoints').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const employees = pgTable('employees', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 16 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: employeeRoleEnum('role').notNull().default('CASHIER'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const authChannelEnum = pgEnum('AuthChannel', ['email', 'phone']);

export const authTokens = pgTable('auth_tokens', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar('employeeId', { length: 255 }).references(() => employees.id, {
    onDelete: 'cascade',
  }),
  userId: varchar('userId', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique().notNull(),
  channel: authChannelEnum('channel'),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar('employeeId', { length: 255 }).references(() => employees.id, {
    onDelete: 'cascade',
  }),
  userId: varchar('userId', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const products = pgTable('products', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  brandId: varchar('brandId', { length: 255 }).references(() => brands.id),
  taste: productTasteEnum('taste')
    .array()
    .notNull()
    .default(sql`'{}'::"ProductTaste"[]`),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const productVariants = pgTable('product_variants', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('productId', { length: 255 })
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  package: productVariantLabelEnum('package').notNull(),
  price: integer('price').notNull(),
  hpp: integer('hpp').default(0).notNull(),
  stock: integer('stock').default(0).notNull(),
  sku: varchar('sku', { length: 255 }).unique(),
  sizeInGram: integer('sizeInGram'),
  expiredDate: timestamp('expiredDate'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orders = pgTable('orders', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('userId', { length: 255 }).references(() => users.id),
  eventId: varchar('eventId', { length: 255 }).references(() => events.id),
  customerName: varchar('customerName', { length: 255 }),
  customerPhone: varchar('customerPhone', { length: 255 }),
  orderType: orderTypeEnum('orderType').notNull(),
  totalAmount: integer('totalAmount').notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  paymentMethod: paymentMethodEnum('paymentMethod').default('CASH').notNull(),
  paidAmount: integer('paidAmount').default(0).notNull(),
  changeAmount: integer('changeAmount').default(0).notNull(),
  qrCode: text('qrCode'),
  paymentUrl: text('paymentUrl'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable('order_items', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: varchar('orderId', { length: 255 })
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productVariantId: varchar('productVariantId', { length: 255 })
    .references(() => productVariants.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const payments = pgTable('payments', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: varchar('orderId', { length: 255 })
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  provider: paymentProviderEnum('provider').notNull().default('MAYAR'),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  amount: integer('amount').notNull(),
  paymentUrl: text('paymentUrl'),
  providerInvoiceId: varchar('providerInvoiceId', { length: 255 }),
  providerTransactionId: varchar('providerTransactionId', { length: 255 }),
  paidAt: timestamp('paidAt'),
  expiresAt: timestamp('expiresAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const loyaltyPoints = pgTable('loyalty_points', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('userId', { length: 255 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  points: integer('points').notNull(),
  type: varchar('type', { length: 255 }).notNull(), // e.g., "EARN", "REDEEM"
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const productImages = pgTable('product_images', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('productId', { length: 255 })
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  url: text('url').notNull(),
  isPrimary: boolean('isPrimary').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  contactName: varchar('contactName', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 255 }),
  address: text('address'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const purchases = pgTable('purchases', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  supplierId: varchar('supplierId', { length: 255 })
    .references(() => suppliers.id)
    .notNull(),
  date: timestamp('date').notNull(),
  note: text('note'),
  status: purchaseStatusEnum('status').default('DRAFT').notNull(),
  totalAmount: integer('totalAmount').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const purchaseItems = pgTable('purchase_items', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  purchaseId: varchar('purchaseId', { length: 255 })
    .references(() => purchases.id, { onDelete: 'cascade' })
    .notNull(),
  productId: varchar('productId', { length: 255 })
    .references(() => products.id)
    .notNull(),
  package: productVariantLabelEnum('package'),
  qty: integer('qty').notNull(),
  totalCost: integer('totalCost').notNull(),
  extraCosts: integer('extraCosts').default(0).notNull(),
  unitCost: integer('unitCost').notNull(),
  sellingPrice: integer('sellingPrice').notNull(),
  sizeInGram: integer('sizeInGram'),
  expiredDate: timestamp('expiredDate'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const storeSettings = pgTable('store_settings', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  isStoreOpen: boolean('isStoreOpen').default(true).notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const stockMovements = pgTable('stock_movements', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productVariantId: varchar('productVariantId', { length: 255 })
    .references(() => productVariants.id, { onDelete: 'cascade' })
    .notNull(),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  balanceAfter: integer('balanceAfter').notNull(),
  referenceId: varchar('referenceId', { length: 255 }),
  note: text('note'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const repacks = pgTable('repacks', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('productId', { length: 255 })
    .references(() => products.id)
    .notNull(),
  sourceVariantId: varchar('sourceVariantId', { length: 255 })
    .references(() => productVariants.id)
    .notNull(),
  sourceQtyUsed: integer('sourceQtyUsed').notNull(),
  note: text('note'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const repackItems = pgTable('repack_items', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  repackId: varchar('repackId', { length: 255 })
    .references(() => repacks.id, { onDelete: 'cascade' })
    .notNull(),
  targetVariantId: varchar('targetVariantId', { length: 255 })
    .references(() => productVariants.id)
    .notNull(),
  qtyProduced: integer('qtyProduced').notNull(),
  sellingPrice: integer('sellingPrice').notNull(),
  sizeInGram: integer('sizeInGram'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const events = pgTable('events', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(), // e.g., "Donation", "Exhibition"
  description: text('description'),
  status: eventStatusEnum('status').default('OPEN').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const eventItems = pgTable('event_items', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: varchar('eventId', { length: 255 })
    .references(() => events.id, { onDelete: 'cascade' })
    .notNull(),
  productVariantId: varchar('productVariantId', { length: 255 })
    .references(() => productVariants.id)
    .notNull(),
  stock: integer('stock').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
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
  refreshTokens: many(refreshTokens),
  expenses: many(expenses),
  financialTransactions: many(financialTransactions),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  employee: one(employees, {
    fields: [refreshTokens.employeeId],
    references: [employees.id],
  }),
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
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
  images: many(productImages),
  repacks: many(repacks),
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

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  orderItems: many(orderItems),
  repacksAsSource: many(repacks),
  repacksAsTarget: many(repackItems),
  stockMovements: many(stockMovements),
  eventItems: many(eventItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [orders.eventId],
    references: [events.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
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

export const repacksRelations = relations(repacks, ({ one, many }) => ({
  product: one(products, {
    fields: [repacks.productId],
    references: [products.id],
  }),
  sourceVariant: one(productVariants, {
    fields: [repacks.sourceVariantId],
    references: [productVariants.id],
  }),
  items: many(repackItems),
}));

export const repackItemsRelations = relations(repackItems, ({ one }) => ({
  repack: one(repacks, {
    fields: [repackItems.repackId],
    references: [repacks.id],
  }),
  targetVariant: one(productVariants, {
    fields: [repackItems.targetVariantId],
    references: [productVariants.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  productVariant: one(productVariants, {
    fields: [stockMovements.productVariantId],
    references: [productVariants.id],
  }),
}));

export const expenseCategories = pgTable('expense_categories', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const expenses = pgTable('expenses', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  categoryId: varchar('categoryId', { length: 255 })
    .references(() => expenseCategories.id)
    .notNull(),
  amount: integer('amount').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  description: text('description'),
  receiptUrl: text('receiptUrl'),
  employeeId: varchar('employeeId', { length: 255 }).references(() => employees.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const financialTransactions = pgTable('financial_transactions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: transactionTypeEnum('type').notNull(),
  category: transactionCategoryEnum('category').notNull(),
  amount: integer('amount').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  description: text('description'),
  paymentMethod: paymentMethodEnum('paymentMethod').default('CASH').notNull(),
  referenceId: varchar('referenceId', { length: 255 }), // Can be Order ID, Purchase ID, or Expense ID
  employeeId: varchar('employeeId', { length: 255 }).references(() => employees.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  employee: one(employees, {
    fields: [expenses.employeeId],
    references: [employees.id],
  }),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  employee: one(employees, {
    fields: [financialTransactions.employeeId],
    references: [employees.id],
  }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  items: many(eventItems),
  orders: many(orders),
}));

export const eventItemsRelations = relations(eventItems, ({ one }) => ({
  event: one(events, {
    fields: [eventItems.eventId],
    references: [events.id],
  }),
  productVariant: one(productVariants, {
    fields: [eventItems.productVariantId],
    references: [productVariants.id],
  }),
}));
