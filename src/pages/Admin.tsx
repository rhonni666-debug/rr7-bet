import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Blocks, Gamepad2, Gift, Image, ListTree, Save, ScrollText, Users } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { AdminShell } from '../components/AdminShell';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';

type Section = 'dashboard' | 'games' | 'providers' | 'categories' | 'banners' | 'promotions' | 'users' | 'audit';
type CatalogTable = 'games' | 'providers' | 'game_categories' | 'banners' | 'promotions';
type AdminRecord = Record<string, unknown> & { id: string };
type FieldKind = 'text' | 'number' | 'checkbox' | 'select' | 'datetime' | 'textarea';
type Field = { key: string; label: string; kind?: FieldKind; required?: boolean; nullable?: boolean; options?: Array<{ value: string; label: string }> };
type ResourceConfig = { table: CatalogTable; title: string; description: string; fields: Field[]; defaults: Record<string, unknown>; orderBy: string };

export function AdminPage({ section }: { section: Section }) {
  return <AdminGate><AdminShell><AdminContent section={section} /></AdminShell></AdminGate>;
}

function AdminContent({ section }: { section: Section }) {
  const refs = useQuery({
    queryKey: ['admin', 'refs'],
    queryFn: async () => {
      const [providers, categories] = await Promise.all([
        supabase.from('providers').select('id,name').order('name'),
        supabase.from('game_categories').select('id,name').order('name'),
      ]);
      if (providers.error) throw providers.error;
      if (categories.error) throw categories.error;
      return { providers: providers.data ?? [], categories: categories.data ?? [] };
    },
  });

  const config = useMemo<ResourceConfig | null>(() => {
    const providerOptions = (refs.data?.providers ?? []).map((row) => ({ value: row.id, label: row.name }));
    const categoryOptions = (refs.data?.categories ?? []).map((row) => ({ value: row.id, label: row.name }));

    if (section === 'providers') return {
      table: 'providers', title: 'Provedores', description: 'Gerencie coleções e futuros adapters B2B.', orderBy: 'sort_order',
      defaults: { name: '', slug: '', short_name: '', accent: 'from-amber-400 to-yellow-600', status: 'ACTIVE', provider_type: 'MOCK', sort_order: 0 },
      fields: [
        { key: 'name', label: 'Nome', required: true }, { key: 'slug', label: 'Slug', required: true }, { key: 'short_name', label: 'Sigla', required: true },
        { key: 'accent', label: 'Gradiente Tailwind', required: true },
        { key: 'status', label: 'Status', kind: 'select', options: ['ACTIVE','INACTIVE','MAINTENANCE'].map((value) => ({ value, label: value })) },
        { key: 'provider_type', label: 'Tipo', kind: 'select', options: ['MOCK','REAL','AGGREGATOR'].map((value) => ({ value, label: value })) },
        { key: 'sort_order', label: 'Ordem', kind: 'number' },
      ],
    };
    if (section === 'categories') return {
      table: 'game_categories', title: 'Categorias', description: 'Organize a navegação do lobby.', orderBy: 'sort_order',
      defaults: { name: '', slug: '', icon: '✦', sort_order: 0, active: true },
      fields: [
        { key: 'name', label: 'Nome', required: true }, { key: 'slug', label: 'Slug', required: true }, { key: 'icon', label: 'Ícone/emoji', required: true },
        { key: 'sort_order', label: 'Ordem', kind: 'number' }, { key: 'active', label: 'Ativa', kind: 'checkbox' },
      ],
    };
    if (section === 'games') return {
      table: 'games', title: 'Jogos', description: 'Cadastre e configure títulos demonstrativos.', orderBy: 'sort_order',
      defaults: { name: '', slug: '', provider_id: providerOptions[0]?.value ?? '', category_id: categoryOptions[0]?.value ?? '', art: '🎮', accent: 'from-slate-700 to-slate-900', status: 'ACTIVE', featured: false, popular: false, new_game: false, is_demo: true, launch_type: 'MOCK', thumbnail_url: null, banner_url: null, description: null, sort_order: 0 },
      fields: [
        { key: 'name', label: 'Nome', required: true }, { key: 'slug', label: 'Slug', required: true },
        { key: 'provider_id', label: 'Provedor', kind: 'select', required: true, options: providerOptions }, { key: 'category_id', label: 'Categoria', kind: 'select', required: true, options: categoryOptions },
        { key: 'art', label: 'Emoji/arte', required: true }, { key: 'accent', label: 'Gradiente Tailwind', required: true },
        { key: 'thumbnail_url', label: 'Thumbnail URL', nullable: true }, { key: 'banner_url', label: 'Banner URL', nullable: true },
        { key: 'description', label: 'Descrição', kind: 'textarea', nullable: true },
        { key: 'status', label: 'Status', kind: 'select', options: ['ACTIVE','INACTIVE','MAINTENANCE'].map((value) => ({ value, label: value })) },
        { key: 'launch_type', label: 'Launch type', kind: 'select', options: ['MOCK','IFRAME','REDIRECT','PROVIDER_SESSION'].map((value) => ({ value, label: value })) },
        { key: 'featured', label: 'Destaque', kind: 'checkbox' }, { key: 'popular', label: 'Popular', kind: 'checkbox' }, { key: 'new_game', label: 'Novo', kind: 'checkbox' }, { key: 'is_demo', label: 'DEMO', kind: 'checkbox' },
        { key: 'sort_order', label: 'Ordem', kind: 'number' },
      ],
    };
    if (section === 'banners') return {
      table: 'banners', title: 'Banners', description: 'Controle o hero e campanhas visuais.', orderBy: 'sort_order',
      defaults: { title: '', subtitle: null, image_url: null, mobile_image_url: null, cta_label: null, cta_target: null, position: 'HOME_HERO', active: true, start_at: null, end_at: null, sort_order: 0 },
      fields: [
        { key: 'title', label: 'Título', required: true }, { key: 'subtitle', label: 'Subtítulo', kind: 'textarea', nullable: true },
        { key: 'image_url', label: 'Imagem desktop', nullable: true }, { key: 'mobile_image_url', label: 'Imagem mobile', nullable: true },
        { key: 'cta_label', label: 'CTA', nullable: true }, { key: 'cta_target', label: 'Destino CTA', nullable: true }, { key: 'position', label: 'Posição', required: true },
        { key: 'active', label: 'Ativo', kind: 'checkbox' }, { key: 'start_at', label: 'Início', kind: 'datetime', nullable: true }, { key: 'end_at', label: 'Fim', kind: 'datetime', nullable: true }, { key: 'sort_order', label: 'Ordem', kind: 'number' },
      ],
    };
    if (section === 'promotions') return {
      table: 'promotions', title: 'Promoções', description: 'Gerencie campanhas demonstrativas e agendamento.', orderBy: 'created_at',
      defaults: { title: '', description: null, image_url: null, type: 'DEMO', active: true, start_at: null, end_at: null },
      fields: [
        { key: 'title', label: 'Título', required: true }, { key: 'description', label: 'Descrição', kind: 'textarea', nullable: true }, { key: 'image_url', label: 'Imagem URL', nullable: true },
        { key: 'type', label: 'Tipo', required: true }, { key: 'active', label: 'Ativa', kind: 'checkbox' }, { key: 'start_at', label: 'Início', kind: 'datetime', nullable: true }, { key: 'end_at', label: 'Fim', kind: 'datetime', nullable: true },
      ],
    };
    return null;
  }, [refs.data, section]);

  if (section === 'dashboard') return <DashboardSection />;
  if (section === 'users') return <UsersSection />;
  if (section === 'audit') return <AuditSection />;
  if (!config) return null;
  return <ResourceManager config={config} />;
}

