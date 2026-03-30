# [FEATURE] Implement Staff Management (Server)

## What
Implement a complete Staff Management backend feature including employee CRUD endpoints and role-based access control.

## Why
Managers need a way to add, list, update, and manage access for cashiers and other generic staff directly from the dashboard. This requires strong API security ensuring lower roles cannot manipulate sibling accounts.

## How
- Create `EmployeesModule`, `EmployeesService`, and `EmployeesController`.
- Implement RBAC via `RolesGuard` limiting access to the `MANAGER` role.
- Add `CreateEmployeeDto` and `UpdateEmployeeDto` with strict validation.
- Interface with `Resend` through `MailsService` to dispatch invitation/welcome emails.
