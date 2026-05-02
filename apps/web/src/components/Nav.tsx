'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';

const NAV = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/opportunities', label: 'OPPORTUNITIES' },
  { href: '/inventory', label: 'INVENTORY' },
  { href: '/shop', label: 'SHOP' },
  { href: '/travel', label: 'TRAVEL' },
  { href: '/market', label: 'MARKET' },
  { href: '/activity', label: 'LOGS' },
];

export function Nav() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session.token || !session.player) return null;

  const character = session.player.character;
  const credits =
    typeof character?.credits === 'number' ? `$${(character.credits as number).toFixed(0)}` : '—';
  const wanted = (character?.wantedLevel as number) ?? 0;

  return (
    <header className="border-b border-heliora-border bg-heliora-panel sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-heliora-cyan font-mono font-bold text-lg tracking-widest">
          ◈ HELIORA
        </Link>

        <nav className="flex flex-wrap gap-1 text-xs font-mono">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1 rounded border tracking-wider transition-colors ${
                  active
                    ? 'border-heliora-cyan/60 text-heliora-cyan bg-heliora-cyan/10'
                    : 'border-heliora-border text-heliora-text-dim hover:text-heliora-cyan hover:border-heliora-cyan/30'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-xs font-mono">
          {character && (
            <>
              <span className="text-heliora-text-dim">
                {character.name as string}
              </span>
              <span className="text-heliora-green font-bold">{credits}</span>
              {wanted > 0 && (
                <span className="text-heliora-red">{'★'.repeat(wanted)}</span>
              )}
            </>
          )}
          <button
            onClick={() => {
              session.logout();
              router.replace('/login');
            }}
            className="px-2 py-1 rounded border border-heliora-border text-heliora-text-dim hover:text-heliora-red hover:border-heliora-red/30 transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}
