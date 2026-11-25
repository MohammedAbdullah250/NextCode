import { useOutletContext } from 'react-router';
import type { Summary } from './types';

export interface ShellContext {
  summary: Summary | null;
  summaryError: string | null;
  refreshSummary: () => void;
}

export function useShell(): ShellContext {
  return useOutletContext<ShellContext>();
}
