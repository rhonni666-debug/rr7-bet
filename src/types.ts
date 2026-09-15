export type Provider = {
  id: string;
  name: string;
  shortName: string;
  accent: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type DemoGame = {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  categoryId: string;
  art: string;
  accent: string;
  featured?: boolean;
  popular?: boolean;
  isNew?: boolean;
};

export type WalletTransaction = {
  id: string;
  type: 'INITIAL_BONUS' | 'BET' | 'WIN' | 'REFUND';
  amount: number;
  description: string;
  createdAt: string;
};
