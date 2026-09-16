import { ArrowLeft, CircleDot, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { OriginalSlotMachine } from '../components/OriginalSlotMachine';
import { useDemo } from '../lib/demo-store';
import { useAuth } from '../lib/auth';
import { useCatalog } from '../lib/catalog';
import { roundErrorMessage } from '../lib/game-errors';
import { GameLauncher } from '../lib/game-launcher';
import { Hub88PublicDemo } from '../lib/hub88-public-demo';
import type { GameSession } from '../types';

const bets = [1, 2, 5, 10, 20, 50, 100];

export function GamePage() {
  const { slug } = useParams({ from: '/jogo/$slug' });
  const catalog = useCatalog();
  const game = (catalog.data?.games ?? []).find((item) => item.slug === slug);
  const provider = (catalog.data?.providers ?? []).find((item) => item.id === game?.providerId);
  const { balance, refresh } = useDemo();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [result, setResult] = useState('Escolha um valor e rode a demonstração.');
  const [externalBusy, setExternalBusy] = useState(false);
  const [externalLaunchUrl, setExternalLaunchUrl] = useState('');
  const [externalError, setExternalError] = useState('');
  const isHub88Demo = game?.launchType === 'HUB88_DEMO' && provider?.providerType === 'HUB88';

  useEffect(() => {
    if (!user || !game || !provider || isHub88Demo) {
      setSession(null);
      if (isHub88Demo) {
        setSessionError('');
        setExternalLaunchUrl('');
        setExternalError('');
      }
      return;
    }

    let cancelled = false;
    let created: GameSession | null = null;
    setSessionError('');

    void GameLauncher.createSession(game, provider)
      .then((next) => {
        created = next;
        if (!cancelled) setSession(next);
        else void GameLauncher.closeSession(provider, next.id).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setSessionError(`Não foi possível iniciar a sessão DEMO pela ${provider.name}.`);
      });

    return () => {
      cancelled = true;
      if (created) void GameLauncher.closeSession(provider, created.id).catch(() => undefined);
    };
  }, [game?.id, provider?.id, user?.id, isHub88Demo]);

  if (catalog.isLoading) return <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-400">Carregando jogo...</div>;
  if (!game) return <div className="rounded-2xl border border-white/10 p-8 text-center"><p>Jogo demo não encontrado.</p><Link to="/" className="mt-4 inline-flex text-amber-300">Voltar ao lobby</Link></div>;

  const selectedGame = game;
  const isOriginalSlot = selectedGame.externalGameId?.startsWith('rr7-slot:') || selectedGame.externalGameId?.startsWith('ripcom-slot:') || false;

  if (isOriginalSlot && provider) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        {sessionError && <p className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{sessionError}</p>}
        <OriginalSlotMachine game={selectedGame} provider={provider} session={session} />
      </div>
    );
  }

  async function launchHub88Demo() {
    if (!user) {
      void navigate({ to: '/auth' });
      return;
    }
    if (!provider || !isHub88Demo) return;

    setExternalBusy(true);
    setExternalError('');
    try {
      const deviceType = window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
      const launch = await Hub88PublicDemo.launch(selectedGame.id, deviceType);
      setExternalLaunchUrl(launch.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao iniciar o jogo DEMO.';
      if (message.includes('HUB88_DISABLED')) {
        setExternalError('A conexão Hub88 está instalada, mas o staging ainda não foi habilitado com as credenciais oficiais.');
      } else {
        setExternalError('Não foi possível obter a URL DEMO do agregador agora.');
      }
    } finally {
      setExternalBusy(false);
    }
  }

  async function runDemo() {
    if (!user) {
      void navigate({ to: '/auth' });
      return;
    }
    if (!provider || !session) {
      setResult('A sessão DEMO ainda não está pronta.');
      return;
    }

    setBusy(true);
    try {
      const outcome = await GameLauncher.playRound(provider, session.id, bet);
      await refresh();
      setResult(outcome.win > 0
        ? `${selectedGame.name}: ${outcome.result} • ${outcome.multiplier}x • +${outcome.win.toLocaleString('pt-BR')} créditos DEMO.`
        : `${selectedGame.name}: rodada DEMO sem prêmio.`);
    } catch (error) {
      setResult(roundErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (isHub88Demo) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <section className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${selectedGame.accent} p-6 shadow-2xl shadow-black/30 md:p-8`} style={selectedGame.bannerUrl ? { backgroundImage: `linear-gradient(to top,rgba(0,0,0,.82),rgba(0,0,0,.18)),url(${selectedGame.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,.25),transparent_25%),linear-gradient(to_top,rgba(0,0,0,.78),transparent_60%)]" />
          <div className="relative z-10 flex min-h-72 flex-col justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90">{provider?.name ?? 'Hub88'}</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">Original • DEMO</span>
            </div>
            {!selectedGame.bannerUrl && <div className="grid place-items-center text-8xl drop-shadow-2xl">{selectedGame.art}</div>}
            <div><h1 className="text-3xl font-black">{selectedGame.name}</h1><p className="mt-1 text-sm text-white/70">{selectedGame.description ?? 'Conteúdo original lançado por integração B2B em modo DEMO/fun-money.'}</p></div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.035] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Integração</p>
              <p className="mt-1 text-sm font-black text-cyan-200">Hub88 B2B • somente DEMO</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> sem dinheiro real</span>
          </div>

          {externalError && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{externalError}</p>}

          {!externalLaunchUrl ? (
            <button disabled={externalBusy} onClick={() => void launchHub88Demo()} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/10 transition hover:brightness-105 disabled:opacity-60">
              {externalBusy ? 'Solicitando URL DEMO...' : !user ? 'Entrar para abrir DEMO' : 'Abrir jogo original em DEMO'}
            </button>
          ) : (
            <>
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black">
                <iframe
                  src={externalLaunchUrl}
                  title={`${selectedGame.name} — DEMO`}
                  className="h-[70vh] min-h-[560px] w-full bg-black"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Se o provedor bloquear iframe, abra a mesma sessão DEMO em uma nova aba.</p>
                <a href={externalLaunchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10"><ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba</a>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <section className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${selectedGame.accent} p-6 shadow-2xl shadow-black/30 md:p-8`} style={selectedGame.bannerUrl ? { backgroundImage: `linear-gradient(to top,rgba(0,0,0,.82),rgba(0,0,0,.18)),url(${selectedGame.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,.25),transparent_25%),linear-gradient(to_top,rgba(0,0,0,.78),transparent_60%)]" />
        <div className="relative z-10 flex min-h-72 flex-col justify-between">
          <div><span className="rounded-full bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90">{provider?.name ?? 'RR7 Demo'}</span></div>
          {!selectedGame.bannerUrl && <div className="grid place-items-center text-8xl drop-shadow-2xl">{selectedGame.art}</div>}
          <div><h1 className="text-3xl font-black">{selectedGame.name}</h1><p className="mt-1 text-sm text-white/70">{selectedGame.description ?? 'Sessão persistida no Supabase • sem dinheiro real'}</p></div>
        </div>
      </section>
      <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.035] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Seu saldo</p><p className="mt-1 text-xl font-black text-amber-300">{user ? balance.toLocaleString('pt-BR') : '—'} créditos</p></div>
          <div className="flex items-center gap-3"><span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> DEMO</span>{user && <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${session ? 'text-cyan-300' : 'text-slate-500'}`}><CircleDot className="h-3.5 w-3.5" /> {session ? `${provider?.shortName ?? 'Gateway'} ativo` : 'Abrindo sessão'}</span>}</div>
        </div>
        {sessionError && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{sessionError}</p>}
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Valor da rodada</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{bets.map((value) => <button key={value} onClick={() => setBet(value)} className={`rounded-xl border py-2.5 text-sm font-black transition ${bet === value ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-white/10 bg-white/5 text-slate-300'}`}>{value}</button>)}</div>
        <button disabled={busy || Boolean(user && !session)} onClick={() => void runDemo()} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/10 transition hover:brightness-105 disabled:opacity-60">{busy ? 'Processando...' : !user ? 'Entrar para jogar DEMO' : session ? 'Rodar demonstração' : 'Preparando sessão...'}</button>
        <p className="mt-4 rounded-xl bg-black/20 px-4 py-3 text-center text-sm text-slate-300">{result}</p>
        {session && <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-slate-600">Sessão {session.id.slice(0, 8)} • {provider?.name ?? 'Provider Gateway'} • {provider?.providerType ?? 'DEMO'}</p>}
      </section>
    </div>
  );
}
