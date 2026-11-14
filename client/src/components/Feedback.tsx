import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'error' | 'warning' | 'success';
const ICONS = { error: CircleAlert, warning: AlertTriangle, success: CheckCircle2 };

export function Notice({ tone, children, action }: { tone: Tone; children: ReactNode; action?: ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden="true" />
      <span>{children}</span>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <Notice
      tone="error"
      action={
        onRetry && (
          <button type="button" className="btn btn-small" onClick={onRetry}>
            Try again
          </button>
        )
      }
    >
      {message}
    </Notice>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}
