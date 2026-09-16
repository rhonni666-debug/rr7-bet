import { Activity, Braces, CheckCircle2, Gamepad2, KeyRound, Network, Server, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

const apiBase = 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b';

type Health = {
  provider?: string;
  status?: string;
  api?: string;
  mode?: string;
  timestamp?: string;
};

function CodeLine({ children }: { children: string }) {
  return <code className="block overflow-x-auto rounded-xl border border-white/10 bg-black/35 px-4 py-3 font-mono text-xs text-cyan-100">{children}</code>;
}

export function RipcomProviderPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${apiBase}/v1/health`, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('HEALTH_FAILED');
        const payload = await response.json() as { data?: Health };
        if (!cancelled) setHealth(payload.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setHealthError(true);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-dvh bg-[#03070a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(20,184,166,.16),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(56,189,248,.12),transparent_28%)]" />
      <header className="relative border-b border-white/8 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 font-black text-cyan-200">R</div>
            <div><p className="text-xl font-black tracking-[.18em]">RIPCOM</p><p className="text-[10px] font-bold uppercase tracking-[.25em] text-slate-500">Game Provider</p></div>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${health?.status === 'ok' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : healthError ? 'border-rose-300/25 bg-rose-300/10 text-rose-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
            {health?.status === 'ok' ? 'API online' : healthError ? 'status indisponível' : 'verificando API'}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-16">
        <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><ShieldCheck className="h-3.5 w-3.5" /> B2B Provider • Sandbox</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.98] sm:text-5xl md:text-7xl">Jogos autorais.<br /><span className="text-cyan-300">Integração própria.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">A RIPCOM é uma provedora independente de jogos digitais. A API B2B v1 entrega catálogo, sessões e launch URLs para plataformas parceiras sem expor código-fonte, banco ou credenciais internas.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs font-black uppercase tracking-wider">
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">RSA-SHA256</span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Idempotência</span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Player independente</span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">API v1</span>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[.035] p-5 shadow-2xl shadow-cyan-950/20">
            <div className="rounded-[24px] border border-cyan-300/15 bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950 p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">RIPCOM GAME 001</p><h2 className="mt-1 text-3xl font-black">Eclipse Serpent</h2></div><div className="text-5xl">🐍</div></div>
              <p className="mt-4 text-sm leading-6 text-slate-400">Primeiro slot autoral da provedora, executado pelo motor RIPCOM em modo DEMO. Sessões externas usam token temporário e ledger B2B separado do RR7.</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-black/25 p-3"><p className="text-slate-500">Game code</p><p className="mt-1 font-mono text-cyan-100">ripcom-slot:eclipse-serpent</p></div><div className="rounded-xl bg-black/25 p-3"><p className="text-slate-500">Launch</p><p className="mt-1 font-black text-emerald-200">PROVIDER_SESSION</p></div></div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            [Network, 'Operadores', 'Cada plataforma possui cadastro, chave pública RSA e catálogo próprio.'],
            [KeyRound, 'Autenticação', 'A chave privada fica somente no backend do parceiro. RIPCOM guarda a pública.'],
            [Server, 'Runtime', 'Sessões e rounds B2B são independentes do login e wallet do RR7.'],
            [Activity, 'Observabilidade', 'Requests, status HTTP, latência, sessões e rounds ficam auditáveis.'],
          ].map(([Icon, title, description]) => {
            const IconComponent = Icon as typeof Network;
            return <article key={String(title)} className="rounded-2xl border border-white/8 bg-white/[.03] p-5"><IconComponent className="h-5 w-5 text-cyan-300" /><h3 className="mt-4 font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{String(description)}</p></article>;
          })}
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-white/[.03] p-6">
            <div className="flex items-center gap-2"><Braces className="h-5 w-5 text-cyan-300" /><h2 className="text-xl font-black">API B2B v1</h2></div>
            <p className="mt-2 text-sm text-slate-500">Base pública do sandbox:</p>
            <div className="mt-3"><CodeLine>{apiBase}</CodeLine></div>
            <div className="mt-5 space-y-2 text-sm">
              {['GET /v1/health', 'GET /v1/games', 'POST /v1/sessions', 'POST /v1/games/launch', 'POST /v1/sessions/close'].map((route) => <div key={route} className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><code className="text-slate-300">{route}</code></div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[.03] p-6">
            <div className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-cyan-300" /><h2 className="text-xl font-black">Fluxo de integração</h2></div>
            <ol className="mt-5 space-y-4">
              {[
                ['01', 'Onboarding', 'A plataforma gera RSA 2048 e envia somente a chave pública à RIPCOM.'],
                ['02', 'Catálogo', 'RIPCOM habilita jogos individualmente para o operador.'],
                ['03', 'Sessão', 'O backend parceiro cria uma sessão assinada para o jogador externo.'],
                ['04', 'Launch', 'A API devolve uma URL temporária do player RIPCOM para iframe ou redirect.'],
              ].map(([number, title, text]) => <li key={number} className="grid grid-cols-[42px_1fr] gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/8 text-xs font-black text-cyan-200">{number}</div><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></li>)}
            </ol>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-amber-300/10 bg-amber-300/[.035] p-6">
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber-200">Escopo atual</p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">A RIPCOM B2B v1 está em sandbox e usa exclusivamente créditos DEMO/fun-money. Integrações financeiras de dinheiro real não estão habilitadas. Produção comercial exige camada própria de compliance, certificação, segurança operacional e requisitos aplicáveis aos mercados atendidos.</p>
        </section>
      </main>
    </div>
  );
}
