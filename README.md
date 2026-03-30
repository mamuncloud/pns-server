# PNS Server

A high-performance backend server built with Bun, NestJS, and Drizzle ORM.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [NestJS 11+](https://nestjs.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL
- **Documentation:** [Scalar UI](https://scalar.com/) (available at `/docs`)
- **Logging:** Pino

## Core Modules
- **Auth:** Magic Link login with "Access + Refresh Token" system, httpOnly cookies, and Role-Based Access Control (RBAC).
- **Products:** Product catalog, inventory management, and variant (package) tracking.
- **Purchases:** Supply chain management, restock flow with automatic HPP calculation, and stock ledger recording.
- **Orders:** Checkout and ordering transactions with automatic stock deduction.
- **Stock:** Centralized stock service for handling movements (Purchases, Orders, Repacks, Adjustments).
- **Repacks:** Split bulk products into smaller retail sizes (e.g., Bal to Small/Medium).
- **WhatsApp Notifier:** Embedded Baileys-based WhatsApp service for sending magic links and system notifications.

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run start:dev

# Start production server
bun run start:prod
```

### Database Commands
- `bun run db:generate`: Generate migrations from schema
- `bun run db:migrate`: Apply migrations to database
- `bun run db:studio`: Open Drizzle Studio UI

### Automated Cleanup
- **Manual trigger**: `bun run cleanup`
- This project uses Husky, Knip, and ESLint to automatically remove unused imports and variables before every commit.

## API Documentation
The API documentation is fully typed and available via Scalar UI at:
`http://localhost:3000/docs`

## Authentication Architecture

The project implements a secure, best-practice authentication system using **Short-Lived Access Tokens** and **Long-Lived Refresh Tokens** stored in cookies.

### Token Strategy
- **Access Token**: Sent in the `Authorization: Bearer` header.
- **Refresh Token**: Sent via a **`httpOnly` Secure Cookie**. This token is stored in the database and is invisible to client-side JavaScript, making it immune to XSS theft.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant Database

    Note over Frontend, Backend: 1. Initial Web Login (Magic Link)
    Frontend->>Backend: POST /auth/request-login (email)
    Backend-->>Frontend: 200 OK (Email sent)
    Frontend->>Backend: GET /auth/verify?token=...
    Backend->>Database: Validate Magic Link & Session
    Backend-->>Frontend: 200 OK (accessToken)
    Note right of Backend: Sets SECURE httpOnly cookie: refresh_token

    Note over Frontend, Backend: 2. Silent Token Refresh (Auto-Interception)
    Frontend->>Backend: GET /api/protected (Expired AccessToken)
    Backend-->>Frontend: 401 Unauthorized
    Frontend->>Backend: POST /auth/refresh (inc. refresh_token cookie)
    Backend->>Database: Validate & Rotate Refresh Token Session
    Backend-->>Frontend: 200 OK (New accessToken)
    Note right of Backend: Updates refresh_token cookie
    Frontend->>Backend: Retry original GET /api/protected
```

### WhatsApp Login Flow

The system supports a unified staff login that automatically detects the input type (Email or Phone).

```mermaid
sequenceDiagram
    participant User
    participant Web as PNS Web (Next.js)
    participant Server as PNS Server (NestJS)
    participant WA as WhatsApp (Baileys)
    participant DB as Database (Postgres)

    User->>Web: Enter Email/Phone
    Web->>Server: POST /auth/staff/request { identifier }
    Server->>DB: Find Employee by Email/Phone
    alt is Email
        Server->>Server: Generate Magic Link Token
        Server->>Server: Send Email
    else is Phone
        Server->>Server: Generate Magic Link Token
        Server->>WA: Send Message (Baileys)
        WA-->>User: Magic Link Received
    end
    Server-->>Web: 200 OK
    
    User->>Web: Click Magic Link
    Web->>Server: GET /auth/verify?token=...
    Server-->>Web: 200 OK (JWT)
    Web->>User: Redirect to Dashboard
```
