import type { ReactNode } from 'react';
import { addDays, todayISO } from '../format';
import { Stamp } from './Expiry';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const today = todayISO();
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="wordmark">
          <Logo size={28} />
          FreshTrack
        </span>
        <blockquote>Know what’s going out of date before it costs you.</blockquote>
        <div className="auth-stamps" aria-hidden="true">
          <Stamp date={addDays(today, 12)} status="fresh" />
          <Stamp date={addDays(today, 2)} status="expiring" />
          <Stamp date={addDays(today, -1)} status="expired" />
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
