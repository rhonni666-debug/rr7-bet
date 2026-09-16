import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, ShieldCheck } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

export function AdminCreditsPage() {
  return <AdminGate><AdminShell><CreditsContent /></AdminShell></AdminGate>;
}

function CreditsContent() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const data = useQuery({
    queryKey: ['admin', 'credits'],
    queryFn: async () => {
      const [profiles, transactions] = await Promise.all([
        supabase.from('profiles').select('id,display_name,role,created_at').order('created_at', { ascending: false }),
        supabase.from('wallet_transactions').select('user_id,amount'),
      ]);
      if (profiles.error) throw profiles.error;
      if (transactions.error) throw transactions.error;
      return { profiles: profiles.data ?? [], transactions: transactions.data ?? [] };
    },
  });

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of data.data?.transactions ?? []) {
      map.set(tx.user_id, (map.get(tx.user_id) ?? 0) + Number(tx.amount));
    }
    return map;
  }, [data.data]);

  const profiles = data.data?.profiles ?? [];
  const selected = userId || profiles[0]?.id || '';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const numericAmount = Number(amount);
    if (!selected) return setMessage('Selecione um usuário.');
    if (!Number.isFinite(numericAmount) || numericAmount === 0) return setMessage('Informe um ajuste diferente de zero.');
    if (Math.abs(numericAmount) > 100000) return setMessage('O ajuste máximo por operação é 100.000 créditos DEMO.');
    if (reason.trim().length < 3) return setMessage('Informe um motivo com pelo menos 3 caracteres.');

    setBusy(true);
    const { data: newBalance, error } = await supabase.rpc('admin_adjust_demo_wallet', {
      p_user_id: selected,
      p_amount: numericAmount,
      p_reason: reason.trim(),
    });
    setBusy(false);

    if (error) {
      const code = error.message.includes('NEGATIVE_BALANCE_NOT_ALLOWED')
        ? 'O ajuste deixaria a carteira com saldo negativo.'
        : error.message.includes('INVALID_ADJUSTMENT')
          ? 'Valor de ajuste inválido.'
          : error.message.includes('INVALID_REASON')
            ? 'Motivo inválido.'
            : 'Não foi possível registrar o ajuste.';
      setMessage(code);
      return;
    }

    setAmount('');
    setReason('');
    setMessage(`Ajuste registrado. Novo saldo: ${Number(newBalance ?? 0).toLocaleString('pt-BR')} créditos DEMO.`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
    ]);
  }

  return <div className="space-y-6"><header><div className="flex items-center gap-2 text-amber-300"><CircleDollarSign className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[.16em]">Operação DEMO</p></div><h1 className="mt-2 text-3xl font-black">Créditos</h1><p className="mt-2 text-sm text-slate-400">Ajustes nunca alteram transações antigas. Cada operação cria um `ADMIN_ADJUSTMENT` novo no ledger e um evento de auditoria.</p></header><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><section className="overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]"><div className="border-b border-white/8 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">Carteiras DEMO</div>{data.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando...</p> : data.isError ? <p className="p-5 text-sm text-rose-300">Falha ao carregar carteiras.</p> : profiles.map((profile) => <button key={profile.id} onClick={() => setUserId(profile.id)} className={`flex w-full items-center justify-between gap-4 border-b border-white/5 px-4 py-4 text-left last:border-0 ${selected === profile.id ? 'bg-amber-300/[.06]' : 'hover:bg-white/[.025]'}`}><div className="min-w-0"><p className="truncate text-sm font-black">{profile.display_name || 'Jogador'}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{profile.role} • {profile.id.slice(0, 8)}</p></div><p className="shrink-0 text-sm font-black text-amber-300">{(balances.get(profile.id) ?? 0).toLocaleString('pt-BR')}</p></button>)}</section><form onSubmit={(event) => void submit(event)} className="h-fit rounded-3xl border border-white/8 bg-white/[.035] p-5 xl:sticky xl:top-20"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="text-lg font-black">Novo ajuste</h2></div><label className="mt-4 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Usuário</span><select value={selected} onChange={(event) => setUserId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b2630] px-3 py-3 text-sm font-bold">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.id.slice(0, 8)}</option>)}</select></label><label className="mt-4 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor</span><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" step="1" placeholder="Ex.: 500 ou -100" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.055] px-3 py-3 text-sm outline-none focus:border-amber-300/40" /><p className="mt-1 text-[10px] text-slate-600">Positivo adiciona; negativo remove. Nunca pode deixar saldo abaixo de zero.</p></label><label className="mt-4 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Motivo</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} rows={3} placeholder="Motivo do ajuste" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[.055] px-3 py-3 text-sm outline-none focus:border-amber-300/40" /></label>{message && <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">{message}</p>}<button disabled={busy || !profiles.length} className="mt-5 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? 'Registrando...' : 'Registrar ajuste'}</button></form></div></div>;
}
