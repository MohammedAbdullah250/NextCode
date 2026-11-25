import { Router } from 'express';
import { z, ZodError } from 'zod';
import { requireRole } from '../auth.js';
import type { AppContext } from '../context.js';
import { addDays, daysBetween, isValidISODate } from '../dates.js';
import { HttpError } from '../errors.js';
import { STATUS_FILTER, STATUS_SQL, warningCutoff, type ExpiryStatus } from '../expiry.js';
import {
  ATTENTION_LIMIT,
  CALENDAR_DAYS,
  CATEGORY_MAX_LENGTH,
  HISTORY_LIMIT,
  MAX_QUANTITY,
  NOTE_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  SEARCH_MAX_LENGTH,
} from '../limits.js';

export const UNITS = ['items', 'kg', 'g', 'L', 'ml', 'packs', 'boxes'] as const;
export const MOVEMENT_REASONS = ['received', 'sold', 'used', 'discarded', 'correction'] as const;
type MovementReason = (typeof MOVEMENT_REASONS)[number];

const REASON_DIRECTION: Record<MovementReason, 1 | -1 | null> = {
  received: 1,
  sold: -1,
  used: -1,
  discarded: -1,
  correction: null,
};

function requiredMessage(label: string) {
  return (issue: { input: unknown }) =>
    issue.input === undefined || issue.input === null || issue.input === ''
      ? `${label} is required.`
      : `${label} is not valid.`;
}

function optionalText(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .nullish()
    .transform((value) => value || null);
}

const quantity = z
  .number({ error: requiredMessage('Quantity') })
  .finite({ error: 'Quantity must be a number.' })
  .min(0, 'Quantity cannot be negative.')
  .max(MAX_QUANTITY, `Quantity must be at most ${MAX_QUANTITY.toLocaleString('en')}.`);

const productFields = {
  name: z
    .string({ error: requiredMessage('Product name') })
    .trim()
    .min(1, 'Product name is required.')
    .max(PRODUCT_NAME_MAX_LENGTH, `Product name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters.`),
  category: optionalText('Category', CATEGORY_MAX_LENGTH),
  unit: z.enum(UNITS, { error: 'Choose a unit from the list.' }).default('items'),
  expiryDate: z
    .string({ error: requiredMessage('Expiry date') })
    .trim()
    .min(1, 'Expiry date is required.')
    .refine(isValidISODate, 'Enter a real date (YYYY-MM-DD).'),
};

const createSchema = z.object({ ...productFields, quantity });
const editSchema = z.object(productFields).partial();
const quantitySchema = z.object({
  quantity,
  reason: z.enum(MOVEMENT_REASONS, { error: 'Choose a reason for the change.' }),
  note: optionalText('Note', NOTE_MAX_LENGTH),
});
const listQuerySchema = z.object({
  status: z.enum(['all', 'expired', 'expiring', 'fresh']).default('all'),
  q: z.string().trim().max(SEARCH_MAX_LENGTH).optional(),
});
const idSchema = z.coerce.number().int().positive();

interface ProductRow {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  status: ExpiryStatus;
}

function toProduct(row: ProductRow, today: string) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    expiryDate: row.expiry_date,
    daysLeft: daysBetween(today, row.expiry_date),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived_at !== null,
  };
}

export type Product = ReturnType<typeof toProduct>;

