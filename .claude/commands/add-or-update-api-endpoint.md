---
name: add-or-update-api-endpoint
description: Workflow command scaffold for add-or-update-api-endpoint in pns-server.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-api-endpoint

Use this workflow when working on **add-or-update-api-endpoint** in `pns-server`.

## Goal

Implements a new API endpoint or modifies an existing one, including controller, service, and sometimes DTO updates.

## Common Files

- `src/modules/*/*.controller.ts`
- `src/modules/*/*.service.ts`
- `src/modules/*/dto/*.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update controller method in src/modules/[module]/[module].controller.ts
- Implement or update logic in src/modules/[module]/[module].service.ts
- If needed, update or add DTOs in src/modules/[module]/dto/
- Update module file if new provider/controller is added

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.