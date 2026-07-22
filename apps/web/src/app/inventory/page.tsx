'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import { describeItemFeatures, formatUiError } from '@/lib/ui-presenters';
import type { CraftingRecipesView, HousingView, InventoryItem } from '@heliora/platform-sdk';

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
  const [housing, setHousing] = useState<HousingView | null>(null);
  const [crafting, setCrafting] = useState<CraftingRecipesView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function reload() {
    if (!session.characterId) return;
    setLoading(true);
    try {
      const [data, housingView, craftingView] = await Promise.all([
        api.getCharacterInventory(session.characterId),
        api.getCharacterHousing(session.characterId).catch(() => null),
        api.getCraftingRecipes(session.characterId).catch(() => null),
      ]);
      setItems(data);
      setHousing(housingView);
      setCrafting(craftingView);
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
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 3500);
    }
  }

  async function craft(recipeId: string) {
    if (!session.characterId) return;
    setBusy(`craft:${recipeId}`);
    setMessage('');
    try {
      const result = await api.craftRecipe(session.characterId, recipeId);
      const levelNote = result.levelUp ? ` · ⬆ LEVEL UP! Now level ${result.levelUp.level}` : '';
      setMessage(
        `✅ Crafted ${result.quantity}× ${result.crafted} (+${result.xpGained} XP)${levelNote}`,
      );
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 6000);
    }
  }

  async function storeItem(item: InventoryItem) {
    if (!session.characterId) return;
    setBusy(item.id);
    setMessage('');
    try {
      await api.storeHousingItem(session.characterId, item.id);
      setMessage(`✅ Stored ${item.itemDefinition.name} in your safehouse`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(''), 3500);
    }
  }

  async function toggleEquip(item: InventoryItem) {
    if (!session.characterId) return;
    setBusy(item.id);
    setMessage('');
    try {
      if (item.equippedSlot) {
        await api.unequipItem(session.characterId, item.id);
        setMessage(`✅ Unequipped ${item.itemDefinition.name}`);
      } else {
        await api.equipItem(session.characterId, item.id);
        setMessage(`✅ Equipped ${item.itemDefinition.name}`);
      }
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
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
              const isEquippable = ['WEAPON', 'CLOTHING', 'TOOL', 'VEHICLE'].includes(
                item.itemDefinition.category,
              );
              const featureLines = describeItemFeatures(item.itemDefinition);
              return (
                <div
                  key={item.id}
                  className={`border rounded p-3 bg-heliora-dark ${
                    item.equippedSlot ? 'border-heliora-cyan/60' : 'border-heliora-border'
                  }`}
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
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-heliora-text-dim">{item.condition}%</span>
                      {item.equippedSlot && (
                        <span className="rounded border border-heliora-cyan/50 bg-heliora-cyan/10 px-1 text-[10px] font-mono font-bold text-heliora-cyan">
                          EQUIPPED
                        </span>
                      )}
                    </div>
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
                  <div className="mt-3 rounded border border-heliora-border/60 bg-black/10 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-heliora-text-dim">
                      What It Does
                    </p>
                    <div className="mt-1 space-y-1 text-xs text-heliora-text-dim">
                      {featureLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
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
                  {isEquippable && (
                    <button
                      onClick={() => void toggleEquip(item)}
                      disabled={busy === item.id}
                      className={`mt-3 w-full px-3 py-1 rounded text-xs font-mono font-bold disabled:opacity-50 ${
                        item.equippedSlot
                          ? 'bg-heliora-dark border border-heliora-border text-heliora-text-dim hover:text-heliora-text'
                          : 'bg-heliora-cyan/20 border border-heliora-cyan/50 text-heliora-cyan hover:bg-heliora-cyan/30'
                      }`}
                    >
                      {busy === item.id ? '…' : item.equippedSlot ? 'UNEQUIP' : 'EQUIP'}
                    </button>
                  )}
                  {housing?.housing && housing.atHousingBuilding && !item.equippedSlot && (
                    <button
                      onClick={() => void storeItem(item)}
                      disabled={busy === item.id}
                      className="mt-2 w-full rounded border border-heliora-teal/50 bg-heliora-teal/10 px-3 py-1 text-xs font-mono font-bold text-heliora-teal hover:bg-heliora-teal/20 disabled:opacity-50"
                    >
                      {busy === item.id ? '…' : '🏠 STORE IN SAFEHOUSE'}
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

      {crafting && (
        <Panel
          title={`Workshop${crafting.atWorkshop ? '' : ' — no workbench here'}`}
          accent="orange"
        >
          {!crafting.atWorkshop && (
            <p className="mb-3 text-xs text-heliora-text-dim">
              Crafting needs a workshop: any <span className="text-heliora-orange">warehouse</span>
              , or <span className="text-heliora-orange">your own rented safehouse</span>. Recipes
              below show what you could make.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {crafting.recipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`rounded border p-2 ${
                  recipe.canCraft
                    ? 'border-heliora-orange/60 bg-heliora-orange/10'
                    : 'border-heliora-border bg-heliora-dark opacity-80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-bold text-heliora-text">
                      🔧 {recipe.name} → {recipe.output.quantity}× {recipe.output.itemName}
                    </div>
                    <p className="truncate text-xs text-heliora-text-dim">{recipe.description}</p>
                  </div>
                  <button
                    onClick={() => void craft(recipe.id)}
                    disabled={busy !== null || !recipe.canCraft}
                    className="shrink-0 rounded border border-heliora-orange/60 bg-heliora-orange/20 px-3 py-1 text-xs font-mono font-bold text-heliora-orange hover:bg-heliora-orange/30 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {busy === `craft:${recipe.id}` ? '…' : 'CRAFT'}
                  </button>
                </div>
                <p className="mt-1 text-[11px] font-mono text-heliora-text-dim">
                  {recipe.inputs
                    .map((input) => `${input.quantity}× ${input.itemName}`)
                    .join(' + ')}{' '}
                  + ${recipe.creditsCost} · ⚡{recipe.energyCost} ·{' '}
                  {recipe.statRequirement.key.slice(0, 3).toUpperCase()} ≥{' '}
                  {recipe.statRequirement.min} · +{recipe.xpReward} XP
                </p>
                {!recipe.canCraft && recipe.reasons.length > 0 && (
                  <p className="mt-1 text-[11px] text-heliora-red/80">{recipe.reasons[0]}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

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
