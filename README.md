# FreshTrack

**Fresh Food Inventory and Expiry Tracking System**

Households and small grocery stores often lose food, and money, because products expire before they are used or sold. FreshTrack records fresh food products with their quantities and expiry dates, warns about products that are about to expire, and identifies expired stock so it can be removed.

## Objectives

- Record at least 100 food products in the system.
- Display the expiry date and quantity of each registered product.
- Identify products that will expire within the next three days.
- Reduce expired food waste by 20% within three months of use, measured against the baseline waste level.

## Scope

**In scope**
- Registering food products with their quantities and expiry dates
- Viewing the current inventory
- Notifications for products approaching expiry
- Identifying expired products
- Updating quantities when food is used, sold or received
- Reports of expired and expiring products

**Out of scope**
- Online ordering and delivery
- Automatic purchasing of replacement products
- Integration with supermarket payment systems
- Automatic food identification using cameras or AI

## Running the app

FreshTrack is a React web app (Vite + TypeScript) with an Express + SQLite API.

```
client/   React front end (pages, components, form validation)
server/   Express API, SQLite database, login and role checks, expiry rules
```

**Requirements:** Node.js 20 or newer. No separate database server is needed; SQLite stores everything in one file (`server/data/freshtrack.db`), which is created automatically.

```bash
npm install          # once, from the repository root
npm run dev          # starts the API on :4000 and the web app on http://localhost:5173
```

On first launch, open http://localhost:5173. FreshTrack asks you to create the **administrator** account. The administrator can then add staff accounts on the **Users** page.

| Command | What it does |
|---|---|
| `npm run dev` | Run the API and web app with live reload |
| `npm test` | Run all automated tests (server and client) |
| `npm run lint` / `npm run typecheck` | Check code style and types |
| `npm run build` then `npm start` | Production build, served on http://localhost:4000 |

For production, copy `.env.example` to `server/.env` and set a long random `JWT_SECRET`.

### Roles

| Role | Can do |
|---|---|
| Employee | View inventory and alerts, add products, update quantities |
| Manager | Everything above, plus expiry reports and removing (archiving) products |
| Administrator | Everything above, plus creating accounts, changing roles, resetting passwords |

### How the requirements are implemented

| Item | Where |
|---|---|
| US-01 Add products | `client/src/pages/AddProductPage.tsx`, `POST /api/products` |
| US-02 View inventory | `client/src/pages/InventoryPage.tsx`, `GET /api/products` |
| US-03 Track expiry dates | Product page; expiry date is required and validated |
| US-04 Expiry notifications | Dashboard alerts and nav badge; rule in `server/src/expiry.ts` (expires today or within 3 days) |
| US-05 Expired products | Inventory filter "Expired" (expiry date earlier than today) |
| US-06 Update quantities | Product page; negative values rejected; every change is logged in the stock history |
| US-07 Reports | `client/src/pages/ReportsPage.tsx`: expired/expiring by category, discarded stock, CSV and print |
| US-08 Manage users | `client/src/pages/UsersPage.tsx`, `/api/users` (administrators only) |
| NFR-01 Performance | Expiry status is calculated in SQL using an index on `expiry_date` |
| NFR-02 Availability | `GET /api/health` endpoint for uptime monitoring |
| NFR-03 Security | All API routes except login/setup require a session; roles checked on the server; passwords hashed with bcrypt |
| NFR-05 Retention | Products are archived, never deleted; stock history is kept |

The tests in `server/test/` and `client/src/test/` are named after the acceptance criteria they check (for example `US-06 AC2 rejects a negative quantity`).

## Requirements

The full requirements specification is in [`Requirements/FreshTrack_Project.docx`](Requirements/FreshTrack_Project.docx). It covers stakeholders, elicitation, user stories with acceptance criteria, non-functional requirements, conflicts, MoSCoW prioritisation and traceability.

## Sprint plan

Work is tracked on the [NextCode project board](https://github.com/users/MohammedAbdullah250/projects/7), with one issue per backlog item. The backlog totals **48 story points** across three two-week sprints.

| Sprint | Dates | Goal | Items | Points |
|---|---|---|---|---|
| Sprint 1 | Oct 27 – Nov 9, 2026 | Core inventory | [US-01](../../issues/2) Add food products · [US-02](../../issues/3) View food inventory · [US-03](../../issues/4) Track expiry dates · [US-06](../../issues/7) Update product quantities | 16 |
| Sprint 2 | Nov 10 – Nov 23, 2026 | Expiry alerts, security, performance | [US-04](../../issues/5) Expiry notifications · [US-05](../../issues/6) Identify expired products · [NFR-03](../../issues/8) Secure restricted functions · [NFR-01](../../issues/9) Page response time | 14 |
| Sprint 3 | Nov 24 – Dec 7, 2026 | Reports, administration, release readiness | [US-07](../../issues/10) Inventory reports · [US-08](../../issues/11) Manage user access · [NFR-02](../../issues/12) Availability · [NFR-04](../../issues/13) Usability testing · [NFR-05](../../issues/14) Record retention | 18 |

All **Must** items are completed by the end of Sprint 2; Sprint 3 holds the **Should** items.

### Board workflow

`Backlog` → `Ready` → `In Progress` → `Testing` → `Done`

A card moves to **Done** only when every acceptance criterion in its issue is checked off.
