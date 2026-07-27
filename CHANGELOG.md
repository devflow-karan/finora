# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-07-27

### Added
- **Account Balance Management**: Dedicated backend endpoints (`GET /accounts`, `PUT /accounts/:id`) and frontend Manage Accounts dialog to view and update opening balances.
- **Account-Based Transaction Filters**: Integrated Account dropdown in the transactions filter bar to filter records by account name.
- **Dynamic Account Dropdown**: Replaced text input in the transaction details form with a select dropdown referencing active accounts and an inline "+ Create New..." option.

## [0.2.0] - 2026-07-27


### Added
- **CSV Transaction Export**: Added support for exporting all transaction records to a CSV file.
- **Join Resolution**: CSV fields automatically resolve join identifiers (e.g. Account ID, Investment ID) to their readable names (Account Name, Investment Name).
- **Export Filters**: Exported CSV data respects the active date range, search query, type, and category filters selected in the frontend.

## [0.1.0] - 2026-07-05


### Added
- **Backend Service (NestJS)**: Full authentication, daily transactions tracking, budget limits, loan EMI amortization visualizer, CAGR/XIRR investment portfolio computations, insurance status checks, and goals.
- **Frontend SPA (Vite + React)**: Integrated theme routing, side nav, interactive dashboard graphs (Recharts), statement upload dialogs, and AI coach recommendation notifications.
- **Database Engine (Prisma 7)**: Configured PostgreSQL migrations, schemas, and a seeding pipeline populated with authentic Indian family financial profiles.
- **API Spec (Swagger)**: Configured auto-generating swagger UI docs served at `/api/docs`.
