import { Notice } from './Notice';

interface ErrorBannerProps {
  message: string | null;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  if (!message) return null;
  const retryButton = onRetry && (
    <button type="button" className="btn btn-small" onClick={onRetry}>
      Try again
    </button>
  );
  return (
    <Notice tone="error" action={retryButton}>
      {message}
    </Notice>
  );
}
