'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { Panel } from '@/components/Panel';
import type { CharacterOptions, StatKey } from '@heliora/platform-sdk';

const STAT_KEYS: StatKey[] = [
  'strength',
  'agility',
  'intelligence',
  'charisma',
  'hacking',
  'combat',
  'stealth',
  'engineering',
];

type StatAllocation = Partial<Record<StatKey, number>>;

export default function RegisterPage() {
  const router = useRouter();
  const session = useSession();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<CharacterOptions | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [characterName, setCharacterName] = useState('');
  const [backstory, setBackstory] = useState<string>('DRIFTER');
  const [motivation, setMotivation] = useState('');
  const [allocation, setAllocation] = useState<StatAllocation>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session.ready && session.token) router.replace('/');
  }, [session.ready, session.token, router]);

  useEffect(() => {
    void (async () => {
      try {
        const opts = await api.getCharacterOptions();
        setOptions(opts);
      } catch {
        // fallback handled in render
      }
    })();
  }, []);

  const allocated = useMemo(
    () => STAT_KEYS.reduce((sum, k) => sum + (allocation[k] ?? 0), 0),
    [allocation],
  );
  const budget = options?.statAllocation.budget ?? 12;
  const baseValue = options?.statAllocation.baseValue ?? 4;
  const maxPerKey = options?.statAllocation.maxPerKey ?? 8;
  const remaining = budget - allocated;

  const selectedBackstory = options?.backstories.find((b) => b.id === backstory);

  function setStat(key: StatKey, value: number) {
    setAllocation((prev) => ({ ...prev, [key]: Math.max(0, Math.min(maxPerKey, value)) }));
  }

  function adjustStat(key: StatKey, delta: number) {
    const current = allocation[key] ?? 0;
    const next = current + delta;
    if (next < 0) return;
    if (next > maxPerKey) return;
    if (delta > 0 && remaining <= 0) return;
    setStat(key, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cleanedAllocation: StatAllocation = {};
      for (const k of STAT_KEYS) {
        if ((allocation[k] ?? 0) > 0) cleanedAllocation[k] = allocation[k];
      }
      const res = await api.register({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        characterName: characterName.trim(),
        backstory,
        motivation: motivation.trim() || undefined,
        statAllocation: Object.keys(cleanedAllocation).length > 0 ? cleanedAllocation : undefined,
      });
      session.login(res.accessToken, res.player);
      router.replace('/');
    } catch (err) {
      setError((err as Error).message.replace(/^API error \d+: /, ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-heliora-cyan font-mono font-bold text-4xl tracking-widest">
            ◈ HELIORA
          </h1>
          <p className="text-heliora-text-dim text-xs tracking-[0.4em] mt-2">
            NEW OPERATOR ∷ INTAKE
          </p>
          <div className="flex justify-center gap-2 mt-3 text-[10px] font-mono tracking-widest">
            <span className={step >= 1 ? 'text-heliora-cyan' : 'text-heliora-text-dim'}>
              1. CREDENTIALS
            </span>
            <span className="text-heliora-text-dim">→</span>
            <span className={step >= 2 ? 'text-heliora-cyan' : 'text-heliora-text-dim'}>
              2. BACKSTORY
            </span>
            <span className="text-heliora-text-dim">→</span>
            <span className={step >= 3 ? 'text-heliora-cyan' : 'text-heliora-text-dim'}>
              3. STATS
            </span>
          </div>
        </div>

        {step === 1 && (
          <Panel title="Step 1 — Credentials" accent="orange" glow>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="lowercase_username"
                  pattern="[a-z0-9_]+"
                  minLength={3}
                  maxLength={50}
                  required
                  className="mt-1 w-full bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan"
                />
              </div>
              <div>
                <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan"
                />
              </div>
              <div>
                <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="mt-1 w-full bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan"
                />
                <p className="mt-1 text-[10px] text-heliora-text-dim">
                  Minimum 8 chars, must include uppercase, lowercase, and a number.
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-heliora-orange/20 border border-heliora-orange/50 rounded text-heliora-orange text-sm font-mono font-bold hover:bg-heliora-orange/30 tracking-wider"
              >
                NEXT — CHOOSE BACKSTORY
              </button>
              <div className="text-center text-xs text-heliora-text-dim">
                Already registered?{' '}
                <Link href="/login" className="text-heliora-cyan hover:underline">
                  LOGIN
                </Link>
              </div>
            </form>
          </Panel>
        )}

        {step === 2 && (
          <Panel title="Step 2 — Backstory & Identity" accent="cyan" glow>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Character Name
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g. Nova Rook"
                  minLength={3}
                  maxLength={80}
                  required
                  className="mt-1 w-full bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan"
                />
              </div>

              <div>
                <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Backstory
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {(options?.backstories ?? []).map((b) => {
                    const selected = backstory === b.id;
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => setBackstory(b.id)}
                        className={`text-left border rounded p-3 transition-colors ${
                          selected
                            ? 'border-heliora-cyan bg-heliora-cyan/10'
                            : 'border-heliora-border bg-heliora-dark hover:border-heliora-cyan/40'
                        }`}
                      >
                        <p className="text-sm font-mono font-bold text-heliora-cyan">{b.label}</p>
                        <p className="text-[11px] text-heliora-text-dim mt-1">{b.blurb}</p>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 text-[10px]">
                          {Object.entries(b.bonuses).map(([k, v]) => (
                            <span key={k} className="text-heliora-orange">
                              +{v} {k}
                            </span>
                          ))}
                          <span className="text-heliora-green">+${b.startingCredits}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Why are you here? <span className="opacity-50">(optional)</span>
                </label>
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="A debt, a person, a promise..."
                  className="mt-1 w-full bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-text text-sm focus:outline-none focus:border-heliora-cyan"
                />
              </div>

              {error && (
                <p className="text-heliora-red text-xs border border-heliora-red/30 bg-heliora-red/10 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-heliora-border rounded text-heliora-text-dim text-sm font-mono hover:text-heliora-cyan"
                >
                  ← BACK
                </button>
                <button
                  type="button"
                  disabled={!characterName.trim()}
                  onClick={() => setStep(3)}
                  className="flex-1 px-4 py-2 bg-heliora-cyan/20 border border-heliora-cyan/50 rounded text-heliora-cyan text-sm font-mono font-bold hover:bg-heliora-cyan/30 disabled:opacity-30 tracking-wider"
                >
                  NEXT — ALLOCATE STATS
                </button>
              </div>
            </div>
          </Panel>
        )}

        {step === 3 && (
          <Panel title="Step 3 — Stats" accent="green" glow>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border border-heliora-border rounded p-3 bg-heliora-dark">
                <span className="text-xs text-heliora-text-dim uppercase tracking-wider">
                  Points remaining
                </span>
                <span
                  className={`font-mono font-bold ${
                    remaining === 0 ? 'text-heliora-green' : 'text-heliora-orange'
                  }`}
                >
                  {remaining} / {budget}
                </span>
              </div>

              <p className="text-[11px] text-heliora-text-dim">
                Base for every stat is {baseValue}. Add up to {maxPerKey} extra per stat. Backstory
                bonuses ({selectedBackstory?.label ?? '—'}) stack on top.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STAT_KEYS.map((key) => {
                  const allocated = allocation[key] ?? 0;
                  const bonus = selectedBackstory?.bonuses[key] ?? 0;
                  const total = baseValue + allocated + bonus;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between border border-heliora-border rounded p-2 bg-heliora-dark"
                    >
                      <div>
                        <p className="text-xs font-mono text-heliora-cyan uppercase tracking-wider">
                          {key}
                        </p>
                        <p className="text-[10px] text-heliora-text-dim">
                          {baseValue} base
                          {allocated > 0 && (
                            <span className="text-heliora-green"> +{allocated}</span>
                          )}
                          {bonus > 0 && <span className="text-heliora-orange"> +{bonus} bg</span>}{' '}
                          = <span className="text-heliora-text font-bold">{total}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustStat(key, -1)}
                          disabled={allocated <= 0}
                          className="w-7 h-7 border border-heliora-border rounded text-heliora-text-dim hover:text-heliora-red disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-heliora-text">
                          {allocated}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustStat(key, 1)}
                          disabled={remaining <= 0 || allocated >= maxPerKey}
                          className="w-7 h-7 border border-heliora-border rounded text-heliora-text-dim hover:text-heliora-green disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="text-heliora-red text-xs border border-heliora-red/30 bg-heliora-red/10 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-heliora-border rounded text-heliora-text-dim text-sm font-mono hover:text-heliora-cyan"
                >
                  ← BACK
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-sm font-mono font-bold hover:bg-heliora-green/30 disabled:opacity-50 tracking-wider"
                >
                  {loading ? 'PROVISIONING…' : 'ENTER HIBARO-5'}
                </button>
              </div>
            </form>
          </Panel>
        )}
      </div>
    </main>
  );
}