function DashboardSection() {
  const stats = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [profiles, games, providers, promotions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('games').select('id', { count: 'exact', head: true }),
        supabase.from('providers').select('id', { count: 'exact', head: true }),
        supabase.from('promotions').select('id', { count: 'exact', head: true }),
      ]);
      for (const result of [profiles, games, providers, promotions]) if (result.error) throw result.error;
      return { users: profiles.count ?? 0, games: games.count ?? 0, providers: providers.count ?? 0, promotions: promotions.count ?? 0 };
    },
  });
  const values = stats.data ?? { users: 0, games: 0, providers: 0, promotions: 0 };
  return <div className="space-y-6"><PageHeader title="Visão geral" description="Operação demonstrativa RR7.BET com dados reais do Supabase." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={<Users />} label="Usuários" value={values.users} /><Stat icon={<Gamepad2 />} label="Jogos" value={values.games} /><Stat icon={<Blocks />} label="Provedores" value={values.providers} /><Stat icon={<Gift />} label="Promoções" value={values.promotions} /></div><div className="rounded-3xl border border-emerald-300/15 bg-emerald-300/5 p-5"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-emerald-300" /><div><p className="font-black">Painel conectado</p><p className="mt-1 text-sm text-slate-400">Alterações no catálogo são persistidas no PostgreSQL, protegidas por RLS e registradas na auditoria.</p></div></div></div></div>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-5"><div className="text-amber-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</div><p className="mt-5 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p></div>;
}

