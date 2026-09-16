import { useEffect, useState } from 'react';
import { Building2, Save, ShieldCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';

type CompanyProfile = {
  id: string;
  legal_name: string | null;
  trade_name: string | null;
  tax_id: string | null;
  country_code: string;
  business_email: string | null;
  business_phone: string | null;
  website_url: string | null;
  contract_contact_name: string | null;
  contract_contact_email: string | null;
  notes: string | null;
  updated_at: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 14);
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function AdminRipcomCompanyPage() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Dados empresariais privados da provedora. Nada desta tela é publicado automaticamente.');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('RIPCOM');
  const [taxId, setTaxId] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');

  const profileQuery = useQuery({
    queryKey: ['ripcom-company-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ripcom_company_profile')
        .select('id,legal_name,trade_name,tax_id,country_code,business_email,business_phone,website_url,contract_contact_name,contract_contact_email,notes,updated_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyProfile | null;
    },
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setLegalName(profile.legal_name ?? '');
    setTradeName(profile.trade_name ?? 'RIPCOM');
    setTaxId(profile.tax_id ?? '');
    setBusinessEmail(profile.business_email ?? '');
    setBusinessPhone(profile.business_phone ?? '');
    setWebsiteUrl(profile.website_url ?? '');
    setContactName(profile.contract_contact_name ?? '');
    setContactEmail(profile.contract_contact_email ?? '');
    setNotes(profile.notes ?? '');
  }, [profileQuery.data]);

  async function save() {
    const profile = profileQuery.data;
    if (!profile) return;
    const cnpj = onlyDigits(taxId);
    if (cnpj && cnpj.length !== 14) {
      setMessage('O CNPJ deve conter 14 dígitos.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('ripcom_company_profile')
        .update({
          legal_name: legalName.trim() || null,
          trade_name: tradeName.trim() || 'RIPCOM',
          tax_id: cnpj || null,
          country_code: 'BR',
          business_email: businessEmail.trim() || null,
          business_phone: businessPhone.trim() || null,
          website_url: websiteUrl.trim() || null,
          contract_contact_name: contactName.trim() || null,
          contract_contact_email: contactEmail.trim() || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      setMessage('Perfil empresarial RIPCOM salvo no backend privado.');
      await queryClient.invalidateQueries({ queryKey: ['ripcom-company-profile'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar o perfil empresarial.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGate>
      <AdminShell>
        <div className="mx-auto max-w-5xl space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-300/10 p-3 text-cyan-300"><Building2 className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">RIPCOM • Empresa</p>
                <h1 className="mt-1 text-3xl font-black">Perfil empresarial privado</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">Use esta área para dados reais da empresa responsável pela RIPCOM. O portal público e o player não consultam esta tabela automaticamente.</p>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm text-emerald-100"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Protegido por acesso administrativo/RLS. Não coloque esses dados em manifests públicos a menos que você decida publicá-los comercialmente.</p></div>
            <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">{message}</p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
            {profileQuery.isLoading ? <p className="text-sm text-slate-400">Carregando perfil...</p> : !profileQuery.data ? <p className="text-sm text-rose-300">Perfil empresarial não encontrado.</p> : <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Razão social<input value={legalName} onChange={(event) => setLegalName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" placeholder="Razão social da empresa" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nome fantasia<input value={tradeName} onChange={(event) => setTradeName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" placeholder="RIPCOM" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">CNPJ<input value={formatCnpj(taxId)} onChange={(event) => setTaxId(onlyDigits(event.target.value))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 font-mono text-sm normal-case text-white" placeholder="00.000.000/0000-00" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">País<input value="BR" readOnly className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 font-mono text-sm normal-case text-slate-400" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">E-mail comercial<input value={businessEmail} onChange={(event) => setBusinessEmail(event.target.value)} type="email" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Telefone comercial<input value={businessPhone} onChange={(event) => setBusinessPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">Site<input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" placeholder="https://..." /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contato contratual<input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">E-mail contratual<input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} type="email" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white" /></label>
              <div className="md:col-span-2 flex justify-end"><button disabled={busy} onClick={() => void save()} className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"><Save className="mr-2 inline h-4 w-4" />{busy ? 'Salvando...' : 'Salvar perfil empresarial'}</button></div>
            </div>}
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
