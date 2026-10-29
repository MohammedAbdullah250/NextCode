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
