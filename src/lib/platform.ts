import { supabase } from "./supabase";

export type Unidade = "g" | "kg";
export type TipoDocumento = "cpf" | "cnpj";
export type Maturacao = "verde" | "meio-maduro" | "maduro" | "muito-maduro";
export type StatusTroca =
  | "proposto" | "contraproposto" | "aceito"
  | "encontro-agendado" | "concluido"
  | "cancelado" | "nao-compareceu" | "divergencia";
export type TipoListagem = "oferta" | "pedido";
export type StatusListagem = "ativa" | "em-negociacao" | "concluida" | "cancelada";
export type StatusUsuario = "pendente" | "aprovado" | "rejeitado" | "bloqueado";

export interface ConfirmacaoEncontro {
  usuarioId: string;
  resposta: "aconteceu" | "nao-aconteceu";
  pesoG?: number;
  criadaEm: string;
}

export interface Encontro {
  id: string;
  propostaId: string;
  data: string;
  horario: string;
  local: string;
  criadoEm: string;
  alteracoes: Array<{ campo: string; de: string; para: string; em: string }>;
}

export interface Usuario {
  id: string; nome: string; tipo: "restaurante" | "comerciante" | "admin";
  cnpjCpf: string; documentoTipo?: TipoDocumento; endereco: string; whatsapp: string; responsavel: string;
  email: string; senha?: string; alimentosInteresse: string[]; horario: string;
  fotoUrl?: string;
  status: StatusUsuario; criadoEm: string; ultimaAtividade?: string;
  motivoRejeicao?: string; motivoBloqueio?: string;
}

export interface Listagem {
  id: string; tipo: TipoListagem; usuarioId: string; alimento: string;
  quantidadeG: number; maturacao: Maturacao; prazo: string;
  observacao: string | null; fotoUrl: string | null;
  status: StatusListagem; criadoEm: string;
}

export interface PropostaLado {
  alimento: string; quantidadeG: number; maturacao: Maturacao; observacao: string | null;
}

export interface Proposta {
  id: string; listagemId: string; propostaPaiId: string | null;
  versao: number; status: StatusTroca; criadoEm: string;
  proponenteId: string; oferecem: PropostaLado; querem: PropostaLado;
  confirmacoes: ConfirmacaoEncontro[];
}

export interface Mensagem {
  id: string;
  rootPropostaId: string;
  autorId: string;
  tipo: "texto" | "sistema";
  texto: string;
  criadaEm: string;
  lida: boolean;
}

export interface OcorrenciaPos {
  id: string;
  propostaId: string;
  listagemId: string;
  usuarioId: string;
  tipo: "qualidade" | "quantidade" | "diferente-anunciado" | "outro";
  descricao: string;
  criadoEm: string;
  status: "aberta" | "em-analise" | "resolvida";
}

export interface CategoriaAlimento { id: string; nome: string; ativa: boolean; }
export interface AlimentoBD { id: string; nome: string; categoriaId: string; ativo: boolean; imagemUrl?: string; }

export interface Notificacao {
  id: string; usuarioId: string; mensagem: string;
  lida: boolean; criadaEm: string; listagemId?: string; propostaId?: string;
}

export interface PlatformState {
  usuarios: Usuario[];
  listagens: Listagem[];
  propostas: Proposta[];
  encontros: Encontro[];
  mensagens: Mensagem[];
  notificacoes: Notificacao[];
  ocorrencias: OcorrenciaPos[];
  categorias: CategoriaAlimento[];
  alimentosBD: AlimentoBD[];
}

function mapLado(raw: unknown): PropostaLado {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    alimento: String(o.alimento ?? o.food_id ?? ""),
    quantidadeG: Number(o.quantidadeG ?? o.quantity_g ?? 0),
    maturacao: (o.maturacao ?? o.ripeness ?? "maduro") as Maturacao,
    observacao: (o.observacao ?? o.observation ?? null) as string | null,
  };
}

function mapUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: String(row.id),
    nome: String(row.name ?? ""),
    tipo: row.type as Usuario["tipo"],
    documentoTipo: (row.document_type as TipoDocumento) ?? "cnpj",
    cnpjCpf: String(row.document ?? ""),
    email: String(row.email ?? ""),
    endereco: String(row.address ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    responsavel: String(row.responsible ?? ""),
    alimentosInteresse: Array.isArray(row.interests) ? row.interests as string[] : [],
    horario: String(row.opening_hours ?? ""),
    fotoUrl: (row.avatar_url as string) || undefined,
    status: (row.status as StatusUsuario) ?? "pendente",
    criadoEm: String(row.created_at ?? ""),
    ultimaAtividade: row.last_activity ? String(row.last_activity) : undefined,
    motivoRejeicao: row.rejection_reason ? String(row.rejection_reason) : undefined,
    motivoBloqueio: row.block_reason ? String(row.block_reason) : undefined,
  };
}

