'use client';

import { useEffect, useState } from 'react';
import { api, type AdminCorporation, type AdminFaction } from '@/lib/api';
import type { RewardReferenceLookup } from '@/lib/ui-presenters';

export function useRewardReferenceLookup(): RewardReferenceLookup {
  const [lookup, setLookup] = useState<RewardReferenceLookup>({
    factionNames: {},
    corporationNames: {},
  });

  useEffect(() => {
    let cancelled = false;

    async function loadLookup() {
      try {
        const [factions, corporations] = await Promise.all([
          api.getFactions(),
          api.getCorporations(),
        ]);

        if (cancelled) {
          return;
        }

        setLookup({
          factionNames: Object.fromEntries(
            factions.map((faction: AdminFaction) => [faction.id, faction.name]),
          ),
          corporationNames: Object.fromEntries(
            corporations.map((corporation: AdminCorporation) => [corporation.id, corporation.name]),
          ),
        });
      } catch {
        // Leave lookup empty and fall back to ids in the UI.
      }
    }

    void loadLookup();

    return () => {
      cancelled = true;
    };
  }, []);

  return lookup;
}