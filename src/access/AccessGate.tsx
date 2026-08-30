import { FormEvent, ReactNode, useState } from 'react';

const STORAGE_KEY = 'pm_access_ok';
const GATE_ON = (import.meta.env.VITE_ACCESS_GATE ?? 'off').toLowerCase() === 'on';
const EXPECTED_HASH = (import.meta.env.VITE_ACCESS_HASH ?? '').toLowerCase();

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function alreadyUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === EXPECTED_HASH && EXPECTED_HASH !== '';
  } catch {
    return false;
  }
}

export function AccessGate({ children }: { children: ReactNode }) {
  const misconfigured = GATE_ON && EXPECTED_HASH === '';
  const [unlocked, setUnlocked] = useState(
    () => !GATE_ON || misconfigured || alreadyUnlocked(),
  );
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const hash = await sha256Hex(value);
    if (hash === EXPECTED_HASH) {
      try {
        localStorage.setItem(STORAGE_KEY, EXPECTED_HASH);
      } catch {
        /* private mode — will re-prompt next visit */
      }
      setUnlocked(true);
    } else {
      setError(true);
      setValue('');
    }
    setChecking(false);
  };

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={onSubmit}>
        <h1>PDF / Image Merger</h1>
        <p>Enter the access phrase to continue.</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Access phrase"
          autoComplete="current-password"
        />
        {error && <p className="gate-error">Incorrect — try again.</p>}
        <button type="submit" className="btn primary" disabled={checking || !value}>
          {checking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
