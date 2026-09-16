export type Provider = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  accent: string;
  status: string;
  providerType: string;
  sortOrder: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  active: boolean;
};

export type DemoGame = {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  categoryId: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  art: string;
  accent: string;
  status: string;
  featured: boolean;
  popular: boolean;
  isNew: boolean;
  isDemo: boolean;
  launchType: string;
  externalGameId: string | null;
  sortOrder: number;
};

export type GameSession = {
  id: string;
  token: string;
  status: string;
  expiresAt: string | null;
  launchUrl: string | null;
};

export type RoundOutcome = {
  roundId: string;
  bet: number;
  win: number;
  result: 'WIN' | 'LOSS' | 'PUSH';
  multiplier: number;
  newBalance: number;
};

export type SlotSymbol = {
  id: string;
  icon: string;
  label: string;
  weight: number;
  pay: number;
  wild?: boolean;
  scatter?: boolean;
};

export type SlotConfig = {
  gameId: string;
  layout: number[];
  symbols: SlotSymbol[];
  feature: Record<string, unknown>;
  theme: {
    title?: string;
    primary?: string;
    secondary?: string;
    background?: string;
    glow?: string;
    [key: string]: unknown;
  };
  active: boolean;
  version: number;
};

export type SlotWin = {
  symbolId: string;
  ways: number;
  multiplier: number;
};

export type SlotSpinOutcome = RoundOutcome & {
  grid: string[][];
  feature: Record<string, unknown>;
  wins: SlotWin[];
  scatterCount: number;
  layout: number[];
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaTarget: string | null;
  position: string;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  sortOrder: number;
};

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
};

export type UserProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  type: 'INITIAL_BONUS' | 'BET' | 'WIN' | 'REFUND' | 'PROMO_BONUS' | 'ADMIN_ADJUSTMENT';
  amount: number;
  description: string;
  createdAt: string;
};
