```markdown
# pns-server Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns and conventions for the `pns-server` TypeScript backend. The repository is organized around modular features, with a focus on clear separation of concerns (controllers, services, DTOs) and conventional commit practices. You’ll learn how to add or update API endpoints, modify the database schema, develop new features with tests, refactor data models, and update documentation—all following the project's established workflows.

---

## Coding Conventions

- **Language:** TypeScript (no framework detected)
- **File Naming:** camelCase (e.g., `userController.ts`, `orderService.ts`)
- **Import Style:** Absolute imports  
  ```ts
  import { UserService } from 'src/modules/user/userService';
  ```
- **Export Style:** Named exports  
  ```ts
  export function createOrder() { ... }
  export const ORDER_STATUSES = ['pending', 'complete'];
  ```
- **Commit Messages:** Conventional commits  
  - Prefixes: `feat`, `refactor`, `fix`, `docs`
  - Example:  
    ```
    feat(order): add filtering by status to order list endpoint
    ```

---

## Workflows

### Add or Update API Endpoint
**Trigger:** When you need to add or enhance an API endpoint (e.g., filtering, search, new resource, or variant).  
**Command:** `/add-endpoint`

1. Edit or create the controller file for the relevant module:  
   `src/modules/<module>/<module>.controller.ts`
2. Edit or create the service file for the module:  
   `src/modules/<module>/<module>.service.ts`
3. Edit or create DTO files if the request/response shape changes:  
   `src/modules/<module>/dto/*.ts`
4. Optionally update the module file if new dependencies/providers are added:  
   `src/modules/<module>/<module>.module.ts`
5. Optionally add or update tests:  
   `test/<module>.spec.ts`

**Example:**
```ts
// src/modules/product/product.controller.ts
import { ProductService } from 'src/modules/product/product.service';
import { CreateProductDto } from 'src/modules/product/dto/createProductDto';

export function createProduct(req, res) {
  const dto = new CreateProductDto(req.body);
  const product = ProductService.create(dto);
  res.json(product);
}
```

---

### Add or Update Database Schema
**Trigger:** When you need to change the database structure (e.g., add a column, new table, enum, or relation).  
**Command:** `/new-table`

1. Edit `src/db/schema.ts` to reflect schema changes.
2. Generate and add a migration SQL file:  
   `drizzle/<timestamp>_migration.sql`
3. Update related DTOs and services to use new/changed fields.
4. Optionally update seed or test data:  
   `src/db/seed*.ts`

**Example:**
```ts
// src/db/schema.ts
export const Product = table('products', {
  id: column.number(),
  name: column.string(),
  status: column.enum(['active', 'archived']),
});
```
```sql
-- drizzle/20240401_add_product_status.sql
ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'active';
```

---

### Feature Development with Tests
**Trigger:** When introducing a new business domain or major feature (e.g., consignment, employees, store-settings).  
**Command:** `/new-feature`

1. Create or edit controller, service, module, and DTO files for the new feature:
   - `src/modules/<feature>/*.controller.ts`
   - `src/modules/<feature>/*.service.ts`
   - `src/modules/<feature>/*.module.ts`
   - `src/modules/<feature>/dto/*.ts`
2. Edit `src/app.module.ts` to register the new module.
3. Write or update e2e/unit tests in the `test/` directory.
4. Update documentation or issue tracking files if relevant.

**Example:**
```ts
// src/modules/employee/employee.module.ts
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

export const EmployeeModule = {
  controllers: [EmployeeController],
  providers: [EmployeeService],
};
```

---

### Refactor Schema and DTO Alignment
**Trigger:** When you need to rename fields, update enums, or align DTOs with schema changes.  
**Command:** `/refactor-schema`

1. Edit `src/db/schema.ts` for field/enum changes.
2. Edit all affected DTOs and service files:
   - `src/modules/<module>/dto/*.ts`
   - `src/modules/<module>/*.service.ts`
3. Update seed or test data if necessary:
   - `src/db/seed*.ts`

**Example:**
```ts
// src/db/schema.ts
// Rename 'type' to 'category' in Product
```
```ts
// src/modules/product/dto/productDto.ts
export interface ProductDto {
  id: number;
  name: string;
  category: string; // updated from 'type'
}
```

---

### Document Feature or Architecture
**Trigger:** When you need to document new features, update the README, or add developer guidelines.  
**Command:** `/update-docs`

1. Edit or create `README.md` or `AGENTS.md`.
2. Document new modules, endpoints, or architectural decisions.

**Example:**
```md
## Consignment Module
Handles the management of consignment inventory, including intake, tracking, and settlement.
```

---

## Testing Patterns

- **Framework:** Jest
- **Test File Pattern:** `*.spec.ts`
- **Test Location:** Typically in `test/` directory or alongside modules.
- **Example:**
  ```ts
  // test/product.service.spec.ts
  import { ProductService } from 'src/modules/product/product.service';

  describe('ProductService', () => {
    it('should create a product', () => {
      const product = ProductService.create({ name: 'Test', status: 'active' });
      expect(product).toHaveProperty('id');
    });
  });
  ```

---

## Commands

| Command         | Purpose                                                |
|-----------------|--------------------------------------------------------|
| /add-endpoint   | Add or update an API endpoint (controller/service/DTO) |
| /new-table      | Add or modify database schema and migrations           |
| /new-feature    | Develop a new module or major feature with tests       |
| /refactor-schema| Refactor schema and DTOs for alignment                 |
| /update-docs    | Update documentation or developer guidelines           |
```
