import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { addDays, daysBetween } from '../dates.js';
import { warningCutoff, type ExpiryStatus } from '../expiry.js';
import { STATUS_SQL } from './products.js';

const reportQuerySchema = z.object({
  type: z.enum(['all', 'expired', 'expiring'], { error: 'Choose a report type.' }).default('all'),
  category: z.string().trim().max(50).optional(),
  // Look-back period for discarded stock, in days.
  days: z.coerce.number().int().min(1).max(365).default(30),
});

interface ReportRow {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  expiry_date: string;
  status: ExpiryStatus;
}

// US-07: report of expired and expiring products, plus stock discarded recently.
export function reportRoutes({ db, today, warningDays }: AppContext): Router {
  const router = Router();
  const categories = db.prepare<[], { category: string }>(
    `SELECT DISTINCT category FROM products
     WHERE category IS NOT NULL AND archived_at IS NULL ORDER BY category`,
  );
  const discarded = db.prepare<{ since: string; category: string | null }, Record<string, unknown>>(
    `SELECT p.id, p.name, p.category, p.unit,
            -SUM(m.change) AS quantity, COUNT(*) AS entries
     FROM stock_movements m JOIN products p ON p.id = m.product_id
     WHERE m.reason = 'discarded' AND date(m.created_at, 'localtime') >= @since
       AND (@category IS NULL OR p.category = @category)
     GROUP BY p.id ORDER BY quantity DESC`,
  );

  router.get('/categories', (_req, res) => {
    res.json({ categories: categories.all().map((r) => r.category) });
  });

  router.get('/expiry', (req, res) => {
    const { type, category, days } = reportQuerySchema.parse(req.query);
    const t = today();
    const params = { today: t, cutoff: warningCutoff(t, warningDays), category: category || null };
    const statusFilter =
      type === 'expired'
        ? 'expiry_date < @today'
        : type === 'expiring'
          ? 'expiry_date >= @today AND expiry_date <= @cutoff'
          : 'expiry_date <= @cutoff';
    const rows = db
      .prepare<typeof params, ReportRow>(
        `SELECT id, name, category, quantity, unit, expiry_date, ${STATUS_SQL} AS status
         FROM products
         WHERE archived_at IS NULL AND ${statusFilter}
           AND (@category IS NULL OR category = @category)
         ORDER BY expiry_date, name`,
      )
      .all(params);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      expiryDate: r.expiry_date,
      daysLeft: daysBetween(t, r.expiry_date),
      status: r.status,
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      criteria: { type, category: params.category, days, warningDays, today: t },
      totals: {
        expired: items.filter((i) => i.status === 'expired').length,
        expiring: items.filter((i) => i.status === 'expiring').length,
      },
      items,
      discarded: discarded.all({ since: addDays(t, -days + 1), category: params.category }),
    });
  });

  return router;
}
