import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Store, Utensils, ShieldCheck, ShoppingBasket, MapPin, Filter } from "lucide-react";
import { supabase } from "../lib/supabase";

export type DemoRole = "comerciante" | "restaurante" | "admin";
type Listing = { id: string; kind: "Oferta" | "Pedido"; food: string; category: string; amount: string; maturity: string; neighborhood: string; status: string };
const profiles: { id: DemoRole; name: string; description: string; icon: typeof Store; color: string }[] = [
  { id: "comerciante", name: "Comerciante", description: "Veja publicações, propostas recebidas, negociações e encontros na rotina de um comerciante.", icon: Store, color: "#E8A33D" },
  { id: "restaurante", name: "Restaurante", description: "Explore pedidos de ingredientes, ofertas, conversas e encontros de um restaurante.", icon: Utensils, color: "#E85D4E" },
  { id: "admin", name: "Administrador", description: "Acesse uma visão demonstrativa do painel administrativo, com usuários, publicações e indicadores fictícios.", icon: ShieldCheck, color: "#9DBFB8" },
];

export function PublicExperience({ mode, onLogin, onRegister, onExit, onStartDemo }: {
  mode: "demo" | "wall"; onLogin: () => void; onRegister: () => void; onExit: () => void; onStartDemo: (role: DemoRole) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [kind, setKind] = useState("Todos");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(mode === "wall" ? "loading" : "ready");

  useEffect(() => {
    if (mode !== "wall") return;
    let active = true;
    (async () => {
      if (!supabase) { if (active) { setListings([]); setLoadState("ready"); } return; }
      const { data, error } = await supabase.rpc("public_marketplace_listings", { p_limit: 48, p_offset: 0 });
      if (!active) return;
      if (error) { console.error("Public listing query failed", error); setLoadState("error"); return; }
      setListings((data ?? []).map((row: Record<string, unknown>, index: number) => ({
        id: String(row.id ?? index), kind: row.type === "pedido" ? "Pedido" : "Oferta",
        food: String(row.food_name ?? "Alimento"), category: String(row.category_name ?? "Outros"),
        amount: String(row.quantity_band ?? "Quantidade informada"), maturity: String(row.ripeness ?? ""),
        neighborhood: String(row.region ?? "Feira de Santana"), status: "Disponível",
      })));
      setLoadState("ready");
    })();
    return () => { active = false; };
  }, [mode]);

  const filtered = useMemo(() => listings.filter(item =>
    (!query || `${item.food} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))) &&
    (category === "Todas" || item.category === category) && (kind === "Todos" || item.kind === kind)), [listings, query, category, kind]);
  const sorted = sort === "recent" ? filtered : [...filtered].sort((a, b) => a.food.localeCompare(b.food, "pt-BR"));
  const pageSize = 12, pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  return <div className="min-h-dvh bg-background text-foreground">
    <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <button className="flex items-center gap-2 text-left" onClick={onExit}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[#E8A33D]"><ShoppingBasket size={17}/></span>
          <span><span className="block text-xs font-bold">Feira Circular</span><span className="block text-[10px] text-primary-foreground/65">Centro de Abastecimento · Feira de Santana-BA</span></span>
        </button>
        <div className="flex items-center gap-2"><button onClick={onLogin} className="rounded-lg px-3 py-2 text-sm font-bold text-primary-foreground/85 hover:bg-white/10">Entrar</button><button onClick={onRegister} className="rounded-lg bg-[#E85D4E] px-3 py-2 text-sm font-bold text-white">Criar cadastro</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-5 pb-14 pt-8 md:pt-10">
      <button onClick={onExit} className="mb-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Voltar ao início"><ArrowLeft size={16}/> Voltar ao início</button>
      {mode === "demo" ? <>
        <div className="mb-7 max-w-2xl"><p className="text-xs font-bold uppercase tracking-widest text-primary">Feira Circular · Ambiente demonstrativo</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Demonstração da plataforma</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Escolha um perfil para explorar a plataforma com dados fictícios. Cada opção abre as telas e ferramentas correspondentes a esse tipo de usuário, sem autenticação e sem alterar informações reais.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{profiles.map(profile => { const Icon = profile.icon; return <button key={profile.id} onClick={() => onStartDemo(profile.id)} className="group rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"><span className="mb-5 grid h-10 w-10 place-items-center rounded-lg bg-secondary" style={{ color: profile.color }}><Icon size={21}/></span><h2 className="text-lg font-extrabold">{profile.name}</h2><p className="mt-2 min-h-[60px] text-sm leading-5 text-muted-foreground">{profile.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Entrar na demonstração <ArrowRight size={16}/></span></button>; })}</div>
      </> : <>
        <div className="mb-7"><p className="text-xs font-bold uppercase tracking-widest text-primary">Feira Circular</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Publicações da comunidade</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Ofertas e pedidos autorizados para divulgação, sem identificar os estabelecimentos.</p></div>
        {loadState === "loading" && <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Carregando publicações elegíveis…</div>}
        {loadState === "error" && <div role="alert" className="rounded-xl border border-[#E85D4E55] bg-card p-5">Não foi possível carregar as publicações agora. Tente novamente mais tarde.</div>}
        {loadState === "ready" && <>
          <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]"><label className="relative"><Search className="absolute left-3 top-3 text-muted-foreground" size={17}/><input aria-label="Pesquisar publicações" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Pesquisar produto" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3"/></label><select aria-label="Categoria" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2"><option>Todas</option>{[...new Set(listings.map(item => item.category))].map(item => <option key={item}>{item}</option>)}</select><select aria-label="Tipo de publicação" value={kind} onChange={event => { setKind(event.target.value); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2"><option>Todos</option><option>Oferta</option><option>Pedido</option></select><select aria-label="Ordenação" value={sort} onChange={event => setSort(event.target.value)} className="rounded-lg border border-border bg-card px-3 py-2"><option value="recent">Mais recentes</option><option value="name">Nome</option></select></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(item => <article key={item.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.kind === "Oferta" ? "bg-secondary text-primary" : "bg-[#FFF0D5] text-[#8A5B06]"}`}>{item.kind}</span><span className="text-xs text-muted-foreground">{item.status}</span></div><h2 className="mt-4 text-lg font-extrabold">{item.food}</h2><p className="mt-1 text-sm text-muted-foreground">{item.category}{item.maturity ? ` · ${item.maturity}` : ""}</p><div className="mt-4 flex items-end justify-between border-t border-border pt-3"><strong>{item.amount}</strong><span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13}/>{item.neighborhood}</span></div></article>)}</div>
          {visible.length === 0 && <div className="rounded-xl border border-border bg-card p-10 text-center"><Filter className="mx-auto mb-2 text-muted-foreground"/><p className="font-bold">Nenhuma publicação encontrada.</p><p className="mt-1 text-sm text-muted-foreground">Altere a busca ou os filtros.</p></div>}
          {pages > 1 && <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-3"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Anterior</button><span className="text-sm">Página {page} de {pages}</span><button disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Próxima</button></nav>}
        </>}
      </>}
    </main>
  </div>;
}
