# FreshTrack coding standard

> **Status: proposed. The team agrees it in Session 1.**
> Product rules say how the code looks. Process rules say how the team works.
> Every rule has an ID (P-xx, G-xx) so a review comment can say "breaks P-07" instead of a long explanation.

FreshTrack is a TypeScript project: a React client (`client/`) and an Express + SQLite API (`server/`).
The one job of the app is to get expiry dates **right**, so many rules below protect dates, quantities and stock history.

---

## Product standard (how the code looks)

### Style and naming

- **P-01** TypeScript only, in `strict` mode. No `any`. If a type is truly unknown, use `unknown` and narrow it.
- **P-02** `npm run lint` and `npm run typecheck` must pass with **zero** warnings.
- **P-03** Functions are verbs (`addDays`, `findActive`). Components and types are nouns (`ProductTable`, `Summary`). Hooks start with `use` (`useApi`).
- **P-04** Constants are `UPPER_SNAKE_CASE` (`MAX_QUANTITY`, `MOVEMENT_REASONS`). Everything else is `camelCase`.
- **P-05** One React component per file. The file is named after it (`ProductPage.tsx`).
- **P-06** No magic numbers. A number with a meaning gets a name or lives in `config.ts`.
  The 3-day expiry warning is `EXPIRY_WARNING_DAYS`, never a bare `3`.
- **P-07** No `if` nested more than 2 levels. Return early instead.
- **P-08** Comments explain **why**, not what. Code that implements a backlog item names it: `// US-06: ...`.

### FreshTrack rules (dates, stock and data)

- **P-09** Expiry dates are plain `YYYY-MM-DD` strings. Never put an expiry date into a `Date` with a time zone and compare that.
  Use the helpers in `dates.ts` / `format.ts` (`addDays`, `daysBetween`).
- **P-10** Expiry status (expired / expiring / in date) is decided in **one** place: `server/src/expiry.ts` and its SQL twin `STATUS_SQL`.
  Don't write the rule again somewhere else.
- **P-11** A quantity is never changed without a `stock_movements` row, and both are saved in **one transaction**.
- **P-12** Nothing is hard-deleted. Products are archived (`archived_at`) so records are kept (NFR-05).
- **P-13** SQL uses prepared statements with parameters only. Never put user input into an SQL string.
- **P-14** Validate on **both** sides. The client checks to help the user; the server checks because it is the source of truth.
  A server check without a client check is a bug in the UI. A client check without a server check is a security bug.
- **P-15** Every API route except login and setup requires a session. Role checks happen on the **server** (NFR-03). Hiding a button is not security.

### User interface

- **P-16** Colours come from the CSS tokens in `styles.css` (`--tomato`, `--mustard`, `--leaf`...). No new hex colours inside components.
  Red only means expired. Amber only means expiring.
- **P-17** Dates on screen use the date-code style (`13 NOV 2026`) through `DateCode`, `DaysLeft` or `Stamp`.
- **P-18** Every input has a visible label (use `Field`). Error messages say what to do: "Quantity cannot be negative.", not "Invalid input."
- **P-19** No `alert()`, `confirm()` or `prompt()`. Use an inline message or a two-step button.
- **P-20** Every page handles three states: loading, error and empty.

### Tests

- **P-21** Every acceptance criterion has a test named after it: `it('US-06 AC2 rejects a negative quantity', ...)`.
- **P-22** A bug fix comes with a test that fails before the fix.
- **P-23** Date tests use a fixed "today", never the real clock.

---

## Process standard (how the team works)

### Branches

- **G-01** Never commit directly to `main`.
- **G-02** One branch per backlog item: `feature/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
  Example: `feature/expiry-alerts`.
- **G-03** Pull `main` before you start, and again before you push. If there is a conflict, fix it together, not alone.

### Commits

- **G-04** Commit messages start with a verb in the imperative: **Add**, **Fix**, **Update**, **Remove**, **Refactor**.
  Example: `Add discard button to Today page (#7)`.
- **G-05** Put the GitHub issue number in brackets when there is one: `(#5)`.
- **G-06** Commit under **your own** GitHub account. Each commit is the real author's work.
- **G-07** Never commit passwords, `.env` files, the SQLite database or `node_modules`. `.gitignore` already blocks them; don't force-add them.

### Pull requests and review

- **G-08** Merge into `main` only through a pull request reviewed and approved by **one other** team member.
- **G-09** Before you open a PR, run `npm test`, `npm run lint` and `npm run typecheck`. All must pass.
- **G-10** A PR description lists the issue it closes (`Closes #7`), what changed and how you tested it.
  For UI changes, add a screenshot.
- **G-11** The reviewer checks the acceptance criteria in the issue, not just the code style.
- **G-12** Keep a PR small: one backlog item. A big PR gets split before review.

### Board and "Done"

- **G-13** Move your card on the board yourself: `Backlog → Ready → In Progress → Testing → Done`.
- **G-14** A card is **Done** only when all of these are true:
  1. Every acceptance criterion in the issue is checked off.
  2. Its tests pass.
  3. Another member reviewed and merged the PR.
  4. It works on `main` after the merge.

---

## Changing this standard

This file follows its own rules. To change a rule, open a `docs/` pull request.
The team agrees the change at the sprint retrospective. Keep the rule IDs stable, and mark a removed rule as *retired* instead of reusing its number.

| Agreed by | Date |
|---|---|
| Ara Hakeem | |
| Bawan Goran | |
| Zana Saman | |
| Mohammad Abdullah | |
| Rawan | |
