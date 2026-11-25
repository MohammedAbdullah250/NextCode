import { describe, expect, it } from 'vitest';
import { product, setup } from './helpers.js';

describe('NFR-03 restricted functions require authentication', () => {
  const protectedRoutes: ['get' | 'post' | 'patch', string][] = [
    ['get', '/api/products'],
    ['get', '/api/products/summary'],
    ['get', '/api/products/1'],
    ['post', '/api/products'],
    ['patch', '/api/products/1'],
    ['post', '/api/products/1/quantity'],
    ['post', '/api/products/1/archive'],
    ['get', '/api/reports/expiry'],
    ['get', '/api/reports/categories'],
    ['get', '/api/users'],
    ['post', '/api/users'],
    ['patch', '/api/users/1'],
    ['get', '/api/auth/me'],
  ];

  it.each(protectedRoutes)('%s %s returns 401 without a session', async (method, url) => {
    const { anon } = await setup();
    await anon[method](url).expect(401);
  });

  it('rejects a forged session cookie', async () => {
    const { anon } = await setup();
    await anon.get('/api/products').set('Cookie', 'freshtrack_session=forged.token.value').expect(401);
  });

  it('setup can only run once', async () => {
    const { anon } = await setup();
    await anon.post('/api/auth/setup').send({ username: 'intruder', password: 'password-123' }).expect(409);
  });
});

describe('US-08 manage user access', () => {
  it('AC1 an administrator creates an account with the assigned role', async () => {
    const { admin } = await setup();
    const res = await admin.post('/api/users').send({ username: 'sara', password: 'password-123', role: 'manager' }).expect(201);
    expect(res.body.user).toMatchObject({ username: 'sara', role: 'manager', active: true });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('AC2 denies administrative functions to non-administrators', async () => {
    const { loginAs } = await setup();
    for (const role of ['employee', 'manager'] as const) {
      const agent = await loginAs(role);
      await agent.get('/api/users').expect(403);
      await agent.post('/api/users').send({ username: 'x' + role, password: 'password-123', role: 'admin' }).expect(403);
    }
  });

  it('employees cannot open reports; managers can', async () => {
    const { loginAs } = await setup();
    await (await loginAs('employee')).get('/api/reports/expiry').expect(403);
    await (await loginAs('manager')).get('/api/reports/expiry').expect(200);
  });

  it('a deactivated user loses access immediately', async () => {
    const { admin, loginAs } = await setup();
    const employee = await loginAs('employee');
    const { body } = await admin.get('/api/users');
    const id = body.users.find((u: { username: string }) => u.username === 'employee1').id;
    await admin.patch(`/api/users/${id}`).send({ active: false }).expect(200);
    await employee.get('/api/products').expect(401);
  });

  it('wrong password gives a generic message', async () => {
    const { anon } = await setup();
    const res = await anon.post('/api/auth/login').send({ username: 'admin', password: 'nope' }).expect(401);
    expect(res.body.error).toBe('Incorrect username or password.');
  });

  it('the last administrator cannot be removed', async () => {
    const { admin } = await setup();
    const { body } = await admin.get('/api/auth/me');
    await admin.patch(`/api/users/${body.user.id}`).send({ role: 'employee' }).expect(400);
  });

  it('rejects duplicate usernames', async () => {
    const { admin } = await setup();
    await admin.post('/api/users').send({ username: 'ADMIN', password: 'password-123', role: 'employee' }).expect(409);
  });
});

describe('US-07 inventory reports', () => {
  it('AC1 lists expired and expiring products', async () => {
    const { loginAs } = await setup();
    const manager = await loginAs('manager');
    await manager.post('/api/products').send(product({ name: 'Old', expiryDate: '2026-11-01' })).expect(201);
    await manager.post('/api/products').send(product({ name: 'Soon', expiryDate: '2026-11-16' })).expect(201);
    await manager.post('/api/products').send(product({ name: 'Later', expiryDate: '2027-01-01' })).expect(201);
    const res = await manager.get('/api/reports/expiry').expect(200);
    expect(res.body.items.map((i: { name: string }) => i.name)).toEqual(['Old', 'Soon']);
    expect(res.body.totals).toEqual({ expired: 1, expiring: 1 });
  });

  it('AC2 returns no items when nothing matches the criteria', async () => {
    const { loginAs } = await setup();
    const manager = await loginAs('manager');
    await manager.post('/api/products').send(product({ name: 'Later', expiryDate: '2027-01-01' })).expect(201);
    const res = await manager.get('/api/reports/expiry?type=expired').expect(200);
    expect(res.body.items).toEqual([]);
  });

  it('includes stock discarded in the period', async () => {
    const { loginAs } = await setup();
    const manager = await loginAs('manager');
    const { id } = (await manager.post('/api/products').send(product()).expect(201)).body.product;
    await manager.post(`/api/products/${id}/quantity`).send({ quantity: 6, reason: 'discarded' }).expect(200);
    const res = await manager.get('/api/reports/expiry').expect(200);
    expect(res.body.discarded).toEqual([expect.objectContaining({ name: 'Milk', quantity: 4 })]);
  });
});
