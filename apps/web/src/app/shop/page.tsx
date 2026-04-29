'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import type { InventoryItem, ShopListing } from '@heliora/platform-sdk';

const SHOP_FUNCS = ['SHOP', 'BLACK_MARKET', 'CLINIC'];

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-heliora-text',
  UNCOMMON: 'text-heliora-green',
  RARE: 'text-heliora-cyan',
  EPIC: 'text-heliora-orange',
  LEGENDARY: 'text-heliora-yellow',
  ILLEGAL: 'text-heliora-red',
};

export default function ShopPage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [listing, setListing] = useState<ShopListing | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const buildingId = character?.currentBuildingId ?? null;
  const buildingFn = Array.isArray(character?.currentBuilding?.functionality)
    ? (character?.currentBuilding?.functionality as string[])
    : [];
  const isShop = buildingFn.some((f) => SHOP_FUNCS.includes(f));

  async function reload() {
    if (!buildingId || !isShop || !session.characterId) return;
    try {
      const [shop, inv] = await Promise.all([
        api.getShop(buildingId),
        api.getCharacterInventory(session.characterId),
      ]);
      setListing(shop);
      setInventory(inv);
    } catch {
      setListing(null);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isShop, session.characterId]);

  async function buy(itemInstanceId: string, name: string, price: number) {
    if (!buildingId || !session.characterId) return;
    setBusy(`buy-${itemInstanceId}`);
    setMessage('');
    try {
      await api.shopBuy(buildingId, itemInstanceId, session.characterId);
      setMessage(`✅ Bought ${name} for $${price}`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  async function sell(itemInstanceId: string, name: string) {
    if (!buildingId || !session.characterId) return;
    setBusy(`sell-${itemInstanceId}`);
    setMessage('');
    try {
      const r = (await api.shopSell(buildingId, itemInstanceId, session.characterId)) as {
        price?: number;
      };
      setMessage(`✅ Sold ${name} for $${r.price ?? '?'}`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  if (!session.ready || !session.token) return null;

  if (!buildingId || !isShop) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest mb-4">SHOP</h1>
        <Panel title="No Shop Available" accent="orange">
          <p className="text-heliora-text-dim">
            You&apos;re not currently inside a shop. Travel to a building marked SHOP, BLACK_MARKET,
            or CLINIC to trade.
          </p>
          <p className="mt-3 text-sm text-heliora-text-dim">
            Try{' '}
            <Link href="/travel" className="text-heliora-cyan hover:underline">
              the travel terminal
            </Link>
            .
          </p>
        </Panel>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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

      <div>
        <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">
          {listing?.building.name ?? 'SHOP'}
        </h1>
        <p className="text-heliora-text-dim text-xs uppercase tracking-wider">
          {(listing?.building.functionality ?? []).join(' · ')}
          {listing?.building.functionality.includes('BLACK_MARKET') && (
            <span className="ml-2 text-heliora-red">⚠ contraband sells at +40% here</span>
          )}
        </p>
        {listing?.building.description && (
          <p className="text-heliora-text-dim text-sm mt-2">{listing.building.description}</p>
        )}
      </div>

      <Panel title={`For Sale (${listing?.stock.length ?? 0})`} accent="orange">
        {listing && listing.stock.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {listing.stock.map((item) => {
              const cantAfford = (character?.credits ?? 0) < item.priceCredits;
              return (
                <div
                  key={item.id}
                  className={`border rounded p-3 ${
                    item.contraband
                      ? 'border-heliora-red/30 bg-heliora-red/5'
                      : 'border-heliora-border bg-heliora-dark'
                  }`}
                >
                  <h3
                    className={`font-bold font-mono text-sm ${
                      RARITY_COLORS[item.rarity] ?? 'text-heliora-text'
                    }`}
                  >
                    {item.name}
                    {item.contraband && (
                      <span className="ml-2 text-[10px] text-heliora-red">CONTRABAND</span>
                    )}
                  </h3>
                  <p className="text-heliora-text-dim text-[10px] uppercase tracking-wider">
                    {item.category} ∷ {item.rarity}
                  </p>
                  {item.description && (
                    <p className="text-heliora-text-dim text-xs my-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-heliora-text-dim mb-2">
                    <span>{item.condition}% cond</span>
                    <span>{item.weight}kg</span>
                  </div>
                  <button
                    onClick={() => void buy(item.id, item.name, item.priceCredits)}
                    disabled={busy === `buy-${item.id}` || cantAfford}
                    className="w-full px-3 py-1.5 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-sm font-mono font-bold hover:bg-heliora-green/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {busy === `buy-${item.id}`
                      ? 'BUYING…'
                      : cantAfford
                        ? `NEED $${item.priceCredits}`
                        : `BUY $${item.priceCredits}`}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-heliora-text-dim text-sm py-4 text-center">
            This shop has no items in stock right now.
          </p>
        )}
      </Panel>

      <Panel title={`Sell from Inventory (${inventory.filter((i) => i.itemDefinition.category !== 'QUEST_ITEM').length})`} accent="cyan">
        {inventory.length === 0 ? (
          <p className="text-heliora-text-dim text-sm py-4 text-center">
            Your inventory is empty.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {inventory.map((item) => {
              const isQuest = item.itemDefinition.category === 'QUEST_ITEM';
              const sellPreview = Math.max(
                1,
                Math.round(item.itemDefinition.baseValue * 0.55 * (item.condition / 100)),
              );
              return (
                <div
                  key={item.id}
                  className="border border-heliora-border rounded p-3 bg-heliora-dark"
                >
                  <h3
                    className={`font-bold font-mono text-sm ${
                      RARITY_COLORS[item.itemDefinition.rarity] ?? 'text-heliora-text'
                    }`}
                  >
                    {item.itemDefinition.name}
                  </h3>
                  <p className="text-heliora-text-dim text-[10px] uppercase tracking-wider">
                    {item.itemDefinition.category} ∷ {item.condition}%
                  </p>
                  <button
                    onClick={() => void sell(item.id, item.itemDefinition.name)}
                    disabled={busy === `sell-${item.id}` || isQuest}
                    className="mt-2 w-full px-3 py-1 bg-heliora-orange/20 border border-heliora-orange/50 rounded text-heliora-orange text-xs font-mono font-bold hover:bg-heliora-orange/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isQuest
                      ? 'QUEST ITEM'
                      : busy === `sell-${item.id}`
                        ? 'SELLING…'
                        : `SELL ~$${sellPreview}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </main>
  );
}
