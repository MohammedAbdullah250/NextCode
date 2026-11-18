import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';

export const TODAY = '2026-11-14';

export async function setup() {
  const db = openDatabase(':memory:');
  const app = createApp({ db, today: () => TODAY, warningDays: 3 });
  const admin = request.agent(app);
  await admin.post('/api/auth/setup').send({ username: 'admin', password: 'admin-pass-1' }).expect(201);

  async function loginAs(role: 'employee' | 'manager' | 'admin', username = role + '1') {
    await admin.post('/api/users').send({ username, password: 'password-123', role }).expect(201);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username, password: 'password-123' }).expect(200);
    return agent;
  }

  return { db, app, admin, loginAs, anon: request(app) };
}

export function product(overrides: Record<string, unknown> = {}) {
  return { name: 'Milk', quantity: 10, unit: 'L', expiryDate: '2026-11-30', category: 'Dairy', ...overrides };
}
