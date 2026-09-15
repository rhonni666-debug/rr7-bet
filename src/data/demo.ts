import type { Category, DemoGame, Provider } from '../types';

export const providers: Provider[] = [
  { id: 'rr7', name: 'RR7 Originals', shortName: 'RR7', accent: 'from-amber-400 to-yellow-600' },
  { id: 'pg-demo', name: 'PG Demo', shortName: 'PG', accent: 'from-red-500 to-orange-500' },
  { id: 'pp-demo', name: 'Pragmatic Demo', shortName: 'PP', accent: 'from-violet-500 to-fuchsia-500' },
  { id: 'evo-demo', name: 'Evolution Demo', shortName: 'EVO', accent: 'from-blue-500 to-cyan-500' },
  { id: 'tada-demo', name: 'TaDa Demo', shortName: 'TD', accent: 'from-emerald-500 to-teal-400' },
];

export const categories: Category[] = [
  { id: 'all', name: 'Todos', icon: '✦' },
  { id: 'slots', name: 'Slots', icon: '🎰' },
  { id: 'crash', name: 'Crash', icon: '🚀' },
  { id: 'casino', name: 'Cassino', icon: '♠' },
  { id: 'live', name: 'Ao Vivo', icon: '●' },
  { id: 'arcade', name: 'Arcade', icon: '◆' },
];

export const games: DemoGame[] = [
  { id: '1', slug: 'lucky-panda', name: 'Lucky Panda', providerId: 'pg-demo', categoryId: 'slots', art: '🐼', accent: 'from-emerald-500 via-green-500 to-lime-400', featured: true, popular: true },
  { id: '2', slug: 'dragon-coins', name: 'Dragon Coins', providerId: 'rr7', categoryId: 'slots', art: '🐉', accent: 'from-red-600 via-orange-500 to-amber-400', popular: true },
  { id: '3', slug: 'golden-jungle', name: 'Golden Jungle', providerId: 'pp-demo', categoryId: 'slots', art: '🦁', accent: 'from-yellow-600 via-amber-500 to-orange-600', featured: true },
  { id: '4', slug: 'neon-fruits', name: 'Neon Fruits', providerId: 'tada-demo', categoryId: 'arcade', art: '🍒', accent: 'from-fuchsia-600 via-pink-500 to-purple-500', isNew: true },
  { id: '5', slug: 'royal-crown', name: 'Royal Crown', providerId: 'evo-demo', categoryId: 'casino', art: '👑', accent: 'from-indigo-600 via-blue-500 to-cyan-400', popular: true },
  { id: '6', slug: 'ocean-treasure', name: 'Ocean Treasure', providerId: 'rr7', categoryId: 'slots', art: '🧜', accent: 'from-cyan-600 via-sky-500 to-blue-700', isNew: true },
  { id: '7', slug: 'pirate-gold', name: 'Pirate Gold', providerId: 'pp-demo', categoryId: 'slots', art: '🏴‍☠️', accent: 'from-stone-700 via-amber-700 to-yellow-500' },
  { id: '8', slug: 'magic-temple', name: 'Magic Temple', providerId: 'pg-demo', categoryId: 'slots', art: '🏯', accent: 'from-purple-700 via-violet-600 to-pink-500', featured: true },
  { id: '9', slug: 'lucky-wild', name: 'Lucky Wild', providerId: 'tada-demo', categoryId: 'arcade', art: '🍀', accent: 'from-green-700 via-emerald-500 to-teal-400' },
  { id: '10', slug: 'super-fortune', name: 'Super Fortune', providerId: 'rr7', categoryId: 'slots', art: '💰', accent: 'from-amber-600 via-yellow-500 to-lime-400', popular: true },
  { id: '11', slug: 'diamond-rush', name: 'Diamond Rush', providerId: 'evo-demo', categoryId: 'crash', art: '💎', accent: 'from-blue-700 via-cyan-500 to-teal-300', isNew: true },
  { id: '12', slug: 'fire-spin', name: 'Fire Spin', providerId: 'pg-demo', categoryId: 'slots', art: '🔥', accent: 'from-rose-700 via-red-500 to-orange-400', popular: true },
];

export const promotions = [
  { id: 'welcome', title: '10.000 créditos DEMO', subtitle: 'Explore a plataforma sem dinheiro real.', icon: '7' },
  { id: 'mission', title: 'Missão diária DEMO', subtitle: 'Teste jogos diferentes e acompanhe o histórico.', icon: '★' },
  { id: 'ranking', title: 'Ranking semanal', subtitle: 'Recurso visual demonstrativo, sem premiação financeira.', icon: '♛' },
];
