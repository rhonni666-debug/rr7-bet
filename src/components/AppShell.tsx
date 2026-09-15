import { Gamepad2, Gift, Home, UserRound, WalletCards } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useDemo } from '../lib/demo-store';
import { Brand } from './Brand';

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/promocoes', label: 'Promoções', icon: Gift },
  { to: '/jogos', label: 'Jogos', icon: Gamepad2 },
  { to: '/carteira', label: 'Carteira', icon: WalletCards },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { balance } = useDemo();

  return (
    <div className="min-h-dvh bg-[#06171f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#071c26]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" aria-label="Ir para o início"><Brand compact /></Link>
          <Link to="/carteira" className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-right">
            <p className="text-[9px] font-bold uppercase tracking-[.16em] text-amber-300/80">Saldo demo</p>
            <p className="text-sm font-black text-amber-300">{balance.toLocaleString('pt-BR')} créditos</p>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 md:px-6 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#081f29]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${active ? 'text-amber-300' : 'text-slate-400'}`}>
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.6]' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
