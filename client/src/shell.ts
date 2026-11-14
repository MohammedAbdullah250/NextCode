import { useOutletContext } from 'react-router';
import type { Summary } from './types';

export interface ShellContext {
  summary: Summary | null;
  /** Call after changing stock so the sidebar counts and alerts stay current. */
  refreshSummary: () => void;
}

export function useShell(): ShellContext {
  return useOutletContext<ShellContext>();
}
