import { Router } from 'express';
import { z, ZodError } from 'zod';
import { requireRole } from '../auth.js';
import type { AppContext } from '../context.js';
import { addDays, daysBetween, isValidISODate } from '../dates.js';
import { HttpError } from '../errors.js';
import { warningCutoff, type ExpiryStatus } from '../expiry.js';

const MAX_QUANTITY = 1_000_000;
export const UNITS = ['items', 'kg', 'g', 'L', 'ml', 'packs', 'boxes'] as const;
export const MOVEMENT_REASONS = ['received', 'sold', 'used', 'discarded', 'correction'] as const;
// Which way each reason moves stock. A correction (recount) can go either way.
const REASON_DIRECTION: Record<(typeof MOVEMENT_REASONS)[number], 1 | -1 | null> = {
  received: 1,
  sold: -1,
  used: -1,
  discarded: -1,
  correction: null,
};

const required = (label: string) => (issue: { input: unknown }) =>
  issue.input === undefined || issue.input === null || issue.input === ''
    ? `${label} is required.`
    : `${label} is not valid.`;

const quantity = z
  .number({ error: required('Quantity') })
  .finite({ error: 'Quantity must be a number.' })
  .min(0, 'Quantity cannot be negative.')
  .max(MAX_QUANTITY, `Quantity must be at most ${MAX_QUANTITY.toLocaleString('en')}.`);

const expiryDate = z
  .string({ error: required('Expiry date') })
  .trim()
  .min(1, 'Expiry date is required.')
  .refine(isValidISODate, 'Enter a real date (YYYY-MM-DD).');

const productFields = {
  name: z
    .string({ error: required('Product name') })
    .trim()
    .min(1, 'Product name is required.')
    .max(100, 'Product name must be at most 100 characters.'),
  category: z
    .string()
    .trim()
    .max(50, 'Category must be at most 50 characters.')
    .nullish()
    .transform((v) => v || null),
  unit: z.enum(UNITS, { error: 'Choose a unit from the list.' }).default('items'),
  expiryDate,
};

