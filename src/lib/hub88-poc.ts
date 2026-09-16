import { supabase } from '../integrations/supabase/client';

type Hub88Response<T> = {
  data?: T;
  meta?: {
    latencyMs?: number;
    count?: number;
    productCode?: string;
  };
  error?: string;
};

async function invoke<T>(body: Record<string, unknown>): Promise<Hub88Response<T>> {
  const { data, error } = await supabase.functions.invoke('hub88-demo', { body });
  if (error) throw error;
  const payload = (data ?? {}) as Hub88Response<T>;
  if (payload.error) throw new Error(payload.error);
  return payload;
}

export type Hub88PocProduct = Record<string, unknown>;
export type Hub88PocGame = Record<string, unknown> & {
  game_code?: string;
  name?: string;
  title?: string;
  product?: string | Record<string, unknown>;
  url_thumb?: string;
  url_background?: string;
};

export const Hub88Poc = {
  status() {
    return invoke<Record<string, unknown>>({ action: 'status' });
  },
  listProducts() {
    return invoke<Hub88PocProduct[]>({ action: 'list_products' });
  },
  listGames(productCode?: string) {
    return invoke<Hub88PocGame[]>({ action: 'list_games', productCode });
  },
  launchDemo(gameCode: string, deviceType: 'mobile' | 'desktop') {
    return invoke<{ url: string; gameCode: string; currency: 'XXX'; mode: 'demo' }>({
      action: 'launch_demo',
      gameCode,
      deviceType,
    });
  },
};
