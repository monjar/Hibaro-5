'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';
import { useTheme } from '@/lib/theme-context';

const NAV = [
  { href: '/', label: 'DASHBOARD', key: '1' },
  { href: '/opportunities', label: 'OPPORTUNITIES', key: '2' },
  { href: '/inventory', label: 'INVENTORY', key: '3' },
  { href: '/shop', label: 'SHOP', key: '4' },
  { href: '/travel', label: 'TRAVEL', key: '5' },
  { href: '/market', label: 'MARKET', key: '6' },
  { href: '/activity', label: 'LOGS', key: '7' },
];

export function Nav() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { mode, toggle } = useTheme();

  if (!session.token || !session.player) return null;

  const character = session.player.character;
  const credits =
    typeof character?.credits === 'number' ? `$${(character.credits as number).toFixed(0)}` : '—';
  const wanted = (character?.wantedLevel as number) ?? 0;
  const operatorName = (character?.name as string) || session.player.username;

  return (
    <header className="hib-nav">
      <div className="hib-nav__inner">
        <Link href="/" className="hib-nav__brand">
          <span className="hib-nav__brand-h">H</span>
          <span>IBARO-5</span>
        </Link>

        <nav className="hib-nav__items">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`hib-nav__item ${active ? 'is-active' : ''}`}
              >
                <span className="hib-nav__item-key">[{item.key}]</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hib-nav__hud">
          <div className="hib-nav__hud-cell">
            <span className="hib-nav__hud-label">OPERATOR</span>
            <span className="hib-nav__hud-value">{operatorName}</span>
          </div>
          <div className="hib-nav__hud-cell">
            <span className="hib-nav__hud-label">CREDITS</span>
            <span className="hib-nav__hud-value hib-nav__hud-value--good">{credits}</span>
          </div>
          <div className="hib-nav__hud-cell">
            <span className="hib-nav__hud-label">WANTED</span>
            <span
              className={`hib-nav__hud-value ${
                wanted > 0 ? 'hib-nav__hud-value--bad' : 'hib-nav__hud-value--good'
              }`}
            >
              {wanted > 0 ? '★'.repeat(wanted) : 'CLEAR'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="hib-nav__mode"
            title={mode === 'dark' ? 'Switch to LIGHT' : 'Switch to DARK'}
            aria-label="Toggle brightness"
          >
            {mode === 'dark' ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 13a8.5 8.5 0 1 1-10-10 7 7 0 0 0 10 10z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              session.logout();
              router.replace('/login');
            }}
            className="hib-nav__logout"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}
