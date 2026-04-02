---
name: add-or-extend-api-endpoint
description: Workflow command scaffold for add-or-extend-api-endpoint in pns-server.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-extend-api-endpoint

Use this workflow when working on **add-or-extend-api-endpoint** in `pns-server`.

## Goal

Implements or extends an API endpoint, typically involving controller and service logic, sometimes with DTOs and module updates.

## Common Files

- `src/modules/*/*.controller.ts`
- `src/modules/*/*.service.ts`
- `src/modules/*/dto/*.dto.ts`
- `src/modules/*/*.module.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update controller method in the relevant module's controller file.
- Implement or update business logic in the corresponding service file.
- Optionally, update or create DTOs for request/response validation.
- Optionally, update the module file to register new providers or controllers.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.