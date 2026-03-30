## Summary
[FEATURE] Implement Unified Staff Login with WhatsApp Magic Link

## Environment
- **Product/Service**: pns-server (NestJS)
- **Database**: PostgreSQL (Drizzle ORM)

## Description
This feature implements a unified staff login system that allows employees to request magic links via Email or WhatsApp. A new embedded WhatsApp service was added to handle real-time notifications.

## Key Changes
- **WhatsappModule**: Embedded `@whiskeysockets/baileys` for WhatsApp connection management.
- **Session Persistence**: Implemented multi-file auth state in `src/modules/whatsapp/session`.
- **Unified Auth Endpoint**: `POST /auth/staff/request` detects if the identifier is an email or phone number and routes the magic link accordingly.
- **Database Schema**: Added `phone` column to `employees` table.
- **Management API**: Added status and logout endpoints for session control.

## Impact
**Medium** - Enhances staff accessibility and provides an alternative to email-only magic links.

## Additional Context
The WhatsApp pairing process requires scanning a QR code logged in the server terminal on first run.
