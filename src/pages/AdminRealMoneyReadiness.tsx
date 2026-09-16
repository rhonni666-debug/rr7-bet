import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Banknote, Building2, CircleAlert, CreditCard, Landmark, LockKeyhole, ShieldCheck, UserCheck, WalletCards } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

type Settings = {
  production_state: 'DISABLED' | 'COMPLIANCE_PENDING' | 'PSP_SANDBOX' | 'READY_FOR_AUTHORIZED_PRODUCTION' | 'PRODUCTION_ENABLED';
  currency: string;
  deposits_enabled: boolean;
  withdrawals_enabled: boolean;
  real_money_games_enabled: boolean;
  legal_entity_verified: boolean;
  regulatory_authorization_verified: boolean;
  regulatory_reference: string | null;
  psp_provider: string | null;
  psp_merchant_reference: string | null;
  settlement_account_reference: string | null;
  same_ownership_required: boolean;
  kyc_required: boolean;
  min_deposit: number;
  max_deposit: number;
  min_withdrawal: number;
  max_withdrawal: number;
};

type Company = {
  legal_name: string | null;
  trade_name: string | null;
  tax_id: string | null;
};

function maskedCnpj(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 14) return 'Não configurado';
  return `${digits.slice(0, 2)}.***.***/****-${digits.slice(-2)}`;
}

function CheckCard({ ok, title, detail, icon: Icon }: { ok: boolean; title: string; detail: string; icon: typeof ShieldCheck }) {
  return <div className={`rounded-2xl border p-4 ${ok ? 'border-emerald-300/15 bg-emerald-300/5' : 'border-amber-300/15 bg-amber-300/5'}`}><div className="flex items-start gap-3"><div className={`rounded-xl p-2 ${ok ? 'bg-emerald-300/10 text-emerald-300' : 'bg-amber-300/10 text-amber-300'}`}><Icon className="h-5 w-5" /></div><div><p className="font-black">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p><p className={`mt-2 text-[10px] font-black uppercase tracking-wider ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>{ok ? 'OK' : 'PENDENTE'}</p></div></div></div>;
}

export function AdminRealMoneyReadinessPage() {
  const query = useQuery({
    queryKey: ['real-money-readiness'],
    queryFn: async () => {
      const [settingsResult, companyResult] = await Promise.all([
        supabase.from('operator_real_money_settings').select('*').eq('id', 1).single(),
        supabase.from('ripcom_company_profile').select('legal_name,trade_name,tax_id').limit(1).maybeSingle(),
      ]);
      if (settingsResult.error) throw settingsResult.error;
      if (companyResult.error) throw companyResult.error;
      return { settings: settingsResult.data as Settings, company: companyResult.data as Company | null };
    },
  });

  const settings = query.data?.settings;
  const company = query.data?.company;
  const cnpjOk = (company?.tax_id ?? '').replace(/\D/g, '').length === 14;
  const pspOk = Boolean(settings?.psp_provider && settings.psp_merchant_reference);
  const settlementOk = Boolean(settings?.settlement_account_reference);
  const productionEnabled = settings?.production_state === 'PRODUCTION_ENABLED';

  return <AdminGate><AdminShell><div className="mx-auto max-w-6xl space-y-5">
    <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-2xl bg-emerald-300/10 p-3 text-emerald-300"><WalletCards className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">RR7 • Real Money Readiness</p><h1 className="mt-1 text-3xl font-black">Wallet BRL preparada, produção bloqueada</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Esta tela mostra somente a prontidão técnica e de compliance. A wallet de dinheiro real é separada do saldo DEMO e não pode entrar em produção enquanto os requisitos abaixo não estiverem verificados.</p></div></div><div className={`rounded-xl border px-4 py-2 text-xs font-black ${productionEnabled ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-300' : 'border-amber-300/30 bg-amber-300/10 text-amber-300'}`}>{settings?.production_state ?? 'CARREGANDO'}</div></div>
      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-300/15 bg-rose-300/5 p-4 text-sm text-rose-100"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><p>Não existe botão de ativação direta nesta tela. Produção depende de validação jurídica/regulatória, PSP e conta de liquidação do operador.</p></div>
    </section>

    {query.isLoading ? <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6 text-sm text-slate-400">Carregando prontidão...</section> : query.error ? <section className="rounded-3xl border border-rose-300/20 bg-rose-300/5 p-6 text-sm text-rose-200">{query.error instanceof Error ? query.error.message : 'Falha ao carregar.'}</section> : <>
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CheckCard ok={cnpjOk} icon={Building2} title="CNPJ / entidade" detail={cnpjOk ? `${company?.legal_name ?? company?.trade_name ?? 'Empresa'} • ${maskedCnpj(company?.tax_id)}` : 'Preencha o perfil empresarial em RIPCOM Empresa.'} />
        <CheckCard ok={Boolean(settings?.legal_entity_verified)} icon={BadgeCheck} title="Entidade verificada" detail="Confirmação administrativa de que os dados empresariais foram validados." />
        <CheckCard ok={Boolean(settings?.regulatory_authorization_verified)} icon={ShieldCheck} title="Autorização regulatória" detail={settings?.regulatory_reference ? `Referência: ${settings.regulatory_reference}` : 'Referência regulatória ainda não cadastrada.'} />
        <CheckCard ok={pspOk} icon={CreditCard} title="PSP / pagamentos" detail={pspOk ? `${settings?.psp_provider} configurado` : 'PSP/merchant de pagamentos ainda não configurado.'} />
        <CheckCard ok={settlementOk} icon={Landmark} title="Conta de liquidação" detail={settlementOk ? 'Referência de settlement configurada.' : 'Conta/merchant de liquidação ainda não vinculada.'} />
        <CheckCard ok={Boolean(settings?.kyc_required)} icon={UserCheck} title="KYC obrigatório" detail="A arquitetura exige identidade/idade e titularidade antes da wallet real." />
        <CheckCard ok={Boolean(settings?.same_ownership_required)} icon={Banknote} title="Mesma titularidade" detail="Depósitos e saques preparados para validação de titularidade do jogador." />
        <CheckCard ok={productionEnabled} icon={CircleAlert} title="Produção" detail={productionEnabled ? 'Todas as travas de produção foram satisfeitas.' : 'Dinheiro real permanece tecnicamente bloqueado.'} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
        <h2 className="text-xl font-black">Camadas criadas</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-black/20 p-4"><p className="font-black">real_wallet_accounts</p><p className="mt-1 text-xs text-slate-500">Conta BRL de cada jogador, separada da wallet DEMO.</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="font-black">real_wallet_ledger_entries</p><p className="mt-1 text-xs text-slate-500">Ledger idempotente de depósito, saque, aposta, prêmio, refund e reversão.</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="font-black">real_payment_intents</p><p className="mt-1 text-xs text-slate-500">Intenções de depósito/saque vinculáveis ao PSP, sem guardar segredo bancário no frontend.</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="font-black">real_money_kyc_checks</p><p className="mt-1 text-xs text-slate-500">Estado de KYC, idade e titularidade. Documentos brutos não são armazenados aqui.</p></div></div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><h2 className="text-xl font-black">Limites preparados</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Depósito mínimo</p><p className="mt-1 font-black">R$ {Number(settings?.min_deposit ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Depósito máximo</p><p className="mt-1 font-black">R$ {Number(settings?.max_deposit ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Saque mínimo</p><p className="mt-1 font-black">R$ {Number(settings?.min_withdrawal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Saque máximo</p><p className="mt-1 font-black">R$ {Number(settings?.max_withdrawal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div></div></section>
    </>}
  </div></AdminShell></AdminGate>;
}
