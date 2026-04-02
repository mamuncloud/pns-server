```markdown
# pns-server Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the development patterns, coding conventions, and typical workflows for contributing to the `pns-server` TypeScript backend. The codebase is organized into modules, each with controllers, services, DTOs, and tests. Conventional commits, clear file structure, and a focus on testability and documentation are emphasized. This guide will help you add features, extend APIs, update schemas, fix bugs, and write tests in a consistent manner.

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for file names.  
  *Example:*  
  ```
  src/modules/user/userController.ts
  src/modules/order/orderService.ts
  ```

- **Import Style:**  
  Use absolute imports from the `src` root.  
  *Example:*  
  ```typescript
  import { UserService } from 'src/modules/user/userService';
  ```

- **Export Style:**  
  Use **named exports** for all modules.  
  *Example:*  
  ```typescript
  export function createUser() { ... }
  export const USER_ROLE = 'admin';
  ```

- **Commit Messages:**  
  Use [Conventional Commits](https://www.conventionalcommits.org/) with prefixes: `feat`, `refactor`, `fix`, `docs`.  
  *Example:*  
  ```
  feat(user): add endpoint for user registration
  fix(order): correct total calculation in orderService
  ```

## Workflows

### Add or Extend API Endpoint
**Trigger:** When you need to add a new API endpoint or extend an existing one  
**Command:** `/new-endpoint`

1. **Create or update controller method**  
   Edit the relevant controller in `src/modules/*/*.controller.ts`:
   ```typescript
   // src/modules/user/user.controller.ts
   export const getUserProfile = (req, res) => { ... };
   ```
2. **Implement or update business logic**  
   Update the corresponding service in `src/modules/*/*.service.ts`:
   ```typescript
   // src/modules/user/user.service.ts
   export function getUserProfile(userId: string) { ... }
   ```
3. **(Optional) Update or create DTOs**  
   For request/response validation in `src/modules/*/dto/*.dto.ts`:
   ```typescript
   // src/modules/user/dto/getUserProfile.dto.ts
   export interface GetUserProfileDto { ... }
   ```
4. **(Optional) Update the module file**  
   Register new providers/controllers in `src/modules/*/*.module.ts`.

---

### Add New Module with CRUD and Tests
**Trigger:** When adding a new feature area or resource  
**Command:** `/new-module`

1. **Create controller, service, and module files**  
   ```
   src/modules/feature/feature.controller.ts
   src/modules/feature/feature.service.ts
   src/modules/feature/feature.module.ts
   ```
2. **Define DTOs**  
   For create/update operations in `src/modules/feature/dto/*.dto.ts`.
3. **Update schema**  
   Add tables/fields in `src/db/schema.ts`:
   ```typescript
   // src/db/schema.ts
   export const FeatureTable = { ... };
   ```
4. **Register the module**  
   In `src/app.module.ts`:
   ```typescript
   import { FeatureModule } from 'src/modules/feature/feature.module';
   ```
5. **Add or update tests**  
   For e2e coverage in `test/feature.e2e-spec.ts`.

---

### Add or Update Database Schema and Propagate
**Trigger:** When adding/updating tables, columns, or schema for new features  
**Command:** `/new-table`

1. **Update schema**  
   Edit `src/db/schema.ts` to define new tables/columns.
2. **Update related DTOs**  
   Reflect schema changes in `src/modules/*/dto/*.dto.ts`.
3. **Update service logic**  
   Handle new/changed fields in `src/modules/*/*.service.ts`.
4. **(Optional) Update seed/migration scripts**  
   In `src/db/seed*.ts`.

---

### Feature Development with Documentation
**Trigger:** When delivering a complete feature with code, docs, and tests  
**Command:** `/new-feature`

1. **Implement feature logic**  
   In service/controller files.
2. **Write or update tests**  
   Unit/e2e tests in `test/*.e2e-spec.ts`.
3. **Update documentation**  
   In `README.md` or `AGENTS.md`.

---

### Bugfix: Controller, Service, DTO
**Trigger:** When fixing bugs affecting API behavior or data handling  
**Command:** `/bugfix`

1. **Fix the bug in service logic**  
   Update `src/modules/*/*.service.ts`.
2. **Update controller if needed**  
   In `src/modules/*/*.controller.ts`.
3. **Modify DTOs if validation/data shape needs correction**  
   In `src/modules/*/dto/*.dto.ts`.

---

## Testing Patterns

- **Framework:** [Jest](https://jestjs.io/)
- **Test File Pattern:**  
  - Unit and e2e tests use `*.spec.ts` suffix.
  - E2E tests are typically in `test/*.e2e-spec.ts`.
- **Example Test File:**
  ```typescript
  // test/user.e2e-spec.ts
  import { getUserProfile } from 'src/modules/user/user.service';

  describe('User Profile', () => {
    it('should return user profile for valid ID', async () => {
      const profile = await getUserProfile('123');
      expect(profile).toHaveProperty('id', '123');
    });
  });
  ```

## Commands

| Command        | Purpose                                                        |
|----------------|----------------------------------------------------------------|
| /new-endpoint  | Add or extend an API endpoint                                  |
| /new-module    | Add a new module with CRUD, schema, and tests                  |
| /new-table     | Add or update database schema and propagate changes            |
| /new-feature   | Implement a new feature with code, tests, and documentation    |
| /bugfix        | Fix bugs in controller, service, or DTO                        |
```