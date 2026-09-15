import { Gift } from 'lucide-react';
import { useCatalog } from '../lib/catalog';

export function PromotionsPage() {
  const catalog = useCatalog();
  const promotions = catalog.data?.promotions ?? [];

  if (catalog.isLoading) return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-8 text-sm text-slate-400">Carregando promoções...</div>;

  return <div><header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">RR7.BET</p><h1 className="mt-1 text-3xl font-black">Promoções DEMO</h1><p className="mt-2 text-sm text-slate-400">Campanhas controladas pelo painel e sem valor financeiro.</p></header>{catalog.isError ? <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-sm text-rose-200">Não foi possível carregar as promoções.</div> : promotions.length ? <div className="mt-6 grid gap-4 md:grid-cols-3">{promotions.map((promo, index) => <article key={promo.id} className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#123945] to-[#0a2029] p-5" style={promo.imageUrl ? { backgroundImage: `linear-gradient(135deg,rgba(7,28,38,.92),rgba(7,28,38,.72)),url(${promo.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-slate-950"><Gift className="h-5 w-5" /></div><h2 className="mt-5 text-xl font-black">{promo.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{promo.description ?? 'Campanha demonstrativa RR7.BET.'}</p><span className="mt-5 inline-flex rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">{promo.type || `Campanha ${String(index + 1).padStart(2, '0')}`}</span></article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">Nenhuma promoção ativa neste momento.</div>}</div>;
}
