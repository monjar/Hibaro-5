'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  adminApi,
  clearAdminSession,
  getStoredAdminPlayer,
  getStoredAdminToken,
  writeAdminSession,
} from '../lib/api';

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'OVERVIEW' },
  { href: '/players', label: 'PLAYERS' },
  { href: '/opportunities', label: 'OPPORTUNITIES' },
  { href: '/locations', label: 'LOCATIONS' },
  { href: '/factions', label: 'FACTIONS' },
  { href: '/corporations', label: 'CORPORATIONS' },
  { href: '/world-events', label: 'WORLD EVENTS' },
  { href: '/items', label: 'ITEMS' },
];

export function AdminShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<ReturnType<typeof getStoredAdminPlayer>>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => {
      setToken(getStoredAdminToken());
      setPlayer(getStoredAdminPlayer());
      setReady(true);
    };

    sync();
    window.addEventListener('heliora:admin-session', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('heliora:admin-session', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result = await adminApi.login(identifier, password);
      if (!result.player.isAdmin) {
        clearAdminSession();
        setError('This account is not marked as admin in the database.');
        return;
      }
      writeAdminSession(result.accessToken, result.player);
      setIdentifier('');
      setPassword('');
    } catch (err) {
      setError((err as Error).message.replace(/^API error \d+: /, ''));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearAdminSession();
    setError('');
  }

  if (!ready) {
    return <main className="min-h-screen bg-heliora-dark text-heliora-text p-6">Loading…</main>;
  }

  if (!token || !player?.isAdmin) {
    return (
      <main className="min-h-screen bg-heliora-dark text-heliora-text">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
          <div className="w-full rounded border border-heliora-border bg-heliora-panel p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-heliora-cyan">Heliora Admin</p>
            <h1 className="mt-3 text-2xl font-bold">Sign in</h1>
            <p className="mt-2 text-sm text-heliora-text-dim">
              Access is granted by the player record in the database. Use a normal account login.
            </p>
            <form className="mt-5 space-y-4" onSubmit={login}>
              <label className="block text-xs uppercase tracking-wider text-heliora-text-dim">
                Username or email
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm text-heliora-text"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-heliora-text-dim">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm text-heliora-text"
                />
              </label>
              {error && (
                <div className="rounded border border-heliora-red/40 bg-heliora-red/10 px-3 py-2 text-sm text-heliora-red">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={busy || identifier.trim() === '' || password.trim() === ''}
                className="w-full rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20 disabled:opacity-40"
              >
                {busy ? 'SIGNING IN…' : 'SIGN IN'}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-heliora-dark text-heliora-text">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-heliora-cyan">Heliora Admin</p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            {blurb && <p className="mt-2 max-w-3xl text-sm text-heliora-text-dim">{blurb}</p>}
            <nav className="mt-3 flex flex-wrap gap-2 text-xs">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded border border-heliora-border px-3 py-1 hover:border-heliora-cyan hover:text-heliora-cyan"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="rounded border border-heliora-border bg-heliora-panel p-3 text-xs">
            <p className="mb-1 font-bold uppercase tracking-wider text-heliora-yellow">
              Authenticated admin
            </p>
            <p className="font-mono text-heliora-cyan">{player.username}</p>
            {player.email && <p className="mt-1 text-heliora-text-dim">{player.email}</p>}
            <button
              onClick={logout}
              className="mt-3 rounded border border-heliora-red/40 px-2 py-1 text-heliora-red hover:bg-heliora-red/10"
            >
              LOG OUT
            </button>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function StatusMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className={`mb-4 rounded border p-3 text-sm font-mono ${
        message.startsWith('+')
          ? 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green'
          : 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'
      }`}
    >
      {message}
    </div>
  );
}

export function JsonField({
  label,
  value,
  onChange,
  example,
  rows = 4,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  example: string;
  rows?: number;
}) {
  const [raw, setRaw] = useState(JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setRaw(JSON.stringify(value ?? null, null, 2));
  }, [value]);

  function handleChange(text: string) {
    setRaw(text);
    if (text.trim() === '') {
      setError('');
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setError('');
      onChange(parsed);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="md:col-span-2">
      <label className="text-xs uppercase tracking-wider text-heliora-text-dim">{label}</label>
      <textarea
        rows={rows}
        className={`mt-1 w-full rounded border bg-heliora-dark px-3 py-2 font-mono text-xs text-heliora-text ${
          error ? 'border-heliora-red' : 'border-heliora-border'
        }`}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
      />
      {error ? (
        <p className="mt-1 text-xs text-heliora-red">{error}</p>
      ) : (
        <p className="mt-1 text-[10px] text-heliora-text-dim">e.g. {example}</p>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  step,
  min,
  max,
  textarea,
  rows = 3,
  span = 1,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  textarea?: boolean;
  rows?: number;
  span?: 1 | 2;
}) {
  const className =
    'mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan';
  return (
    <div className={span === 2 ? 'md:col-span-2' : ''}>
      <label className="text-xs uppercase tracking-wider text-heliora-text-dim">{label}</label>
      {textarea ? (
        <textarea
          rows={rows}
          className={className}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className={className}
          value={value ?? ''}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  span = 1,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? 'md:col-span-2' : ''}>
      <label className="text-xs uppercase tracking-wider text-heliora-text-dim">{label}</label>
      <select
        className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
