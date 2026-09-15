import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import type { Banner, Category, DemoGame, Promotion, Provider } from '../types';

export type CatalogData = {
  providers: Provider[];
  categories: Category[];
  games: DemoGame[];
  banners: Banner[];
  promotions: Promotion[];
};

function mapProvider(row: Record<string, unknown>): Provider {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    shortName: String(row.short_name),
    logoUrl: typeof row.logo_url === 'string' ? row.logo_url : null,
    accent: String(row.accent),
    status: String(row.status),
    providerType: String(row.provider_type),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    icon: String(row.icon ?? '✦'),
    sortOrder: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
  };
}

function mapGame(row: Record<string, unknown>): DemoGame {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    providerId: String(row.provider_id),
    categoryId: String(row.category_id),
    thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    bannerUrl: typeof row.banner_url === 'string' ? row.banner_url : null,
    description: typeof row.description === 'string' ? row.description : null,
    art: String(row.art ?? '🎮'),
    accent: String(row.accent ?? 'from-slate-700 to-slate-900'),
    status: String(row.status ?? 'ACTIVE'),
    featured: Boolean(row.featured),
    popular: Boolean(row.popular),
    isNew: Boolean(row.new_game),
    isDemo: Boolean(row.is_demo),
    launchType: String(row.launch_type ?? 'MOCK'),
    externalGameId: typeof row.external_game_id === 'string' ? row.external_game_id : null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapBanner(row: Record<string, unknown>): Banner {
  return {
    id: String(row.id),
    title: String(row.title),
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
    mobileImageUrl: typeof row.mobile_image_url === 'string' ? row.mobile_image_url : null,
    ctaLabel: typeof row.cta_label === 'string' ? row.cta_label : null,
    ctaTarget: typeof row.cta_target === 'string' ? row.cta_target : null,
    position: String(row.position ?? 'HOME_HERO'),
    active: Boolean(row.active),
    startAt: typeof row.start_at === 'string' ? row.start_at : null,
    endAt: typeof row.end_at === 'string' ? row.end_at : null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapPromotion(row: Record<string, unknown>): Promotion {
  return {
    id: String(row.id),
    title: String(row.title),
    description: typeof row.description === 'string' ? row.description : null,
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
    type: String(row.type ?? 'DEMO'),
    active: Boolean(row.active),
    startAt: typeof row.start_at === 'string' ? row.start_at : null,
    endAt: typeof row.end_at === 'string' ? row.end_at : null,
  };
}

export async function fetchCatalog(): Promise<CatalogData> {
  const [providersResult, categoriesResult, gamesResult, bannersResult, promotionsResult] = await Promise.all([
    supabase.from('providers').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('game_categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('games').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('banners').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('promotions').select('*').order('created_at', { ascending: false }),
  ]);

  const results = [providersResult, categoriesResult, gamesResult, bannersResult, promotionsResult];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    providers: (providersResult.data ?? []).map((row) => mapProvider(row as Record<string, unknown>)),
    categories: (categoriesResult.data ?? []).map((row) => mapCategory(row as Record<string, unknown>)),
    games: (gamesResult.data ?? []).map((row) => mapGame(row as Record<string, unknown>)),
    banners: (bannersResult.data ?? []).map((row) => mapBanner(row as Record<string, unknown>)),
    promotions: (promotionsResult.data ?? []).map((row) => mapPromotion(row as Record<string, unknown>)),
  };
}

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
