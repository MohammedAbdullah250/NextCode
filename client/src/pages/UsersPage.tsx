import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../authContext';
import { Field } from '../components/Field';
import { ErrorBanner, Loading, Notice } from '../components/Feedback';
import { formatTimestamp } from '../format';
import { ROLE_LABELS, type ManagedUser, type Role } from '../types';
import { useApi } from '../useApi';
import type { Errors } from '../validation';

const ROLE_HELP: Record<Role, string> = {
  employee: 'Adds products, updates quantities and sees expiry alerts.',
  manager: 'Everything an employee does, plus reports and removing products.',
  admin: 'Everything a manager does, plus managing accounts.',
};

// US-08: administrators create accounts and control roles.
export function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<{ users: ManagedUser[] }>('/users');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState<number | null>(null);

  async function change(user: ManagedUser, body: Record<string, unknown>, done: string) {
    setActionError(null);
    setNotice(null);
    try {
      await api(`/users/${user.id}`, { method: 'PATCH', body });
      setNotice(done);
      reload();
      return true;
    } catch (err) {
      setActionError((err as Error).message);
      return false;
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Manage</p>
          <h1>Users</h1>
        </div>
      </header>

      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorBanner message={error ?? actionError} onRetry={error ? reload : undefined} />

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Accounts</h2>
            <span className="count">{data?.users.length ?? ''}</span>
          </div>
          {loading && !data && <Loading />}
          {data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className={u.active ? undefined : 'row-inactive'}>
                      <td className="cell-name">
                        <strong>{u.username}</strong>
                        {u.id === me?.id && <span className="muted"> · you</span>}
                        <span className="cell-sub">
                          {u.active ? `Since ${formatTimestamp(u.createdAt).split(',')[0]}` : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          aria-label={`Role for ${u.username}`}
                          value={u.role}
                          disabled={u.id === me?.id || !u.active}
                          onChange={(e) => change(u, { role: e.target.value }, `${u.username} is now ${ROLE_LABELS[e.target.value as Role].toLowerCase()}.`)}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="actions">
                        {resetting === u.id ? (
                          <ResetPassword
                            username={u.username}
                            onCancel={() => setResetting(null)}
                            onSave={async (password) => {
                              if (await change(u, { password }, `Password for ${u.username} was changed.`)) setResetting(null);
                            }}
                          />
                        ) : (
                          <>
                            <button type="button" className="btn btn-small btn-quiet" onClick={() => setResetting(u.id)}>
                              Reset password
                            </button>
                            {u.id !== me?.id && (
                              <button
                                type="button"
                                className="btn btn-small"
                                onClick={() => change(u, { active: !u.active }, `${u.username} was ${u.active ? 'deactivated' : 'reactivated'}.`)}
                              >
                                {u.active ? 'Deactivate' : 'Reactivate'}
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>New account</h2>
          </div>
          <AddUserForm
            onCreated={(name) => {
              setNotice(`Account “${name}” created. Share the temporary password with them in person.`);
              reload();
            }}
          />
        </section>
      </div>
    </>
  );
}

function ResetPassword({ username, onSave, onCancel }: { username: string; onSave: (p: string) => Promise<void>; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (password.length < 8) return setError('At least 8 characters.');
        void onSave(password);
      }}
      noValidate
    >
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

function AddUserForm({ onCreated }: { onCreated: (username: string) => void }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'employee' as Role });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found: Errors = {};
    if (form.username.trim().length < 3) found.username = 'Username must be at least 3 characters.';
    if (form.password.length < 8) found.password = 'Password must be at least 8 characters.';
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api('/users', { body: { ...form, username: form.username.trim() } });
      onCreated(form.username.trim());
      setForm({ username: '', password: '', role: form.role });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel-body" onSubmit={handleSubmit} noValidate>
      <ErrorBanner message={message} />
      <Field label="Username" error={errors.username}>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="Temporary password" error={errors.password} hint="At least 8 characters.">
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
      </Field>
      <Field label="Role" error={errors.role} hint={ROLE_HELP[form.role]}>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
