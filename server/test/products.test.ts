import { beforeEach, describe, expect, it } from 'vitest';
import { product, setup } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setup>>;
let employee: Awaited<ReturnType<typeof ctx.loginAs>>;

beforeEach(async () => {
  ctx = await setup();
  employee = await ctx.loginAs('employee');
});

describe('US-01 add food products', () => {
  it('AC1 saves a valid product', async () => {
    const res = await employee.post('/api/products').send(product()).expect(201);
    expect(res.body.product).toMatchObject({ name: 'Milk', quantity: 10, expiryDate: '2026-11-30' });
  });

  it.each(['name', 'quantity', 'expiryDate'])('AC2 rejects a product missing %s and saves nothing', async (field) => {
    const body = product();
    delete (body as Record<string, unknown>)[field];
    const res = await employee.post('/api/products').send(body).expect(400);
    expect(res.body.fields[field]).toMatch(/required/i);
    const list = await employee.get('/api/products').expect(200);
    expect(list.body.products).toHaveLength(0);
  });

  it('rejects a blank name and an invalid date', async () => {
    const res = await employee.post('/api/products').send(product({ name: '  ', expiryDate: '2026-02-30' })).expect(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['expiryDate', 'name']);
  });
});

describe('US-02 view food inventory', () => {
  it('AC1 shows names, quantities and expiry dates', async () => {
    await employee.post('/api/products').send(product()).expect(201);
    await employee.post('/api/products').send(product({ name: 'Bread', quantity: 4, expiryDate: '2026-11-15' })).expect(201);
    const res = await employee.get('/api/products').expect(200);
    expect(res.body.products.map((p: { name: string }) => p.name)).toEqual(['Bread', 'Milk']);
    expect(res.body.products[0]).toMatchObject({ quantity: 4, expiryDate: '2026-11-15' });
  });

  it('AC2 returns an empty list when there are no products', async () => {
    const res = await employee.get('/api/products').expect(200);
    expect(res.body.products).toEqual([]);
  });

  it('searches by name or category', async () => {
    await employee.post('/api/products').send(product()).expect(201);
    await employee.post('/api/products').send(product({ name: 'Apples', category: 'Fruit' })).expect(201);
    const res = await employee.get('/api/products?q=fru').expect(200);
    expect(res.body.products.map((p: { name: string }) => p.name)).toEqual(['Apples']);
  });
});

describe('US-03 track expiry dates', () => {
  it('AC1 shows the correct expiry date on the product details', async () => {
    const { body } = await employee.post('/api/products').send(product({ expiryDate: '2026-12-01' })).expect(201);
    const res = await employee.get(`/api/products/${body.product.id}`).expect(200);
    expect(res.body.product.expiryDate).toBe('2026-12-01');
    expect(res.body.product.daysLeft).toBe(17);
  });

  it('AC2 asks for the expiry date when it is missing', async () => {
    const res = await employee.post('/api/products').send(product({ expiryDate: '' })).expect(400);
    expect(res.body.fields.expiryDate).toBe('Expiry date is required.');
  });
});

describe('US-04 / US-05 expiring and expired products', () => {
  beforeEach(async () => {
    for (const [name, expiryDate] of [
      ['Old yoghurt', '2026-11-13'],
      ['Bread', '2026-11-14'],
      ['Cheese', '2026-11-17'],
      ['Rice', '2026-11-18'],
    ]) {
      await employee.post('/api/products').send(product({ name, expiryDate })).expect(201);
    }
  });

  const names = (res: { body: { products: { name: string }[] } }) => res.body.products.map((p) => p.name);

  it('US-04 AC1 flags products expiring within three days', async () => {
    expect(names(await employee.get('/api/products?status=expiring'))).toEqual(['Bread', 'Cheese']);
  });

  it('US-04 AC2 does not flag products more than three days away', async () => {
    expect(names(await employee.get('/api/products?status=expiring'))).not.toContain('Rice');
  });

  it('US-05 AC1 lists products whose expiry date is before today', async () => {
    expect(names(await employee.get('/api/products?status=expired'))).toEqual(['Old yoghurt']);
  });

  it('US-05 AC2 leaves out products that have not expired', async () => {
    const expired = names(await employee.get('/api/products?status=expired'));
    expect(expired).not.toContain('Bread');
    expect(expired).not.toContain('Rice');
  });

  it('summary counts match the lists', async () => {
    const res = await employee.get('/api/products/summary').expect(200);
    expect(res.body.counts).toEqual({ total: 4, expired: 1, expiring: 2, fresh: 1 });
    expect(res.body.attention.map((p: { name: string }) => p.name)).toEqual(['Old yoghurt', 'Bread', 'Cheese']);
    expect(res.body.upcoming).toHaveLength(14);
    expect(res.body.upcoming.slice(0, 5)).toEqual([
      { date: '2026-11-14', count: 1 },
      { date: '2026-11-15', count: 0 },
      { date: '2026-11-16', count: 0 },
      { date: '2026-11-17', count: 1 },
      { date: '2026-11-18', count: 1 },
    ]);
  });
});

describe('US-06 update product quantities', () => {
  let id: number;
  beforeEach(async () => {
    id = (await employee.post('/api/products').send(product()).expect(201)).body.product.id;
  });

  it('AC1 saves and returns the new quantity with a history entry', async () => {
    const res = await employee.post(`/api/products/${id}/quantity`).send({ quantity: 7, reason: 'sold' }).expect(200);
    expect(res.body.product.quantity).toBe(7);
    expect(res.body.movements[0]).toMatchObject({ change: -3, quantityAfter: 7, reason: 'sold', username: 'employee1' });
    expect((await employee.get(`/api/products/${id}`)).body.product.quantity).toBe(7);
  });

  it('AC2 rejects a negative quantity and keeps the old value', async () => {
    const res = await employee.post(`/api/products/${id}/quantity`).send({ quantity: -1, reason: 'sold' }).expect(400);
    expect(res.body.fields.quantity).toBe('Quantity cannot be negative.');
    expect((await employee.get(`/api/products/${id}`)).body.product.quantity).toBe(10);
  });

  it('rejects a reason that does not match the direction of the change', async () => {
    const res = await employee.post(`/api/products/${id}/quantity`).send({ quantity: 4, reason: 'received' }).expect(400);
    expect(res.body.fields.quantity).toBe('Received stock must increase the quantity.');
    await employee.post(`/api/products/${id}/quantity`).send({ quantity: 12, reason: 'sold' }).expect(400);
    await employee.post(`/api/products/${id}/quantity`).send({ quantity: 12, reason: 'correction' }).expect(200);
  });

  it('requires a reason', async () => {
    await employee.post(`/api/products/${id}/quantity`).send({ quantity: 5 }).expect(400);
  });

  it('returns 404 for an unknown product', async () => {
    await employee.post('/api/products/999/quantity').send({ quantity: 5, reason: 'used' }).expect(404);
  });
});

describe('NFR-05 record retention', () => {
  it('archiving hides a product but keeps the record and history', async () => {
    const manager = await ctx.loginAs('manager');
    const { id } = (await employee.post('/api/products').send(product()).expect(201)).body.product;
    await employee.post(`/api/products/${id}/archive`).expect(403);
    await manager.post(`/api/products/${id}/archive`).expect(204);
    expect((await employee.get('/api/products')).body.products).toHaveLength(0);
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM products').get()).toEqual({ n: 1 });
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get()).toEqual({ n: 1 });
  });
});