export async function fetchCatalog(): Promise<{ categorias: CategoriaAlimento[]; alimentosBD: AlimentoBD[] }> {
  if (!supabase) return { categorias: [], alimentosBD: [] };
  const [{ data: cats }, { data: foods }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("foods").select("*").order("name"),
  ]);
  return {
    categorias: (cats ?? []).map((c: Record<string, unknown>) => ({
      id: String(c.id), nome: String(c.name), ativa: Boolean(c.active),
    })),
    alimentosBD: (foods ?? []).map((a: Record<string, unknown>) => ({
      id: String(a.id),
      nome: String(a.name),
      categoriaId: String(a.category_id),
      ativo: Boolean(a.active),
      imagemUrl: a.image_url ? String(a.image_url) : undefined,
    })),
  };
}

export async function fetchProfileById(id: string): Promise<Usuario | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapUsuario(data as Record<string, unknown>);
}

export async function fetchPlatformState(): Promise<PlatformState> {
  const empty: PlatformState = {
    usuarios: [], listagens: [], propostas: [], encontros: [],
    mensagens: [], notificacoes: [], ocorrencias: [], categorias: [], alimentosBD: [],
  };
  if (!supabase) return empty;

  const catalog = await fetchCatalog();
  const [
    { data: profiles },
    { data: listings },
    { data: proposals },
    { data: meetings },
    { data: messages },
    { data: notifications },
    { data: incidents },
    { data: confirmations },
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("listings").select("*"),
    supabase.from("proposals").select("*"),
    supabase.from("meetings").select("*"),
    supabase.from("messages").select("*"),
    supabase.from("notifications").select("*"),
    supabase.from("incidents").select("*"),
    supabase.from("meeting_confirmations").select("*"),
  ]);

  const confs = (confirmations ?? []) as Array<Record<string, unknown>>;

  return {
    ...catalog,
    usuarios: (profiles ?? []).map((p: Record<string, unknown>) => mapUsuario(p)),
    listagens: (listings ?? []).map((l: Record<string, unknown>) => ({
      id: String(l.id),
      tipo: l.type as TipoListagem,
      usuarioId: String(l.owner_id),
      alimento: String(l.food_id),
      quantidadeG: Number(l.quantity_g),
      maturacao: l.ripeness as Maturacao,
      prazo: String(l.deadline).slice(0, 10),
      observacao: (l.observation as string) ?? null,
      fotoUrl: (l.photo_url as string) ?? null,
      status: l.status as StatusListagem,
      criadoEm: String(l.created_at),
    })),
    propostas: (proposals ?? []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      listagemId: String(p.listing_id),
      propostaPaiId: p.parent_id ? String(p.parent_id) : null,
      versao: Number(p.version ?? 1),
      status: p.status as StatusTroca,
      criadoEm: String(p.created_at),
      proponenteId: String(p.proposer_id),
      oferecem: mapLado(p.offered),
      querem: mapLado(p.requested),
      confirmacoes: confs.filter(c => String(c.proposal_id) === String(p.id)).map(c => ({
        usuarioId: String(c.user_id),
        resposta: c.response as ConfirmacaoEncontro["resposta"],
        pesoG: c.weight_g != null ? Number(c.weight_g) : undefined,
        criadaEm: String(c.created_at),
      })),
    })),
    encontros: (meetings ?? []).map((e: Record<string, unknown>) => ({
      id: String(e.id),
      propostaId: String(e.proposal_id),
      data: String(e.meeting_date).slice(0, 10),
      horario: String(e.meeting_time).slice(0, 5),
      local: String(e.location),
      criadoEm: String(e.created_at),
      alteracoes: Array.isArray(e.changes) ? e.changes as Encontro["alteracoes"] : [],
    })),
    mensagens: (messages ?? []).map((m: Record<string, unknown>) => ({
      id: String(m.id),
      rootPropostaId: String(m.proposal_id),
      autorId: m.author_id ? String(m.author_id) : "sistema",
      tipo: (m.kind as Mensagem["tipo"]) ?? "texto",
      texto: String(m.content),
      criadaEm: String(m.created_at),
      lida: Boolean(m.read_at),
    })),
    notificacoes: (notifications ?? []).map((n: Record<string, unknown>) => ({
      id: String(n.id),
      usuarioId: String(n.user_id),
      mensagem: String(n.message),
      lida: Boolean(n.read_at),
      criadaEm: String(n.created_at),
      listagemId: n.listing_id ? String(n.listing_id) : undefined,
      propostaId: n.proposal_id ? String(n.proposal_id) : undefined,
    })),
    ocorrencias: (incidents ?? []).map((o: Record<string, unknown>) => ({
      id: String(o.id),
      propostaId: String(o.proposal_id),
      listagemId: String(o.listing_id),
      usuarioId: String(o.reporter_id),
      tipo: o.type as OcorrenciaPos["tipo"],
      descricao: String(o.description),
      criadoEm: String(o.created_at),
      status: o.status as OcorrenciaPos["status"],
    })),
  };
}
