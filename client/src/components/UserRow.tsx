import { useState } from 'react';
import { formatTimestampDate } from '../format';
import { ROLE_LABELS, type ManagedUser, type Role } from '../types';
import { ResetPasswordForm } from './ResetPasswordForm';

interface UserRowProps {
  user: ManagedUser;
  isMe: boolean;
  onChange: (user: ManagedUser, body: Record<string, unknown>, done: string) => Promise<boolean>;
}

export function UserRow({ user, isMe, onChange }: UserRowProps) {
  const [resetting, setResetting] = useState(false);

  function changeRole(role: Role) {
    onChange(user, { role }, `${user.username} is now ${ROLE_LABELS[role].toLowerCase()}.`);
  }

  function toggleActive() {
    const done = `${user.username} was ${user.active ? 'deactivated' : 'reactivated'}.`;
    onChange(user, { active: !user.active }, done);
  }

  async function savePassword(password: string) {
    const saved = await onChange(user, { password }, `Password for ${user.username} was changed.`);
    if (saved) setResetting(false);
  }

  return (
    <tr className={user.active ? undefined : 'row-inactive'}>
      <td className="cell-name">
        <strong>{user.username}</strong>
        {isMe && <span className="muted"> · you</span>}
        <span className="cell-sub">{user.active ? `Since ${formatTimestampDate(user.createdAt)}` : 'Deactivated'}</span>
      </td>
      <td>
        <select
          className="role-select"
          aria-label={`Role for ${user.username}`}
          value={user.role}
          disabled={isMe || !user.active}
          onChange={(e) => changeRole(e.target.value as Role)}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="actions">
        {resetting && <ResetPasswordForm username={user.username} onCancel={() => setResetting(false)} onSave={savePassword} />}
        {!resetting && (
          <>
            <button type="button" className="btn btn-small btn-quiet" onClick={() => setResetting(true)}>
              Reset password
            </button>
            {!isMe && (
              <button type="button" className="btn btn-small" onClick={toggleActive}>
                {user.active ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
