# PNS Server

A high-performance backend server built with Bun, Elysia, and Drizzle ORM.

## Tech Stack
- **Runtime:** Bun
- **Framework:** [ElysiaJS](https://elysiajs.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL (with `node-postgres`)
- **Logging:** Pino

## Development

```bash
bun install
bun run dev
```

### Database Commands
- `bun run db:generate`: Generate migrations from schema
- `bun run db:migrate`: Apply migrations to database
- `bun run db:studio`: Open Drizzle Studio UI

### Automated Cleanup
This project includes a strict automated cleanup mechanism powered by **Husky**, **Knip**, and **ESLint**.

- **What it does**: automatically removes unused imports, variables, and **deletes unused files** before every commit.
- **Manual trigger**: `bun run cleanup`

## Deploy

```bash
vc deploy
```
