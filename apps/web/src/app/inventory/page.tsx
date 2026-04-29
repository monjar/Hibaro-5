'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import type { InventoryItem } from '@heliora/platform-sdk';

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-heliora-text',
  UNCOMMON: 'text-heliora-green',
  RARE: 'text-heliora-cyan',
  EPIC: 'text-heliora-orange',
  LEGENDARY: 'text-heliora-yellow',
  ILLEGAL: 'text-heliora-red',
};

const CATEGORY_ICONS: Record<string, string> = {
  TOOL: '🛠️',
  WEAPON: '🔫',
  CLOTHING: '🧥',
  VEHICLE: '🚗',
  CONSUMABLE: '💊',
  MATERIAL: '⚙️',
  QUEST_ITEM: '📜',
};

export default function InventoryPage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function reload() {
    if (!session.characterId) return;
    setLoading(true);
    try {
      const data = await api.getCharacterInventory(session.characterId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.characterId]);

  async function useItem(itemInstanceId: string, name: string) {
    if (!session.characterId) return;
    setBusy(itemInstanceId);
    setMessage('');
    try {
      await api.useItem(session.characterId, itemInstanceId);
      setMessage(`✅ Used ${name}`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 3500);
    }
  }

  if (!session.ready || !session.token) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">INVENTORY</h1>

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

      <Panel title={`Carrying ${items.length} item${items.length === 1 ? '' : 's'}`} accent="cyan">
        {loading && items.length === 0 ? (
          <p className="text-heliora-text-dim text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-heliora-text-dim text-sm py-4 text-center">
            Your inventory is empty. Visit a shop to buy gear.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const isConsumable = item.itemDefinition.category === 'CONSUMABLE';
              const isQuest = item.itemDefinition.category === 'QUEST_ITEM';
              return (
                <div
                  key={item.id}
                  className="border border-heliora-border rounded p-3 bg-heliora-dark"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3
                        className={`font-bold font-mono text-sm ${
                          RARITY_COLORS[item.itemDefinition.rarity] ?? 'text-heliora-text'
                        }`}
                      >
                        {CATEGORY_ICONS[item.itemDefinition.category] ?? '•'}{' '}
                        {item.itemDefinition.name}
                      </h3>
                      <p className="text-heliora-text-dim text-[10px] uppercase tracking-wider">
                        {item.itemDefinition.category} ∷ {item.itemDefinition.rarity}
                      </p>
                    </div>
                    <span className="text-xs text-heliora-text-dim">{item.condition}%</span>
                  </div>
                  {item.itemDefinition.description && (
                    <p className="text-heliora-text-dim text-xs mb-2">
                      {item.itemDefinition.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-heliora-text-dim">
                    <span>Base value ${item.itemDefinition.baseValue.toFixed(0)}</span>
                    <span>{item.itemDefinition.weight}kg</span>
                  </div>
                  {isConsumable && (
                    <button
                      onClick={() => void useItem(item.id, item.itemDefinition.name)}
                      disabled={busy === item.id}
                      className="mt-3 w-full px-3 py-1 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-xs font-mono font-bold hover:bg-heliora-green/30 disabled:opacity-50"
                    >
                      {busy === item.id ? 'USING…' : 'USE'}
                    </button>
                  )}
                  {isQuest && (
                    <p className="mt-3 text-xs text-heliora-yellow text-center">
                      Quest item — cannot be sold
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {character?.currentBuilding &&
        Array.isArray(character.currentBuilding.functionality) &&
        (character.currentBuilding.functionality as string[]).some((f) =>
          ['SHOP', 'BLACK_MARKET', 'CLINIC'].includes(f),
        ) && (
          <p className="text-xs text-heliora-text-dim text-center">
            You&apos;re inside <span className="text-heliora-cyan">{character.currentBuilding.name}</span>
            . Open the <a href="/shop" className="text-heliora-cyan hover:underline">SHOP</a> page
            to buy or sell items.
          </p>
        )}
    </main>
  );
}
