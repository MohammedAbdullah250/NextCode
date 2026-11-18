import type { ReactNode } from 'react';
import { addDays, todayISO } from '../format';
import { LOGO_AUTH } from '../ui';
import { Logo } from './Logo';
import { Stamp } from './Stamp';

const SAMPLE_STAMPS = [
  { offset: 12, status: 'fresh' },
  { offset: 2, status: 'expiring' },
  { offset: -1, status: 'expired' },
] as const;

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const today = todayISO();
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="wordmark">
          <Logo size={LOGO_AUTH} />
          FreshTrack
        </span>
        <blockquote>Know what’s going out of date before it costs you.</blockquote>
        <div className="auth-stamps" aria-hidden="true">
          {SAMPLE_STAMPS.map((sample) => (
            <Stamp key={sample.status} date={addDays(today, sample.offset)} status={sample.status} />
          ))}
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
