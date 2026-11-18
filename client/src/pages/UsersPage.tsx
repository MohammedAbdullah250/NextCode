import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../authContext';
import { AddUserForm } from '../components/AddUserForm';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { Notice } from '../components/Notice';
import { UserRow } from '../components/UserRow';
import type { ManagedUser } from '../types';
import { useApi } from '../useApi';

export function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<{ users: ManagedUser[] }>('/users');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function updateUser(user: ManagedUser, body: Record<string, unknown>, done: string) {
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

  function handleCreated(username: string) {
    setNotice(`Account “${username}” created. Share the temporary password with them in person.`);
    reload();
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
                  {data.users.map((user) => (
                    <UserRow key={user.id} user={user} isMe={user.id === me?.id} onChange={updateUser} />
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
          <AddUserForm onCreated={handleCreated} />
        </section>
      </div>
    </>
  );
}
