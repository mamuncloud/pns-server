# [BUG] Auth login creates orphaned tokens for invalid identifier formats

## What

When `requestLogin` receives an identifier that is neither a valid email nor phone number, it creates a token with `channel: null` but never sends a magic link, leaving orphaned tokens in the database.

## Why

- Wastes database storage
- Creates tokens that can never be used
- No feedback to user that identifier format is invalid

## How

Add validation after channel detection to reject invalid formats before creating tokens:

```typescript
if (!channel) {
  throw new BadRequestException(
    'Invalid identifier. Please provide a valid email or phone number.',
  );
}
```

## Files affected

- `src/modules/auth/auth.service.ts`

## Acceptance criteria

- [ ] Invalid identifier formats (non-email, non-phone) return 400 error
- [ ] No token is created when identifier format is invalid
- [ ] Schema change for `channel` field needs a migration
