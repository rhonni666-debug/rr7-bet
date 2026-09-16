import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, Blocks, BookOpen, CheckCircle2, CircleDot, Code2, Gauge,
  Gamepad2, KeyRound, LockKeyhole, MonitorSmartphone, Network, Play, RadioTower,
  RefreshCw, Rocket, ShieldCheck, Sparkles, TerminalSquare, TimerReset, Users,
  WalletCards, XCircle,
} from 'lucide-react';
import {
  getHealth, getPlayerState, RIPCOM_API_BASE, spinPlayer,
  type RipcomPlayerState, type RipcomSpin,
} from './api';

type Page = 'home' | 'docs' | 'sandbox' | 'operator';
type GamePhase = 'idle' | 'spinning' | 'tease' | 'bonus' | 'reveal';

const ambientParticles = Array.from({ length: 22 }, (_, index) => ({
  x: `${5 + ((index * 37) % 91)}%`,
  delay: `${-((index * 0.67) % 8).toFixed(2)}s`,
  duration: `${6 + (index % 7)}s`,
  size: `${2 + (index % 4)}px`,
}));

const bonusParticles = Array.from({ length: 18 }, (_, index) => ({
  angle: `${index * 20}deg`,
  delay: `${(index % 6) * 0.08}s`,
}));

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readPage(): Page {
  const value = window.location.hash.replace('#/', '').replace('#', '');
  if (value === 'docs' || value === 'sandbox' || value === 'operator') return value;
  return 'home';
}

function navTo(page: Page) {
  window.location.hash = page === 'home' ? '/' : `/${page}`;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><div className="brand-mark">R</div><div><strong>RIPCOM</strong>{!compact && <span>Game Provider Infrastructure</span>}</div></div>;
}

function Header({ page }: { page: Page }) {
  return <header className="topbar"><div className="shell topbar-inner"><button className="brand-button" onClick={() => navTo('home')}><Brand /></button><nav className="desktop-nav"><button className={page === 'home' ? 'active' : ''} onClick={() => navTo('home')}>Provider</button><button className={page === 'docs' ? 'active' : ''} onClick={() => navTo('docs')}>API Docs</button><button className={page === 'sandbox' ? 'active' : ''} onClick={() => navTo('sandbox')}>Sandbox</button><button className={page === 'operator' ? 'active' : ''} onClick={() => navTo('operator')}>Operator</button></nav><button className="pill demo"><CircleDot size={12} /> DEMO / FUN-MONEY</button></div></header>;
}