function ResourceManager({ config }: { config: ResourceConfig }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>(config.defaults);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useQuery({
    queryKey: ['admin', 'resource', config.table],
    queryFn: async () => {
      const { data, error } = await supabase.from(config.table).select('*').order(config.orderBy, { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminRecord[];
    },
  });

  function beginNew() {
    setEditingId(null);
    setDraft({ ...config.defaults });
    setMessage('');
  }

  function beginEdit(row: AdminRecord) {
    const next: Record<string, unknown> = {};
    for (const field of config.fields) {
      const value = row[field.key];
      next[field.key] = field.kind === 'datetime' && typeof value === 'string' ? value.slice(0, 16) : value;
    }
    setEditingId(row.id);
    setDraft(next);
    setMessage('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      let value = draft[field.key];
      if (field.kind === 'number') value = value === '' || value == null ? 0 : Number(value);
      if (field.kind === 'datetime') value = value ? new Date(String(value)).toISOString() : null;
      if (field.nullable && value === '') value = null;
      payload[field.key] = value;
    }
    if ('slug' in payload && !payload.slug && typeof payload.name === 'string') payload.slug = slugify(payload.name);

    const result = editingId
      ? await supabase.from(config.table).update(payload).eq('id', editingId)
      : await supabase.from(config.table).insert(payload);
    setBusy(false);
    if (result.error) {
      setMessage(`Erro: ${result.error.message}`);
      return;
    }
    setMessage(editingId ? 'Alterações salvas.' : 'Registro criado.');
    setEditingId(null);
    setDraft({ ...config.defaults });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
    ]);
  }

  return <div className="space-y-6"><PageHeader title={config.title} description={config.description} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><section className="overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]"><div className="flex items-center justify-between border-b border-white/8 p-4"><p className="text-sm font-black">{rows.data?.length ?? 0} registros</p><button onClick={beginNew} className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-slate-950">+ Novo</button></div>{rows.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando...</p> : rows.isError ? <p className="p-5 text-sm text-rose-300">Falha ao carregar.</p> : <div className="divide-y divide-white/6">{(rows.data ?? []).map((row) => <button key={row.id} onClick={() => beginEdit(row)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-white/[.035]"><div className="min-w-0"><p className="truncate text-sm font-black">{String(row.name ?? row.title ?? row.id)}</p><p className="mt-1 truncate text-xs text-slate-500">{String(row.slug ?? row.type ?? row.status ?? row.id)}</p></div><StatusBadge row={row} /></button>)}</div>}</section><form onSubmit={(event) => void save(event)} className="h-fit rounded-3xl border border-white/8 bg-white/[.035] p-5 xl:sticky xl:top-20"><h2 className="text-lg font-black">{editingId ? 'Editar registro' : 'Novo registro'}</h2><div className="mt-4 space-y-3">{config.fields.map((field) => <AdminField key={field.key} field={field} value={draft[field.key]} onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))} />)}</div>{message && <p className={`mt-4 rounded-xl px-3 py-2 text-xs ${message.startsWith('Erro') ? 'bg-rose-400/10 text-rose-200' : 'bg-emerald-400/10 text-emerald-200'}`}>{message}</p>}<button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"><Save className="h-4 w-4" />{busy ? 'Salvando...' : 'Salvar'}</button></form></div></div>;
}

