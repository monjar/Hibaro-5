'use client';

import { useEffect, useState } from 'react';
import { getStoredAdminToken, setStoredAdminToken } from '../lib/api';

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'OVERVIEW' },
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
  const [token, setToken] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setToken(getStoredAdminToken() ?? '');
  }, []);

  function save() {
    setStoredAdminToken(token.trim() === '' ? null : token.trim());
  }

  function clear() {
    setStoredAdminToken(null);
    setToken('');
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
            <p className="mb-2 font-bold uppercase tracking-wider text-heliora-yellow">
              Admin token
            </p>
            <div className="flex items-center gap-2">
              <input
                type={revealed ? 'text' : 'password'}
                placeholder="x-admin-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-56 rounded border border-heliora-border bg-heliora-dark px-2 py-1 font-mono text-xs text-heliora-cyan"
              />
              <button
                onClick={() => setRevealed((r) => !r)}
                className="rounded border border-heliora-border px-2 py-1 hover:border-heliora-cyan hover:text-heliora-cyan"
              >
                {revealed ? 'HIDE' : 'SHOW'}
              </button>
              <button
                onClick={save}
                className="rounded border border-heliora-green/60 bg-heliora-green/10 px-2 py-1 font-bold text-heliora-green hover:bg-heliora-green/20"
              >
                SAVE
              </button>
              <button
                onClick={clear}
                className="rounded border border-heliora-red/40 px-2 py-1 text-heliora-red hover:bg-heliora-red/10"
              >
                CLEAR
              </button>
            </div>
            <p className="mt-2 text-[10px] text-heliora-text-dim">
              Stored in browser localStorage, sent as <code>x-admin-token</code> on writes.
            </p>
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
