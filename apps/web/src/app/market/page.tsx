'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useAutoRefresh, useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import type { StockHolding, StockQuote } from '@heliora/platform-sdk';

export default function MarketPage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [market, setMarket] = useState<StockQuote[]>([]);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [shares, setShares] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');

  async function reload() {
    if (!session.characterId) return;
    try {
      const [m, h] = await Promise.all([
        api.getStockMarket(),
        api.getStockHoldings(session.characterId),
      ]);
      setMarket(m);
      setHoldings(h);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.characterId]);
  useAutoRefresh(reload, 8_000);

  async function buy(corpId: string) {
    if (!session.characterId) return;
    const amount = Math.max(1, Math.floor(shares[corpId] ?? 1));
    setBusy(`buy-${corpId}`);
    setMessage('');
    try {
      await api.buyStock(session.characterId, corpId, amount);
      setMessage(`✅ Bought ${amount} share${amount === 1 ? '' : 's'}`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  async function sell(corpId: string) {
    if (!session.characterId) return;
    const amount = Math.max(1, Math.floor(shares[corpId] ?? 1));
    setBusy(`sell-${corpId}`);
    setMessage('');
    try {
      await api.sellStock(session.characterId, corpId, amount);
      setMessage(`✅ Sold ${amount} share${amount === 1 ? '' : 's'}`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  if (!session.ready || !session.token) return null;

  const portfolioValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalPL = holdings.reduce((sum, h) => sum + h.unrealizedPL, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">STOCK EXCHANGE</h1>

      {message && (
        <div
          className={`border rounded p-3 text-sm font-mono ${
            message.startsWith('✅')
              ? 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green'
              : 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Cash"
          value={`$${(character?.credits ?? 0).toFixed(0)}`}
          accent="text-heliora-green"
        />
        <SummaryCard
          label="Portfolio Value"
          value={`$${portfolioValue.toFixed(0)}`}
          accent="text-heliora-cyan"
        />
        <SummaryCard
          label="Unrealized P/L"
          value={`${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(0)}`}
          accent={totalPL >= 0 ? 'text-heliora-green' : 'text-heliora-red'}
        />
      </div>

      <Panel title={`Listings (${market.length})`} accent="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {market.map((q) => {
            const holding = holdings.find((h) => h.corporationId === q.corporationId);
            const amount = shares[q.corporationId] ?? 1;
            return (
              <div
                key={q.corporationId}
                className="border border-heliora-border rounded p-3 bg-heliora-dark"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-heliora-text font-bold font-mono">
                      {q.stockTicker} ∷ {q.name}
                    </h3>
                    <p className="text-heliora-text-dim text-xs">
                      {q.industry} · {q.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-heliora-cyan text-lg font-bold font-mono">
                      ${q.stockPrice?.toFixed(2) ?? '—'}
                    </div>
                    {q.delta != null && q.percentChange != null && (
                      <div
                        className={`text-[11px] font-mono ${
                          q.delta > 0
                            ? 'text-heliora-green'
                            : q.delta < 0
                              ? 'text-heliora-red'
                              : 'text-heliora-text-dim'
                        }`}
                      >
                        {q.delta > 0 ? '▲' : q.delta < 0 ? '▼' : '•'}{' '}
                        {q.delta > 0 ? '+' : ''}
                        {q.delta.toFixed(2)} ({q.percentChange.toFixed(2)}%)
                      </div>
                    )}
                    <div className="text-heliora-text-dim text-[10px]">
                      vol {((q.stockVolatility ?? 0) * 100).toFixed(0)}% · risk{' '}
                      {(q.riskOfBankruptcy * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                {q.sparkline && q.sparkline.length >= 2 && (
                  <Sparkline values={q.sparkline} className="mb-2" />
                )}
                {holding && (
                  <div className="border-t border-heliora-border pt-2 mb-2 text-xs text-heliora-text-dim">
                    Holding {holding.shares} @ ${holding.averagePrice.toFixed(2)} →{' '}
                    <span
                      className={
                        holding.unrealizedPL >= 0 ? 'text-heliora-green' : 'text-heliora-red'
                      }
                    >
                      {holding.unrealizedPL >= 0 ? '+' : ''}$
                      {holding.unrealizedPL.toFixed(0)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={amount}
                    onChange={(e) =>
                      setShares((s) => ({
                        ...s,
                        [q.corporationId]: Math.max(1, Number(e.target.value || 1)),
                      }))
                    }
                    className="w-20 bg-heliora-dark border border-heliora-border rounded px-2 py-1 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan"
                  />
                  <button
                    onClick={() => void buy(q.corporationId)}
                    disabled={busy === `buy-${q.corporationId}` || !q.stockPrice}
                    className="flex-1 px-3 py-1 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-xs font-mono font-bold hover:bg-heliora-green/30 disabled:opacity-30"
                  >
                    {busy === `buy-${q.corporationId}` ? '…' : 'BUY'}
                  </button>
                  <button
                    onClick={() => void sell(q.corporationId)}
                    disabled={
                      busy === `sell-${q.corporationId}` ||
                      !holding ||
                      holding.shares < amount
                    }
                    className="flex-1 px-3 py-1 bg-heliora-orange/20 border border-heliora-orange/50 rounded text-heliora-orange text-xs font-mono font-bold hover:bg-heliora-orange/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {busy === `sell-${q.corporationId}` ? '…' : 'SELL'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-heliora-text-dim">
          Prices update every world tick (~30s). A 0.5% brokerage fee applies to buys and sells.
        </p>
      </Panel>
    </main>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const width = 120;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(' ');
  const trendUp = values[values.length - 1] >= values[0];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`block opacity-80 ${className ?? ''}`}
    >
      <polyline
        fill="none"
        stroke={trendUp ? '#34d399' : '#f87171'}
        strokeWidth={1.5}
        points={points}
      />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="border border-heliora-border bg-heliora-panel rounded p-4">
      <div className="text-heliora-text-dim text-xs uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold font-mono ${accent}`}>{value}</div>
    </div>
  );
}
