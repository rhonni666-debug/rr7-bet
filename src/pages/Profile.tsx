import { ChevronRight, CircleUserRound, Info, LockKeyhole } from 'lucide-react';
import { Brand } from '../components/Brand';

export function ProfilePage() {
  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Conta</p><h1 className="mt-1 text-3xl font-black">Perfil DEMO</h1></header><section className="flex items-center gap-4 rounded-3xl border border-white/8 bg-white/[.035] p-5"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950"><CircleUserRound className="h-8 w-8" /></div><div><Brand compact /><p className="mt-1 text-sm text-slate-400">Visitante demonstrativo</p></div></section><section className="overflow-hidden rounded-2xl border border-white/8 bg-white/[.035]"><Row icon={LockKeyhole} title="Autenticação" value="Será conectada ao Supabase" /><Row icon={Info} title="Modo atual" value="Laboratório educacional" /></section><div className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm leading-6 text-slate-300">Esta primeira fundação mantém dados apenas no navegador. O próximo bloco migra identidade, favoritos, histórico e ledger para banco com RLS por usuário.</div></div>;
}

function Row({ icon: Icon, title, value }: { icon: typeof Info; title: string; value: string }) {
  return <div className="flex items-center gap-3 border-b border-white/6 px-4 py-4 last:border-b-0"><Icon className="h-5 w-5 text-amber-300" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title}</p><p className="text-xs text-slate-500">{value}</p></div><ChevronRight className="h-4 w-4 text-slate-600" /></div>;
}