function AdminField({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  if (field.kind === 'checkbox') return <label className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-3 py-3 text-sm font-bold"><span>{field.label}</span><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-amber-300" /></label>;
  if (field.kind === 'select') return <label className="block"><span className="text-xs font-bold text-slate-400">{field.label}</span><select required={field.required} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b2630] px-3 py-2.5 text-sm outline-none focus:border-amber-300/50"><option value="">Selecione</option>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  if (field.kind === 'textarea') return <label className="block"><span className="text-xs font-bold text-slate-400">{field.label}</span><textarea required={field.required} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50" /></label>;
  const type = field.kind === 'number' ? 'number' : field.kind === 'datetime' ? 'datetime-local' : 'text';
  return <label className="block"><span className="text-xs font-bold text-slate-400">{field.label}</span><input type={type} required={field.required} value={value == null ? '' : String(value)} onChange={(event) => onChange(field.kind === 'number' ? event.target.value : event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm outline-none focus:border-amber-300/50" /></label>;
}

function StatusBadge({ row }: { row: AdminRecord }) {
  const active = row.active;
  const status = typeof row.status === 'string' ? row.status : active === false ? 'INATIVO' : active === true ? 'ATIVO' : 'EDITAR';
  const positive = status === 'ACTIVE' || status === 'ATIVO';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${positive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>{status}</span>;
}

function UsersSection() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,display_name,avatar_url,role,created_at,updated_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function changeRole(id: string, role: string) {
    if (id === user?.id) {
      setMessage('Para evitar bloqueio acidental, seu próprio papel não pode ser alterado por esta tela.');
      return;
    }
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    setMessage(error ? `Erro: ${error.message}` : 'Papel atualizado.');
    await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    await refreshProfile();
  }

  return <div className="space-y-6"><PageHeader title="Usuários" description="Papéis e contas do laboratório. A elevação de privilégio é protegida no banco." />{message && <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300">{message}</p>}<div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]">{users.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando...</p> : (users.data ?? []).map((profile) => <div key={profile.id} className="grid gap-3 border-b border-white/6 p-4 last:border-b-0 sm:grid-cols-[1fr_180px] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-black">{profile.display_name || 'Jogador'}</p><p className="mt-1 truncate text-xs text-slate-500">{profile.id}</p></div><select value={profile.role} disabled={profile.id === user?.id} onChange={(event) => void changeRole(profile.id, event.target.value)} className="rounded-xl border border-white/10 bg-[#0b2630] px-3 py-2 text-sm font-bold disabled:opacity-50">{['PLAYER','ADMIN','SUPPORT','MANAGER','AFFILIATE'].map((role) => <option key={role}>{role}</option>)}</select></div>)}</div></div>;
}

function AuditSection() {
  const audit = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('id,user_id,actor_role,action,resource_type,resource_id,metadata,created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  return <div className="space-y-6"><PageHeader title="Auditoria" description="Últimas mutações administrativas registradas automaticamente pelo PostgreSQL." /><div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]">{audit.isLoading ? <p className="p-5 text-sm text-slate-500">Carregando...</p> : audit.data?.length ? audit.data.map((row) => <div key={row.id} className="border-b border-white/6 p-4 last:border-b-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-300">{row.action}</span><span className="text-xs font-bold text-slate-300">{row.resource_type}</span><span className="text-xs text-slate-600">{new Date(row.created_at).toLocaleString('pt-BR')}</span></div><p className="mt-2 break-all text-xs text-slate-500">Recurso: {row.resource_id ?? '—'} • Ator: {row.user_id ?? 'sistema'}</p></div>) : <p className="p-6 text-sm text-slate-500">Nenhum evento administrativo registrado ainda.</p>}</div></div>;
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return <header><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Painel administrativo</p><h1 className="mt-1 text-3xl font-black">{title}</h1><p className="mt-2 text-sm text-slate-400">{description}</p></header>;
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
