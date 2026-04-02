```markdown
# pns-server Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns, coding conventions, and workflows for contributing to the `pns-server` TypeScript backend. The repository is organized into domain modules, each with its own controller, service, and DTOs, and follows clear, conventional commit and code organization standards. It includes robust testing with Jest and emphasizes maintainable, scalable patterns for adding features, updating the database schema, and enforcing authentication and authorization.

---

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for file names.
  ```
  // Good
  consignmentController.ts
  storeSettingsService.ts

  // Bad
  consignment_controller.ts
  store-settings.service.ts
  ```

- **Import Style:**  
  Use **absolute imports** from the project root.
  ```typescript
  import { ConsignmentService } from 'src/modules/consignment/consignment.service';
  ```

- **Export Style:**  
  Use **named exports**.
  ```typescript
  // Good
  export function calculateFee() { ... }

  // Bad
  export default function calculateFee() { ... }
  ```

- **Commit Messages:**  
  Use [Conventional Commits](https://www.conventionalcommits.org/) with prefixes:
  - `feat`: New features
  - `fix`: Bug fixes
  - `refactor`: Code refactoring
  - `docs`: Documentation changes

  Example:
  ```
  feat(consignment): add endpoint for bulk import
  ```

---

## Workflows

### Add or Update API Endpoint
**Trigger:** When you need to add or modify an API endpoint for a resource  
**Command:** `/new-endpoint`

1. Create or update the controller method in `src/modules/[module]/[module].controller.ts`.
2. Implement or update the logic in `src/modules/[module]/[module].service.ts`.
3. If needed, update or add DTOs in `src/modules/[module]/dto/`.
4. Update the module file if a new provider/controller is added.

**Example:**
```typescript
// src/modules/consignment/consignment.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ConsignmentService } from './consignment.service';
import { CreateConsignmentDto } from './dto/createConsignment.dto';

@Controller('consignment')
export class ConsignmentController {
  constructor(private readonly service: ConsignmentService) {}

  @Post()
  create(@Body() dto: CreateConsignmentDto) {
    return this.service.create(dto);
  }
}
```

---

### Add New Feature Module
**Trigger:** When introducing a new business domain or feature area  
**Command:** `/new-module`

1. Create module, controller, and service files in `src/modules/[feature]/`.
2. Add DTOs for input validation in `src/modules/[feature]/dto/`.
3. Register the module in `src/app.module.ts`.
4. Update the schema if persistence is needed (`src/db/schema.ts`).
5. Add e2e or unit tests if applicable.

**Example:**
```typescript
// src/modules/employees/employees.module.ts
import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
```

---

### Database Schema and DTO Alignment
**Trigger:** When adding or changing a database field, enum, or table  
**Command:** `/update-schema`

1. Update `src/db/schema.ts` for schema changes.
2. Update related DTOs in `src/modules/*/dto/`.
3. Update affected service logic in `src/modules/*/*.service.ts`.
4. Update seed or migration scripts if necessary.

**Example:**
```typescript
// src/db/schema.ts
export enum ConsignmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// src/modules/consignment/dto/updateConsignment.dto.ts
export class UpdateConsignmentDto {
  status?: ConsignmentStatus;
}
```

---

### Feature Implementation with Tests
**Trigger:** When implementing a new feature and ensuring test coverage  
**Command:** `/feature-with-tests`

1. Implement feature logic in controller, service, and DTOs.
2. Add or update test files in `test/`.
3. Update test utilities or configs if needed.

**Example:**
```typescript
// test/consignment.spec.ts
import { ConsignmentService } from 'src/modules/consignment/consignment.service';

describe('ConsignmentService', () => {
  it('should create a consignment', async () => {
    // ...test logic
  });
});
```

---

### Role-Based Access Control and Auth Updates
**Trigger:** When securing endpoints or updating authentication/authorization logic  
**Command:** `/update-auth`

1. Update or add guards and decorators in `src/modules/auth/guards/` and `src/modules/auth/decorators/`.
2. Update controller files to use guards/decorators.
3. Update auth service or module as needed.
4. Update `.env.example` if config changes.

**Example:**
```typescript
// src/modules/auth/guards/jwtAuth.guard.ts
import { CanActivate, ExecutionContext } from '@nestjs/common';

export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // ...auth logic
    return true;
  }
}

// src/modules/consignment/consignment.controller.ts
@UseGuards(JwtAuthGuard)
@Post()
create(@Body() dto: CreateConsignmentDto) { ... }
```

---

### Refactor Enum or Field Across Schema, DTO, Service
**Trigger:** When renaming or refactoring a field or enum used in multiple layers  
**Command:** `/refactor-enum`

1. Update the enum or field in `src/db/schema.ts`.
2. Update all affected DTOs in `src/modules/*/dto/`.
3. Update service logic in `src/modules/*/*.service.ts`.
4. Update seed data if necessary.

**Example:**
```typescript
// src/db/schema.ts
export enum ConsignmentType {
  STANDARD = 'standard',
  EXPRESS = 'express',
}

// src/modules/consignment/dto/createConsignment.dto.ts
export class CreateConsignmentDto {
  type: ConsignmentType;
}
```

---

## Testing Patterns

- **Framework:** [Jest](https://jestjs.io/)
- **File Pattern:** `*.spec.ts` (unit and e2e tests)
- **Location:** Typically in `test/` directory or alongside modules

**Example:**
```typescript
// test/storeSettings.spec.ts
import { StoreSettingsService } from 'src/modules/storeSettings/storeSettings.service';

describe('StoreSettingsService', () => {
  it('should update settings', async () => {
    // ...test logic
  });
});
```

---

## Commands

| Command            | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| /new-endpoint      | Add or update an API endpoint for a resource                   |
| /new-module        | Add a new feature/domain module                                |
| /update-schema     | Update database schema and align DTOs/services                 |
| /feature-with-tests| Implement a feature with corresponding tests                   |
| /update-auth       | Update authentication or role-based access control             |
| /refactor-enum     | Refactor or rename enums/fields across schema, DTO, and service|
```
