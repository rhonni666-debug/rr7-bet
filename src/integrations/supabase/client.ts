import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://tndnqjbkfwongolorvjm.supabase.co';
const fallbackPublishableKey = 'sb_publishable_4JSL8nJYjeTWhXJCDkGC1Q_EwxNaumf';

const url = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey;

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
