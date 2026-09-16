import type { ReactNode } from 'react';
import { Activity, Blocks, CircleDollarSign, Coins, Gamepad2, Gauge, Gift, Image, LayoutDashboard, ListTree, ScrollText, TimerReset, Users } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';

const items = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/admin/jogos', label: 'Jogos', icon: Gamepad2 },
  { to: '/admin/provedores', label: 'Provedores', icon: Blocks },
  { to: '/admin/categorias', label: 'Categorias', icon: ListTree },
  { to: '/admin/banners', label: 'Banners', icon: Image },
  { to: '/admin/promocoes', label: 'Promoções', icon: Gift },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/admin/creditos', label: 'Créditos', icon: Coins },
  { to: '/admin/sessoes', label: 'Sessões', icon: TimerReset },
  { to: '/admin/transacoes', label: 'Transações', icon: CircleDollarSign },
  { to: '/admin/auditoria', label: 'Auditoria', icon: ScrollText },
  { to: '/admin/hub88-poc', label: 'Hub88 POC', icon: Gauge },
  { to: '/admin/poc-metrics', label: 'POC Benchmark', icon: Activity },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="rounded-3xl border border-white/8 bg-white/[.035] p-3 lg:sticky lg:top-20 lg:h-fit"><div className="px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">RR7.BET</p><p className="mt-1 text-lg font-black">Administração</p></div><nav className="hide-scrollbar flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">{items.map((item) => { const Icon = item.icon; const active = item.to === '/admin' ? pathname === '/admin' : pathname.startsWith(item.to); return <Link key={item.to} to={item.to} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? 'bg-amber-300 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</nav></aside><section className="min-w-0">{children}</section></div>;
}
