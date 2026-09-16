import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import type { SlotConfig, SlotSymbol } from '../types';

function mapConfig(row: Record<string, unknown>): SlotConfig {
  return {
    gameId: String(row.game_id),
    layout: Array.isArray(row.layout) ? row.layout.map(Number) : [3, 3, 3],
    symbols: Array.isArray(row.symbols) ? row.symbols as SlotSymbol[] : [],
    feature: row.feature && typeof row.feature === 'object' ? row.feature as Record<string, unknown> : {},
    theme: row.theme && typeof row.theme === 'object' ? row.theme as SlotConfig['theme'] : {},
    active: Boolean(row.active),
    version: Number(row.version ?? 1),
  };
}

export async function fetchSlotConfig(gameId: string): Promise<SlotConfig | null> {
  const { data, error } = await supabase
    .from('slot_game_configs')
    .select('game_id,layout,symbols,feature,theme,active,version')
    .eq('game_id', gameId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapConfig(data as Record<string, unknown>) : null;
}

export function useSlotConfig(gameId: string | null | undefined) {
  return useQuery({
    queryKey: ['slot-config', gameId],
    queryFn: () => fetchSlotConfig(gameId!),
    enabled: Boolean(gameId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
