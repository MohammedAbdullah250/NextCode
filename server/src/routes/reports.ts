import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { addDays, daysBetween } from '../dates.js';
import { CATEGORY_MAX_LENGTH, REPORT_DEFAULT_DAYS, REPORT_MAX_DAYS } from '../limits.js';
import { STATUS_FILTER, STATUS_SQL, warningCutoff, type ExpiryStatus } from '../expiry.js';

const REPORT_FILTER = {
  all: 'expiry_date <= @cutoff',
  expired: STATUS_FILTER.expired,
  expiring: STATUS_FILTER.expiring,
} as const;

const reportQuerySchema = z.object({
  type: z.enum(['all', 'expired', 'expiring'], { error: 'Choose a report type.' }).default('all'),
  category: z.string().trim().max(CATEGORY_MAX_LENGTH).optional(),
  days: z.coerce.number().int().min(1).max(REPORT_MAX_DAYS).default(REPORT_DEFAULT_DAYS),
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

export function reportRoutes({ db, today, warningDays }: AppContext): Router {
  const router = Router();
  const listCategories = db.prepare<[], { category: string }>(
    `SELECT DISTINCT category FROM products
     WHERE category IS NOT NULL AND archived_at IS NULL ORDER BY category`,
  );
  const sumDiscarded = db.prepare<{ since: string; category: string | null }, Record<string, unknown>>(
    `SELECT p.id, p.name, p.category, p.unit,
            -SUM(m.change) AS quantity, COUNT(*) AS entries
     FROM stock_movements m JOIN products p ON p.id = m.product_id
     WHERE m.reason = 'discarded' AND date(m.created_at, 'localtime') >= @since
       AND (@category IS NULL OR p.category = @category)
     GROUP BY p.id ORDER BY quantity DESC`,
  );

  router.get('/categories', (_req, res) => {
    res.json({ categories: listCategories.all().map((r) => r.category) });
  });

  router.get('/expiry', (req, res) => {
    const { type, category, days } = reportQuerySchema.parse(req.query);
    const day = today();
    const params = { today: day, cutoff: warningCutoff(day, warningDays), category: category || null };
    const rows = db
      .prepare<typeof params, ReportRow>(
        `SELECT id, name, category, quantity, unit, expiry_date, ${STATUS_SQL} AS status
         FROM products
         WHERE archived_at IS NULL AND ${REPORT_FILTER[type]}
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
      daysLeft: daysBetween(day, r.expiry_date),
      status: r.status,
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      criteria: { type, category: params.category, days, warningDays, today: day },
      totals: {
        expired: items.filter((i) => i.status === 'expired').length,
        expiring: items.filter((i) => i.status === 'expiring').length,
      },
      items,
      discarded: sumDiscarded.all({ since: addDays(day, -days + 1), category: params.category }),
    });
  });

  return router;
}