function checkReasonDirection(reason: MovementReason, change: number): void {
  const direction = REASON_DIRECTION[reason];
  if (!direction || Math.sign(change) === direction) return;
  const label = `${reason[0].toUpperCase()}${reason.slice(1)}`;
  const message = direction > 0 ? `${label} stock must increase the quantity.` : `${label} stock must lower the quantity.`;
  throw new ZodError([{ code: 'custom', path: ['quantity'], input: change, message }]);
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

export function productRoutes({ db, today, warningDays }: AppContext): Router {
  const router = Router();
  const currentDates = () => {
    const day = today();
    return { today: day, cutoff: warningCutoff(day, warningDays) };
  };

  const findById = db.prepare<{ id: number; today: string; cutoff: string }, ProductRow>(
    `SELECT *, ${STATUS_SQL} AS status FROM products WHERE id = @id`,
  );
  const insertProduct = db.prepare(
    `INSERT INTO products (name, category, quantity, unit, expiry_date, created_by)
     VALUES (@name, @category, @quantity, @unit, @expiryDate, @userId)`,
  );
  const insertMovement = db.prepare(
    `INSERT INTO stock_movements (product_id, change, quantity_after, reason, note, user_id)
     VALUES (@productId, @change, @quantityAfter, @reason, @note, @userId)`,
  );
  const updateQuantity = db.prepare(
    "UPDATE products SET quantity = @quantity, updated_at = datetime('now') WHERE id = @id",
  );
  const archiveProduct = db.prepare("UPDATE products SET archived_at = datetime('now') WHERE id = ?");
  const listMovements = db.prepare(
    `SELECT m.id, m.change, m.quantity_after AS quantityAfter, m.reason, m.note,
            m.created_at AS createdAt, u.username
     FROM stock_movements m LEFT JOIN users u ON u.id = m.user_id
     WHERE m.product_id = @id ORDER BY m.id DESC LIMIT @limit`,
  );
  const countByStatus = db.prepare<{ today: string; cutoff: string }, Record<ExpiryStatus | 'total', number>>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(${STATUS_FILTER.expired}), 0) AS expired,
            COALESCE(SUM(${STATUS_FILTER.expiring}), 0) AS expiring,
            COALESCE(SUM(${STATUS_FILTER.fresh}), 0) AS fresh
     FROM products WHERE archived_at IS NULL`,
  );
  const listAttention = db.prepare<{ today: string; cutoff: string; limit: number }, ProductRow>(
    `SELECT *, ${STATUS_SQL} AS status FROM products
     WHERE archived_at IS NULL AND expiry_date <= @cutoff
     ORDER BY expiry_date, name LIMIT @limit`,
  );
  const countByDay = db.prepare<{ today: string; end: string }, { date: string; count: number }>(
    `SELECT expiry_date AS date, COUNT(*) AS count FROM products
     WHERE archived_at IS NULL AND expiry_date BETWEEN @today AND @end
     GROUP BY expiry_date`,
  );

  function findActive(id: number) {
    const row = findById.get({ id, ...currentDates() });
    if (!row || row.archived_at) throw new HttpError(404, 'Product not found.');
    return row;
  }

  function findMovements(id: number) {
    return listMovements.all({ id, limit: HISTORY_LIMIT });
  }

  function buildCalendar(day: string) {
    const end = addDays(day, CALENDAR_DAYS - 1);
    const perDay = new Map(countByDay.all({ today: day, end }).map((r) => [r.date, r.count]));
    return Array.from({ length: CALENDAR_DAYS }, (_, offset) => {
      const date = addDays(day, offset);
      return { date, count: perDay.get(date) ?? 0 };
    });
  }

  router.get('/', (req, res) => {
    const { status, q } = listQuerySchema.parse(req.query);
    const where = ['archived_at IS NULL'];
    if (status !== 'all') where.push(STATUS_FILTER[status]);
    if (q) where.push("(name LIKE @q ESCAPE '\\' OR category LIKE @q ESCAPE '\\')");
    const params = { ...currentDates(), q: `%${escapeLike(q ?? '')}%` };
    const rows = db
      .prepare<typeof params, ProductRow>(
        `SELECT *, ${STATUS_SQL} AS status FROM products
         WHERE ${where.join(' AND ')} ORDER BY expiry_date, name`,
      )
      .all(params);
    res.json({ products: rows.map((r) => toProduct(r, params.today)), warningDays });
  });

  router.get('/summary', (_req, res) => {
    const dates = currentDates();
    res.json({
      counts: countByStatus.get(dates),
      attention: listAttention.all({ ...dates, limit: ATTENTION_LIMIT }).map((r) => toProduct(r, dates.today)),
      upcoming: buildCalendar(dates.today),
      warningDays,
      today: dates.today,
    });
  });

  router.get('/:id', (req, res) => {
    const row = findActive(idSchema.parse(req.params.id));
    res.json({ product: toProduct(row, currentDates().today), movements: findMovements(row.id) });
  });

  router.post('/', (req, res) => {
    const input = createSchema.parse(req.body);
    const userId = req.user!.id;
    const id = db.transaction(() => {
      const productId = Number(insertProduct.run({ ...input, userId }).lastInsertRowid);
      insertMovement.run({
        productId,
        change: input.quantity,
        quantityAfter: input.quantity,
        reason: 'initial',
        note: null,
        userId,
      });
      return productId;
    })();
    res.status(201).json({ product: toProduct(findActive(id), currentDates().today) });
  });

  router.patch('/:id', (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = editSchema.parse(req.body);
    findActive(id);
    const columns: Record<string, unknown> = {
      name: input.name,
      category: input.category,
      unit: input.unit,
      expiry_date: input.expiryDate,
    };
    const changed = Object.keys(columns).filter((column) => columns[column] !== undefined);
    if (changed.length > 0) {
      const assignments = changed.map((column) => `${column} = @${column}`).join(', ');
      db.prepare(`UPDATE products SET ${assignments}, updated_at = datetime('now') WHERE id = @id`).run({
        ...Object.fromEntries(changed.map((column) => [column, columns[column]])),
        id,
      });
    }
    res.json({ product: toProduct(findActive(id), currentDates().today) });
  });

  router.post('/:id/quantity', (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { quantity: newQuantity, reason, note } = quantitySchema.parse(req.body);
    db.transaction(() => {
      const current = findActive(id);
      const change = newQuantity - current.quantity;
      if (change === 0) throw new HttpError(400, 'The new quantity is the same as the current quantity.');
      checkReasonDirection(reason, change);
      updateQuantity.run({ id, quantity: newQuantity });
      insertMovement.run({ productId: id, change, quantityAfter: newQuantity, reason, note, userId: req.user!.id });
    })();
    res.json({ product: toProduct(findActive(id), currentDates().today), movements: findMovements(id) });
  });

  router.post('/:id/archive', requireRole('manager', 'admin'), (req, res) => {
    const id = idSchema.parse(req.params.id);
    findActive(id);
    archiveProduct.run(id);
    res.status(204).end();
  });

  return router;
}
