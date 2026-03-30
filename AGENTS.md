# Project Architecture and Development Rules (pns-server)

As a Software Architect, the following rules have been established for this project. All AI agents and developers must strictly adhere to these guidelines when making modifications or generating new code.

## 1. Tech Stack Overview
- **Framework:** NestJS 11+
- **Database:** PostgreSQL via Drizzle ORM
- **Language:** TypeScript 5+ (Strict Mode)
- **Package Manager:** Bun

## 2. Core Architectural Principles
- **Modular Design:** NestJS modules should be lean and single-responsibility.
- **API Documentation (Mandatory):** 
  - Every API endpoint MUST include `@nestjs/swagger` decorators.
  - Core decorators: `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiBody`.
  - DTOs MUST use `@ApiProperty` for all fields to ensure the Scalar UI (`/docs`) is fully typed and documented.
- **Type Safety:** Avoid `any` types. Ensure strong typing with TypeScript interfaces or types for service methods and internal logic.
- **Security Strategy (RBAC):**
  - All API controllers or individual methods MUST be encapsulated by `RolesGuard` (using `@UseGuards(JwtAuthGuard, RolesGuard)`).
  - **Public Exceptions:** Only the following endpoints are exempt from role guards:
    - `GET /products` (Listing all products)
    - `GET /products/:id` (Product detail and variants)
    - `GET /store-settings` (Read-only status: open/close)
  - All other state-changing operations (POST, PATCH, DELETE) or sensitive GETs must require appropriate roles (`MANAGER`, `CASHIER`, or `ANY_EMPLOYEE`).

## 3. Database and State Persistence
- **Migration Naming Convention:** All Drizzle migrations MUST follow the format `YYYYMMDD-HHMM-{migration_title_scope}` (e.g., `20260330-0730-add_stock_ledger`).
- **Stock Ledger Pattern:** Every movement of inventory (Purchases, Orders, Repacks, Adjustments) MUST be recorded in the `stock_movements` table. Never update `product_variants.stock` without a corresponding ledger entry.
- **Centralized Stock Service:** All stock-related logic should be encapsulated in a dedicated `StockService` to ensure atomicity and transactional integrity across modules.
- **Drizzle Best Practices:**
  - Use `db.query` for clean, readable data fetching when complex joins aren't required.
  - Use transactions (`db.transaction`) for multi-table updates.

## 4. Coding Conventions
- **Naming Conventions:**
  - Use **PascalCase** for classes, controllers, and services.
  - Use **camelCase** for methods, variables, and properties.
  - DTOs should end with `Dto` (e.g., `CreateProductDto`).
- **Clean Code:** Write modular, single-responsibility functions and methods. 
- **Exports:** Prefer named exports for all classes and utilities.

## 5. Domain-Specific Conventions
- **Product Variant Naming:** Transition all references from `variantLabel` to `package`. Use standardized values: `Small`, `Medium`, `Large`, or specific gram/unit sizes.
- **Currency & Pricing:** Always store prices as integers (cents/lowest unit) to avoid floating-point errors.

## 6. Error Handling and Validation
- **NestJS Exceptions:** Use standard NestJS built-in HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`) with descriptive messages.
- **User-Friendly Errors:** Ensure backend error messages are clear and suitable for direct display in the UI (e.g., "Produk tidak ditemukan").
- **DTO Validation:** Strict validation of all input DTOs using `class-validator` and `class-transformer`.

## 7. Development Workflow Rules
- **Iterative Updates:** Perform modifications carefully in small steps. 
- **Clean up after completion:** Remove any unused files, variables, and dead code.
