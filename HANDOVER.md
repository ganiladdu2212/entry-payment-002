# Entry Payment handover

## Start here

The application has two projects:

- `db_entry_payment_ui` — Expo / React Native Web UI for web, Android, and iOS.
- `db_entry_payment_api` — Java Spring Boot API.

The visual and flow reference is `reference/gym-app.html`. Preserve it and compare screens against it before making UI changes.

## What has been implemented

- Management, Trainer, and Member login/application flows.
- Dynamic membership plans, personal-training plans, trainers, member onboarding, member details, payment collection/history, reminders, and WhatsApp handoff.
- H2 local development profile and MySQL-ready configuration.
- IST `created_date` is inherited by persistent entities.
- Member onboarding requires a photo, supports a sample photo, validates fields, handles pending first payment, and shows a follow-up success state.
- Collection supports UPI screenshot/UTR and Cash, plan/PT selection, receipt preference, post-payment state, membership expiry, and separate PT expiry storage.
- Trainer-specific restrictions were added in UI for dashboard tiles, automatic reminder settings, and full payment history.

## Last verification

Completed on 2026-11-04:

- UI: `npm run typecheck` passed.
- UI: `npm run build:web` passed.
- API: `mvnw.cmd test` passed with JDK 20 (the project compiles with Java 17 target).

## Current state

- UI port `8081` and API port `8090` were deliberately stopped before this archive was prepared.
- Local H2 uses an in-memory database. Its manual data disappears when the API stops; this archive contains source, not H2 runtime data.
- MySQL migration should be configured on the new system when you are ready for persistent data.
- WhatsApp currently opens the installed WhatsApp app with a prepared message. Fully automatic scheduled WhatsApp delivery requires a WhatsApp Business provider/API.
- Strict API token/role authorization remains a separate hardening task; do not expose the local API publicly until that is completed.

## New-system setup

1. Open this archive folder in Codex.
2. Install dependencies:
   - UI: run `npm install` inside `db_entry_payment_ui`.
   - API: use Java 17+; `mvnw.cmd test` inside `db_entry_payment_api`.
3. Start the API on port 8090, then UI on port 8081.
4. Use `reference/gym-app.html` for every UI/flow comparison.

## Suggested first prompt for the new Codex task

> This is the Entry Payment gym application. Read `HANDOVER.md` and `reference/gym-app.html` first. The UI is in `db_entry_payment_ui` and Spring Boot API is in `db_entry_payment_api`. Keep UI responsive for web, Android, and iOS. Compare every changed flow against the reference, preserve IST created dates, use MySQL for persistent deployment, and do not add automated test cases unless requested.
