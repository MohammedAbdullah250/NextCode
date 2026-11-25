import { useState } from 'react';

interface ConfirmButtonProps {
  label: string;
  confirm: string;
  onConfirm: () => Promise<void>;
}

export function ConfirmButton({ label, confirm, onConfirm }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    setAsking(false);
  }

  if (!asking) {
    return (
      <button type="button" className="btn btn-small" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <>
      <button type="button" className="btn btn-small btn-danger" disabled={busy} autoFocus onClick={handleConfirm}>
        {confirm}
      </button>
      <button type="button" className="btn btn-small btn-quiet" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </>
  );
}
