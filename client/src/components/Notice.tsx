import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { ICON_MEDIUM } from '../ui';

type Tone = 'error' | 'warning' | 'success';

const ICONS = { error: CircleAlert, warning: AlertTriangle, success: CheckCircle2 };

interface NoticeProps {
  tone: Tone;
  children: ReactNode;
  action?: ReactNode;
}

export function Notice({ tone, children, action }: NoticeProps) {
  const Icon = ICONS[tone];
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={ICON_MEDIUM} aria-hidden="true" />
      <span>{children}</span>
      {action}
    </div>
  );
}
