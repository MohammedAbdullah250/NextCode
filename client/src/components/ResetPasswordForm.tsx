import { useState, type FormEvent } from 'react';
import { validatePassword } from '../validation';

interface ResetPasswordFormProps {
  username: string;
  onSave: (password: string) => Promise<void>;
  onCancel: () => void;
}

export function ResetPasswordForm({ username, onSave, onCancel }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  function savePassword(e: FormEvent) {
    e.preventDefault();
    const found = validatePassword(password);
    setError(found);
    if (!found) onSave(password);
  }

  return (
    <form className="inline-form" onSubmit={savePassword} noValidate>
      <div>
        <input
          type="password"
          aria-label={`New password for ${username}`}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
        />
        {error && <p className="field-error">{error}</p>}
      </div>
      <button type="submit" className="btn btn-small btn-primary">
        Save
      </button>
      <button type="button" className="btn btn-small btn-quiet" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
