'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { Panel } from '@/components/Panel';

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [identifier, setIdentifier] = useState('test_player');
  const [password, setPassword] = useState('Heliora123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session.ready && session.token) {
      router.replace('/');
    }
  }, [session.ready, session.token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(identifier.trim(), password);
      session.login(res.accessToken, res.player);
      router.replace('/');
    } catch (err) {
      setError((err as Error).message.replace(/^API error \d+: /, ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-heliora-cyan font-mono font-bold text-4xl tracking-widest">
            ◈ HELIORA
          </h1>
          <p className="text-heliora-text-dim text-xs tracking-[0.4em] mt-2">
            HIBARO-5 ∷ ENTRY TERMINAL
          </p>
        </div>

        <Panel title="Operator Login" accent="cyan" glow>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-heliora-text-dim uppercase tracking-wider">
                Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
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
                autoComplete="current-password"
                className="mt-1 w-full bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan"
              />
            </div>
            {error && (
              <p className="text-heliora-red text-xs border border-heliora-red/30 bg-heliora-red/10 rounded px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-heliora-cyan/20 border border-heliora-cyan/50 rounded text-heliora-cyan text-sm font-mono font-bold hover:bg-heliora-cyan/30 transition-colors disabled:opacity-50 tracking-wider"
            >
              {loading ? 'AUTHENTICATING…' : 'ENTER HIBARO-5'}
            </button>
          </form>
          <div className="mt-4 text-center text-xs text-heliora-text-dim">
            Need an account?{' '}
            <Link href="/register" className="text-heliora-cyan hover:underline">
              REGISTER A NEW OPERATOR
            </Link>
          </div>
          <div className="mt-4 text-center text-[11px] text-heliora-text-dim/70">
            Default: <span className="text-heliora-cyan">test_player</span> /{' '}
            <span className="text-heliora-cyan">Heliora123</span>
          </div>
        </Panel>
      </div>
    </main>
  );
}