const createSchema = z.object({ ...productFields, quantity });
const editSchema = z.object(productFields).partial();
const quantitySchema = z.object({
  quantity,
  reason: z.enum(MOVEMENT_REASONS, { error: 'Choose a reason for the change.' }),
  note: z
    .string()
    .trim()
    .max(200, 'Note must be at most 200 characters.')
    .nullish()
    .transform((v) => v || null),
});
const listQuerySchema = z.object({
  status: z.enum(['all', 'expired', 'expiring', 'fresh']).default('all'),
  q: z.string().trim().max(100).optional(),
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

/**
 * Status is worked out in SQL (not in JS after loading everything) so filters
 * use the expiry_date index and the inventory page stays fast (NFR-01, Conflict 1).
 */
export const STATUS_SQL = `
  CASE WHEN expiry_date < @today THEN 'expired'
       WHEN expiry_date <= @cutoff THEN 'expiring'
       ELSE 'fresh' END`;

const STATUS_FILTER: Record<ExpiryStatus, string> = {
  expired: 'expiry_date < @today',
  expiring: 'expiry_date >= @today AND expiry_date <= @cutoff',
  fresh: 'expiry_date > @cutoff',
};

export function productRoutes({ db, today, warningDays }: AppContext): Router {
  const router = Router();
  const dates = () => {
    const t = today();
    return { today: t, cutoff: warningCutoff(t, warningDays) };
  };

  const getById = db.prepare<{ id: number; today: string; cutoff: string }, ProductRow>(
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
  const setQuantity = db.prepare(
    "UPDATE products SET quantity = @quantity, updated_at = datetime('now') WHERE id = @id",
  );
  const listMovements = db.prepare(
    `SELECT m.id, m.change, m.quantity_after AS quantityAfter, m.reason, m.note,
            m.created_at AS createdAt, u.username
     FROM stock_movements m LEFT JOIN users u ON u.id = m.user_id
     WHERE m.product_id = ? ORDER BY m.id DESC LIMIT 50`,
  );
  const counts = db.prepare<{ today: string; cutoff: string }, Record<ExpiryStatus | 'total', number>>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(expiry_date < @today), 0) AS expired,
            COALESCE(SUM(expiry_date >= @today AND expiry_date <= @cutoff), 0) AS expiring,
            COALESCE(SUM(expiry_date > @cutoff), 0) AS fresh
     FROM products WHERE archived_at IS NULL`,
  );
  const attention = db.prepare<{ today: string; cutoff: string }, ProductRow>(
    `SELECT *, ${STATUS_SQL} AS status FROM products
     WHERE archived_at IS NULL AND expiry_date <= @cutoff
     ORDER BY expiry_date, name LIMIT 20`,
  );

  const byDay = db.prepare<{ today: string; end: string }, { date: string; count: number }>(
    `SELECT expiry_date AS date, COUNT(*) AS count FROM products
     WHERE archived_at IS NULL AND expiry_date BETWEEN @today AND @end
     GROUP BY expiry_date`,
  );

  function findActive(id: number) {
    const row = getById.get({ id, ...dates() });
    if (!row || row.archived_at) throw new HttpError(404, 'Product not found.');
    return row;
  }

  // US-02 / US-04 / US-05: list products, optionally filtered by expiry status.
  router.get('/', (req, res) => {
    const { status, q } = listQuerySchema.parse(req.query);
    const where = ['archived_at IS NULL'];
    if (status !== 'all') where.push(STATUS_FILTER[status]);
    if (q) where.push("(name LIKE @q ESCAPE '\\' OR category LIKE @q ESCAPE '\\')");
    const params = { ...dates(), q: `%${q?.replace(/[\\%_]/g, '\\$&') ?? ''}%` };
    const rows = db
      .prepare<typeof params, ProductRow>(
        `SELECT *, ${STATUS_SQL} AS status FROM products
         WHERE ${where.join(' AND ')} ORDER BY expiry_date, name`,
      )
      .all(params);
    res.json({ products: rows.map((r) => toProduct(r, params.today)), warningDays });
  });

  // US-04: dashboard counts, the products that need attention now,
  // and how many products expire on each of the next 14 days.
  router.get('/summary', (_req, res) => {
    const d = dates();
    const perDay = new Map(byDay.all({ today: d.today, end: addDays(d.today, 13) }).map((r) => [r.date, r.count]));
    res.json({
      counts: counts.get(d),
      attention: attention.all(d).map((r) => toProduct(r, d.today)),
      upcoming: Array.from({ length: 14 }, (_, i) => {
        const date = addDays(d.today, i);
        return { date, count: perDay.get(date) ?? 0 };
      }),
      warningDays,
      today: d.today,
    });
  });

  router.get('/:id', (req, res) => {
    const row = findActive(idSchema.parse(req.params.id));
    res.json({ product: toProduct(row, dates().today), movements: listMovements.all(row.id) });
  });

  // US-01: add a product; its starting quantity is the first history entry.
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
    res.status(201).json({ product: toProduct(getById.get({ id, ...dates() })!, dates().today) });
  });

  router.patch('/:id', (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = editSchema.parse(req.body);
    findActive(id);
    const columns: Record<string, unknown> = {};
    if (input.name !== undefined) columns.name = input.name;
    if (input.category !== undefined) columns.category = input.category;
    if (input.unit !== undefined) columns.unit = input.unit;
    if (input.expiryDate !== undefined) columns.expiry_date = input.expiryDate;
    if (Object.keys(columns).length > 0) {
      const sets = Object.keys(columns).map((c) => `${c} = @${c}`);
      db.prepare(`UPDATE products SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run({
        ...columns,
        id,
      });
    }
    res.json({ product: toProduct(findActive(id), dates().today) });
  });

  // US-06: set a new quantity; the change and the history entry are saved together.
  router.post('/:id/quantity', (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { quantity: newQuantity, reason, note } = quantitySchema.parse(req.body);
    db.transaction(() => {
      const current = findActive(id);
      if (current.quantity === newQuantity) {
        throw new HttpError(400, 'The new quantity is the same as the current quantity.');
      }
      const direction = REASON_DIRECTION[reason];
      if (direction && Math.sign(newQuantity - current.quantity) !== direction) {
        throw new ZodError([
          {
            code: 'custom',
            path: ['quantity'],
            input: newQuantity,
            message: direction > 0 ? 'Received stock must increase the quantity.' : `${reason[0].toUpperCase()}${reason.slice(1)} stock must lower the quantity.`,
          },
        ]);
      }
      setQuantity.run({ id, quantity: newQuantity });
      insertMovement.run({
        productId: id,
        change: newQuantity - current.quantity,
        quantityAfter: newQuantity,
        reason,
        note,
        userId: req.user!.id,
      });
    })();
    res.json({ product: toProduct(findActive(id), dates().today), movements: listMovements.all(id) });
  });

  // NFR-05: archive instead of delete so the record and its history are retained.
  router.post('/:id/archive', requireRole('manager', 'admin'), (req, res) => {
    const id = idSchema.parse(req.params.id);
    findActive(id);
    db.prepare("UPDATE products SET archived_at = datetime('now') WHERE id = ?").run(id);
    res.status(204).end();
  });

  return router;
}
