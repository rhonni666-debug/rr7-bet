import { supabase } from '../integrations/supabase/client';

type Hub88PublicDemoResponse = {
  data?: {
    url: string;
    gameCode: string;
    currency: 'XXX';
    mode: 'demo';
  };
  error?: string;
};

export const Hub88PublicDemo = {
  async launch(gameId: string, deviceType: 'mobile' | 'desktop') {
    const { data, error } = await supabase.functions.invoke('hub88-public-demo', {
      body: { gameId, deviceType },
    });

    if (error) throw error;
    const payload = (data ?? {}) as Hub88PublicDemoResponse;
    if (payload.error) throw new Error(payload.error);
    if (!payload.data?.url) throw new Error('HUB88_EMPTY_LAUNCH_URL');
    return payload.data;
  },
};