function StatusDot({ ok, text }: { ok: boolean; text: string }) {
  return <span className={`status ${ok ? 'ok' : 'bad'}`}>{ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{text}</span>;
}

function Home({ health }: { health: string }) {
  return <>
    <section className="hero shell">
      <div className="hero-copy"><span className="eyebrow"><RadioTower size={15} /> B2B GAME PROVIDER</span><h1>Infraestrutura própria para distribuir <em>jogos autorais</em>.</h1><p>A RIPCOM nasce separada do operador. Catálogo, sessão, launch, player e segurança B2B vivem na camada da provedora. O sandbox atual opera exclusivamente com créditos DEMO.</p><div className="hero-actions"><button className="cta" onClick={() => navTo('sandbox')}>Abrir Sandbox <Play size={17} /></button><button className="ghost" onClick={() => navTo('docs')}>Ver API v1 <BookOpen size={17} /></button></div><div className="hero-metrics"><div><strong>RSA-SHA256</strong><span>Assinatura B2B</span></div><div><strong>v1</strong><span>API versionada</span></div><div><strong>100%</strong><span>DEMO atual</span></div></div></div>
      <div className="hero-console"><div className="console-head"><span></span><span></span><span></span><b>ripcom-provider</b></div><div className="console-body"><p><i>$</i> GET /v1/health</p><p className="success">200 • provider: RIPCOM</p><p><i>$</i> GET /v1/games</p><p className="success">200 • Eclipse Serpent</p><p><i>$</i> POST /v1/sessions</p><p className="success">201 • session_token issued</p><p><i>$</i> POST /v1/games/launch</p><p className="success">200 • iframe-ready</p></div><div className="console-foot"><Activity size={15} /><span>{health}</span></div></div>
    </section>

    <section className="shell section"><div className="section-heading"><span>PRIMEIRO TÍTULO</span><h2>Eclipse Serpent</h2><p>Primeiro slot autoral distribuído pela RIPCOM, com runtime DEMO, sessões isoladas e player embutível.</p></div><div className="game-showcase"><div className="game-art"><div className="moon"></div><div className="serpent">◉</div><div className="game-badge">RIPCOM ORIGINAL</div></div><div className="game-copy"><span className="pill green">LIVE IN SANDBOX</span><h3>Eclipse Serpent</h3><p>Slot 3×3 com recurso Eclipse Wild, respins e multiplicadores. O resultado é calculado no runtime da provedora, não no frontend do operador.</p><div className="feature-grid"><div><ShieldCheck /><b>Server-side</b><span>Resultado e sessão</span></div><div><MonitorSmartphone /><b>Embed-ready</b><span>Desktop + mobile</span></div><div><TimerReset /><b>Idempotente</b><span>Request IDs</span></div><div><LockKeyhole /><b>Isolado</b><span>Operador por chave</span></div></div><button className="cta small" onClick={() => navTo('sandbox')}>Testar integração <ArrowRight size={16} /></button></div></div></section>

    <section className="band"><div className="shell section"><div className="section-heading"><span>PROVIDER LAYER</span><h2>RIPCOM não depende da interface do operador.</h2></div><div className="architecture"><div className="arch-card"><Users /><b>Operator</b><span>Plataforma parceira</span></div><ArrowRight /><div className="arch-card highlight"><Network /><b>RIPCOM API</b><span>Auth + catálogo + sessão</span></div><ArrowRight /><div className="arch-card highlight"><Gamepad2 /><b>Game Runtime</b><span>Player + engine</span></div><ArrowRight /><div className="arch-card"><WalletCards /><b>Wallet</b><span>DEMO sandbox</span></div></div></div></section>

    <section className="shell section"><div className="section-heading"><span>INTEGRAÇÃO</span><h2>Uma API, vários operadores.</h2></div><div className="cards three"><article><KeyRound /><h3>Credencial individual</h3><p>Cada operador usa sua própria chave privada. A RIPCOM armazena somente a chave pública.</p></article><article><Blocks /><h3>Catálogo por contrato</h3><p>Os jogos são habilitados individualmente por operador. Sem entitlement, sem launch.</p></article><article><Gauge /><h3>Telemetria</h3><p>Requests, sessões, latência, taxa de sucesso e erros ficam separados por integração.</p></article></div></section>
  </>;
}

const endpoints = [
  ['GET', '/v1/health', 'Estado público da API'],
  ['GET', '/v1/games', 'Catálogo autorizado para o operador'],
  ['POST', '/v1/sessions', 'Cria sessão DEMO para jogador externo'],
  ['POST', '/v1/games/launch', 'Gera launch URL do player RIPCOM'],
  ['POST', '/v1/sessions/close', 'Encerra uma sessão'],
  ['POST', '/v1/wallet/*', 'Reservado para callback sandbox / futura wallet'],
] as const;

function Docs() {
  return <section className="shell section top-section"><div className="section-heading left"><span>RIPCOM B2B API</span><h1>API v1</h1><p>Contrato de integração do sandbox. O parceiro assina cada chamada autenticada com RSA-SHA256.</p></div><div className="docs-grid"><div><article className="doc-card"><h3>Base URL</h3><code>{RIPCOM_API_BASE}</code><p>O endereço é configurável no app RIPCOM. Ao migrar para domínio próprio, o operador não muda o contrato da API.</p></article><article className="doc-card"><h3>Headers autenticados</h3><pre>{`X-Ripcom-Operator: partner-code\nX-Ripcom-Timestamp: 1789560000\nX-Ripcom-Request-Id: uuid\nX-Ripcom-Signature: base64`}</pre></article><article className="doc-card"><h3>Canonical string</h3><pre>{`METHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nSHA256(BODY)`}</pre><p>A assinatura é RSA PKCS#1 v1.5 com SHA-256.</p></article></div><div><div className="endpoint-list">{endpoints.map(([method, path, detail]) => <div className="endpoint" key={path}><span className={`method ${method.toLowerCase()}`}>{method}</span><div><code>{path}</code><p>{detail}</p></div></div>)}</div><article className="doc-card warn"><ShieldCheck /><div><h3>Sandbox ≠ produção</h3><p>A v1 atual usa saldo DEMO. Nenhum endpoint desta documentação movimenta dinheiro real.</p></div></article></div></div></section>;
}

function Sandbox({ healthOk }: { healthOk: boolean }) {
  const steps = [
    ['1', 'Provisionar operador', 'Código, chave pública RSA e origens permitidas.'],
    ['2', 'Buscar catálogo', 'GET /v1/games retorna somente títulos autorizados.'],
    ['3', 'Criar sessão', 'POST /v1/sessions vincula player externo e saldo DEMO.'],
    ['4', 'Gerar launch', 'POST /v1/games/launch retorna URL embed-ready.'],
    ['5', 'Executar rounds', 'O player usa a sessão RIPCOM e liquida apenas créditos DEMO.'],
  ];
  return <section className="shell section top-section"><div className="section-heading left"><span>SANDBOX</span><h1>Integração ponta a ponta</h1><p>Ambiente de homologação para uma plataforma externa validar autenticação, launch e experiência do jogo.</p></div><div className="sandbox-status"><StatusDot ok={healthOk} text={healthOk ? 'API ONLINE' : 'API INDISPONÍVEL'} /><span>Mode: DEMO</span><span>Provider: RIPCOM</span><span>Game: Eclipse Serpent</span></div><div className="timeline">{steps.map(([n, title, detail]) => <div className="step" key={n}><div className="step-number">{n}</div><div><h3>{title}</h3><p>{detail}</p></div></div>)}</div><div className="cards two"><article><TerminalSquare /><h3>Smoke test</h3><p>O kit de integração inclui cliente Node/TypeScript para assinar requests e testar catálogo → sessão → launch.</p></article><article><MonitorSmartphone /><h3>Player isolado</h3><p>A URL de launch abre somente o branding RIPCOM e o jogo. Nenhuma navegação ou identidade do operador aparece.</p></article></div></section>;
}

function Operator({ healthOk }: { healthOk: boolean }) {
  return <section className="shell section top-section"><div className="section-heading left"><span>OPERATOR CONSOLE</span><h1>Sandbox overview</h1><p>Painel demonstrativo de uma integração B2B. Dados operacionais reais ficam protegidos no backoffice administrativo.</p></div><div className="metric-grid"><div><span>API</span><strong className="green-text">{healthOk ? 'ONLINE' : 'OFFLINE'}</strong><small>v1 sandbox</small></div><div><span>Jogos</span><strong>1</strong><small>Eclipse Serpent</small></div><div><span>Wallet</span><strong>DEMO</strong><small>Fun-money</small></div><div><span>Auth</span><strong>RSA</strong><small>SHA-256</small></div></div><div className="operator-grid"><article className="panel"><div className="panel-head"><h3>Jogos liberados</h3><span className="pill green">1 ACTIVE</span></div><div className="operator-game"><div className="mini-art">◉</div><div><b>Eclipse Serpent</b><span>ripcom-slot:eclipse-serpent</span></div><span className="status ok"><CheckCircle2 size={13} /> ACTIVE</span></div></article><article className="panel"><div className="panel-head"><h3>Integração</h3><KeyRound size={18} /></div><dl><div><dt>API version</dt><dd>v1</dd></div><div><dt>Environment</dt><dd>SANDBOX</dd></div><div><dt>Signature</dt><dd>RSA-SHA256</dd></div><div><dt>Idempotency</dt><dd>Required</dd></div><div><dt>Real money</dt><dd>Disabled</dd></div></dl></article></div><article className="panel"><div className="panel-head"><h3>Fluxo operacional</h3><Activity size={18} /></div><div className="request-table"><div className="request-row head"><span>Operation</span><span>Status</span><span>Mode</span><span>Purpose</span></div><div className="request-row"><span>games.list</span><b>READY</b><span>Signed</span><span>Catalog</span></div><div className="request-row"><span>session.create</span><b>READY</b><span>Signed</span><span>Launch</span></div><div className="request-row"><span>player.spin</span><b>READY</b><span>Token</span><span>DEMO round</span></div><div className="request-row"><span>wallet.callback</span><b className="amber">SANDBOX</b><span>Callback</span><span>Simulation only</span></div></div></article></section>;
}

function randomGrid(state: RipcomPlayerState) {
  const ids = state.config.symbols.map((symbol) => symbol.id);
  return state.config.layout.map((rows) => Array.from({ length: rows }, () => ids[Math.floor(Math.random() * ids.length)] ?? ''));
}

function randomColumn(state: RipcomPlayerState, columnIndex: number) {
  const ids = state.config.symbols.map((symbol) => symbol.id);
  const rows = state.config.layout[columnIndex] ?? 3;
  return Array.from({ length: rows }, () => ids[Math.floor(Math.random() * ids.length)] ?? '');
}

function findTeaseColumn(result: RipcomSpin, scatterId?: string) {
  if (!scatterId || result.scatterCount < 2) return null;
  const counts = result.grid.map((column) => column.filter((symbolId) => symbolId === scatterId).length);
  if (result.scatterCount === 2) {
    const emptyColumn = counts.findIndex((count) => count === 0);
    return emptyColumn >= 0 ? emptyColumn : null;
  }
  const qualifying = counts.findIndex((count) => result.scatterCount - count >= 2 && count > 0);
  return qualifying >= 0 ? qualifying : null;
}

function AmbientScene() {
  return <div className="eclipse-scene" aria-hidden="true">
    <div className="eclipse-moon-halo" />
    <div className="rune-ring" />
    <div className="fog f1" />
    <div className="fog f2" />
    <div className="ember-field">{ambientParticles.map((particle, index) => <i key={index} className="ember" style={{ '--x': particle.x, '--delay': particle.delay, '--d': particle.duration, '--s': particle.size } as React.CSSProperties & Record<string, string>} />)}</div>
  </div>;
}

function BonusTease() {
  return <div className="bonus-tease-overlay"><div className="bonus-tease-card"><strong>O ECLIPSE ESTÁ ABRINDO</strong><span>2 símbolos bônus acesos • último rolo em suspense</span></div></div>;
}

function BonusIntro({ scatterCount }: { scatterCount: number }) {
  return <div className="bonus-intro-overlay">
    <div className="bonus-particles">{bonusParticles.map((particle, index) => <i key={index} className="bonus-particle" style={{ '--pa': particle.angle, '--pd': particle.delay } as React.CSSProperties & Record<string, string>} />)}</div>
    <div className="bonus-intro-card"><div className="bonus-intro-icon"><Sparkles size={34} /></div><small>RIPCOM ORIGINAL</small><strong>ECLIPSE BONUS</strong><span>{scatterCount} símbolos bônus • energia da serpente liberada</span></div>
  </div>;
}

function Player({ token }: { token: string }) {
  const [state, setState] = useState<RipcomPlayerState | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [outcome, setOutcome] = useState<RipcomSpin | null>(null);
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [teaseColumn, setTeaseColumn] = useState<number | null>(null);
  const [bonusScatterCount, setBonusScatterCount] = useState(0);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('Booting provider runtime…');
  const symbols = useMemo(() => new Map((state?.config.symbols ?? []).map((symbol) => [symbol.id, symbol])), [state]);
  const winning = useMemo(() => new Set(outcome?.wins.map((win) => win.symbolId) ?? []), [outcome]);
  const scatterId = useMemo(() => state?.config.symbols.find((symbol) => symbol.scatter)?.id, [state]);

  useEffect(() => {
    let alive = true;
    const labels = ['Authenticating session…', 'Loading game math…', 'Syncing player state…', 'Preparing Eclipse Serpent…'];
    let i = 0;
    const timer = window.setInterval(() => { setLoadingText(labels[i % labels.length]); i += 1; }, 500);
    getPlayerState(token).then((next) => {
      if (!alive) return;
      setState(next);
      setGrid(randomGrid(next));
    }).catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : 'SESSION_LOAD_FAILED'); }).finally(() => window.clearInterval(timer));
    return () => { alive = false; window.clearInterval(timer); };
  }, [token]);

  async function spin() {
    if (!state || busy) return;
    if (bet > state.session.balance) { setError('INSUFFICIENT_DEMO_CREDITS'); return; }
    setBusy(true);
    setPhase('spinning');
    setTeaseColumn(null);
    setBonusScatterCount(0);
    setError('');
    setOutcome(null);

    const spinTimer = window.setInterval(() => setGrid(randomGrid(state)), 70);
    let teaseTimer = 0;
    try {
      const result = await spinPlayer(token, bet);
      await sleep(520);
      window.clearInterval(spinTimer);

      const decisiveColumn = findTeaseColumn(result, scatterId);
      if (decisiveColumn !== null) {
        const stagedGrid = result.grid.map((column, columnIndex) => columnIndex === decisiveColumn ? randomColumn(state, columnIndex) : column);
        setGrid(stagedGrid);
        setTeaseColumn(decisiveColumn);
        setPhase('tease');
        teaseTimer = window.setInterval(() => {
          setGrid((current) => current.map((column, columnIndex) => columnIndex === decisiveColumn ? randomColumn(state, columnIndex) : column));
        }, 88);
        await sleep(result.scatterCount >= 3 ? 1450 : 1180);
        window.clearInterval(teaseTimer);
      } else {
        await sleep(280);
      }

      setGrid(result.grid);
      setOutcome(result);
      setTeaseColumn(null);
      setState((current) => current ? { ...current, session: { ...current.session, balance: result.balance } } : current);

      if (result.scatterCount >= 3) {
        setBonusScatterCount(result.scatterCount);
        setPhase('bonus');
        await sleep(2300);
      }

      setPhase('reveal');
      await sleep(360);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SPIN_FAILED');
    } finally {
      window.clearInterval(spinTimer);
      if (teaseTimer) window.clearInterval(teaseTimer);
      setTeaseColumn(null);
      setPhase('idle');
      setBusy(false);
    }
  }

  function moveParallax(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--mx', x.toFixed(3));
    event.currentTarget.style.setProperty('--my', y.toFixed(3));
  }

  function resetParallax(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--mx', '0');
    event.currentTarget.style.setProperty('--my', '0');
  }

  if (error && !state) return <div className="player-loading"><Brand /><XCircle size={46} /><h2>Sessão indisponível</h2><p>{error}</p></div>;
  if (!state) return <div className="player-loading"><Brand /><div className="loader-orbit"><span></span></div><h2>Eclipse Serpent</h2><p>{loadingText}</p><small>RIPCOM • DEMO</small></div>;

  const theme = state.config.theme;
  return <main onPointerMove={moveParallax} onPointerLeave={resetParallax} className={`game-player phase-${phase}`} style={{ '--primary': theme.primary || '#b9ff43', '--secondary': theme.secondary || '#16a085', '--game-bg': theme.background || '#061713', '--mx': '0', '--my': '0' } as React.CSSProperties & Record<string, string>}>
    <AmbientScene />
    <div className="game-backdrop"><div className="game-orb one"></div><div className="game-orb two"></div></div>
    {phase === 'tease' && <BonusTease />}
    {phase === 'bonus' && <BonusIntro scatterCount={bonusScatterCount} />}
    <div className="game-frame"><div className="game-header"><Brand compact /><div><span className="pill green">DEMO</span><span className="balance">{state.session.balance.toLocaleString('pt-BR')} CR</span></div></div><div className="game-title"><span>RIPCOM ORIGINAL</span><h1>{state.game.name}</h1><p>ECLIPSE WILD • RESPINS • SCATTER BONUS</p></div><div className={`reels ${busy ? 'spinning' : ''}`}>{grid.map((column, columnIndex) => <div className={`reel ${phase === 'tease' && teaseColumn === columnIndex ? 'tease-target' : ''}`} key={columnIndex} style={{ '--delay': `${columnIndex * 90}ms` } as React.CSSProperties}>{column.map((symbolId, rowIndex) => { const symbol = symbols.get(symbolId); const isWinner = winning.has(symbolId); const symbolClasses = ['symbol', isWinner ? 'winner' : '', symbol?.scatter ? 'scatter' : '', symbol?.wild ? 'wild' : '', phase === 'tease' && teaseColumn === columnIndex ? 'tease-hidden' : ''].filter(Boolean).join(' '); return <div className={symbolClasses} key={`${columnIndex}-${rowIndex}`}><span>{symbol?.icon ?? '✦'}</span><small>{symbol?.wild ? 'WILD' : symbol?.scatter ? 'BONUS' : symbol?.label}</small></div>; })}</div>)}</div>{outcome && outcome.win > 0 && phase !== 'bonus' && <div className="win-banner"><span>WIN</span><strong>+{outcome.win.toLocaleString('pt-BR')} CR</strong><small>{outcome.multiplier.toFixed(2)}×</small></div>}{error && <div className="game-error">{error}</div>}<div className="game-controls"><div className="control"><small>BET</small><select value={bet} onChange={(event) => setBet(Number(event.target.value))} disabled={busy}>{[1,2,5,10,20,50,100].map((value) => <option key={value}>{value}</option>)}</select></div><button className="spin-button" disabled={busy} onClick={() => void spin()}><RefreshCw className={busy ? 'rotating' : ''} /><span>{phase === 'tease' ? 'BONUS?' : phase === 'bonus' ? 'BONUS!' : busy ? 'SPINNING' : 'SPIN'}</span></button><div className="control right"><small>SESSION</small><b>{token.slice(0, 6)}</b></div></div><div className="game-footer"><ShieldCheck size={13} /><span>RIPCOM Provider Runtime • Fun-money only</span></div></div>
  </main>;
}

export function App() {
  const params = new URLSearchParams(window.location.search);
  const playerToken = params.get('play');
  const [page, setPage] = useState<Page>(readPage());
  const [healthOk, setHealthOk] = useState(false);
  const [healthLabel, setHealthLabel] = useState('checking provider runtime…');

  useEffect(() => {
    const listener = () => setPage(readPage());
    window.addEventListener('hashchange', listener);
    getHealth().then((health) => { setHealthOk(health.status === 'ok'); setHealthLabel(`API ${health.api} • ${health.status.toUpperCase()} • ${health.mode}`); }).catch(() => { setHealthOk(false); setHealthLabel('API unavailable'); });
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  if (playerToken) return <Player token={playerToken} />;

  return <div className="portal"><Header page={page} /><main>{page === 'home' && <Home health={healthLabel} />}{page === 'docs' && <Docs />}{page === 'sandbox' && <Sandbox healthOk={healthOk} />}{page === 'operator' && <Operator healthOk={healthOk} />}</main><footer><div className="shell"><Brand compact /><p>RIPCOM Game Provider Infrastructure • Sandbox DEMO</p><span>No real-money operations enabled.</span></div></footer></div>;
}
