import { useState, useRef, useEffect } from "react";
import type React from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import {
  Leaf, Package, Bell, Plus, Home, MessageSquare,
  ChevronRight, ChevronLeft, ArrowLeft, Check, Clock,
  MapPin, User, Shield, Send,
  CheckCircle2, Timer, Camera, X, Eye,
  Info, RefreshCw, AlertCircle, ClipboardList,
  Ban, Trash2, Users, Activity, ShoppingBasket,
  AlertTriangle, ThumbsUp, ThumbsDown,
  Pencil, CalendarCheck, Flag, UtensilsCrossed,
} from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../lib/supabase";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Unidade = "g" | "kg";
type TipoDocumento = "cpf" | "cnpj";
type Maturacao = "verde" | "meio-maduro" | "maduro" | "muito-maduro";
type StatusTroca =
  | "proposto" | "contraproposto" | "aceito"
  | "encontro-agendado" | "concluido"
  | "cancelado" | "nao-compareceu" | "divergencia";
type TipoListagem = "oferta" | "pedido";
type StatusListagem = "ativa" | "em-negociacao" | "concluida" | "cancelada";
type StatusUsuario = "pendente" | "aprovado" | "rejeitado" | "bloqueado";
type AdminTab = "visao-geral" | "usuarios" | "publicacoes" | "trocas" | "ocorrencias" | "alimentos";
type View =
  | "landing" | "login" | "registro" | "dashboard"
  | "listagens" | "detalhes" | "nova-listagem"
  | "minhas-trocas" | "admin" | "perfil" | "chat";

interface ConfirmacaoEncontro {
  usuarioId: string;
  resposta: "aconteceu" | "nao-aconteceu";
  pesoG?: number;
  criadaEm: string;
}

interface Encontro {
  id: string;
  propostaId: string;
  data: string;
  horario: string;
  local: string;
  criadoEm: string;
  alteracoes: Array<{ campo: string; de: string; para: string; em: string }>;
}

interface Usuario {
  id: string; nome: string; tipo: "restaurante" | "comerciante" | "admin";
  cnpjCpf: string; documentoTipo?: TipoDocumento; endereco: string; whatsapp: string; responsavel: string;
  email: string; senha?: string; alimentosInteresse: string[]; horario: string;
  fotoUrl?: string;
  status: StatusUsuario; criadoEm: string; ultimaAtividade?: string;
  motivoRejeicao?: string; motivoBloqueio?: string;
}

interface Listagem {
  id: string; tipo: TipoListagem; usuarioId: string; alimento: string;
  quantidadeG: number; maturacao: Maturacao; prazo: string;
  observacao: string | null; fotoUrl: string | null;
  status: StatusListagem; criadoEm: string;
}

interface PropostaLado {
  alimento: string; quantidadeG: number; maturacao: Maturacao; observacao: string | null;
}

interface Proposta {
  id: string; listagemId: string; propostaPaiId: string | null;
  versao: number; status: StatusTroca; criadoEm: string;
  proponenteId: string; oferecem: PropostaLado; querem: PropostaLado;
  confirmacoes: ConfirmacaoEncontro[];
}

interface Mensagem {
  id: string;
  rootPropostaId: string;
  autorId: string;
  tipo: "texto" | "sistema";
  texto: string;
  criadaEm: string;
  lida: boolean;
}

interface OcorrenciaPos {
  id: string;
  propostaId: string;
  listagemId: string;
  usuarioId: string;
  tipo: "qualidade" | "quantidade" | "diferente-anunciado" | "outro";
  descricao: string;
  criadoEm: string;
  status: "aberta" | "em-analise" | "resolvida";
}

interface CategoriaAlimento { id: string; nome: string; ativa: boolean; }
interface AlimentoBD { id: string; nome: string; categoriaId: string; ativo: boolean; imagemUrl?: string; }

interface Notificacao {
  id: string; usuarioId: string; mensagem: string;
  lida: boolean; criadaEm: string; listagemId?: string; propostaId?: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TODAY = "2026-08-15";

const MAT: Record<Maturacao, { label: string; cor: string }> = {
  "verde":        { label: "Verde",        cor: "#16a34a" },
  "meio-maduro":  { label: "Meio-maduro",  cor: "#ca8a04" },
  "maduro":       { label: "Maduro",       cor: "#ea580c" },
  "muito-maduro": { label: "Muito maduro", cor: "#E85D4E" },
};

const STATUS_LABEL: Record<StatusTroca, string> = {
  "proposto": "Proposta enviada", "contraproposto": "Contraproposta",
  "aceito": "Aceito", "encontro-agendado": "Encontro agendado",
  "concluido": "Concluído", "cancelado": "Cancelado",
  "nao-compareceu": "Não realizada", "divergencia": "Divergência",
};
const STATUS_COR: Record<StatusTroca, string> = {
  "proposto": "#3b82f6", "contraproposto": "#8b5cf6",
  "aceito": "#22c55e", "encontro-agendado": "#ca8a04",
  "concluido": "#2F6B5E", "cancelado": "#9ca3af",
  "nao-compareceu": "#E85D4E", "divergencia": "#E85D4E",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INIT_CATEGORIAS: CategoriaAlimento[] = [
  { id: "frutas",    nome: "Frutas",    ativa: true },
  { id: "legumes",   nome: "Legumes",   ativa: true },
  { id: "verduras",  nome: "Verduras",  ativa: true },
  { id: "temperos",  nome: "Temperos",  ativa: true },
  { id: "tuberculos",nome: "Tubérculos",ativa: true },
];

const INIT_ALIMENTOS_BD: AlimentoBD[] = [
  { id: "tomate",    nome: "Tomate",          categoriaId: "legumes",    ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=400&fit=crop" },
  { id: "cebola",    nome: "Cebola",          categoriaId: "legumes",    ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=600&h=400&fit=crop" },
  { id: "pimentao",  nome: "Pimentão",        categoriaId: "legumes",    ativo: true },
  { id: "quiabo",    nome: "Quiabo",          categoriaId: "legumes",    ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&h=400&fit=crop" },
  { id: "jilo",      nome: "Jiló",            categoriaId: "legumes",    ativo: true },
  { id: "berinjela", nome: "Berinjela",       categoriaId: "legumes",    ativo: true },
  { id: "maxixe",    nome: "Maxixe",          categoriaId: "legumes",    ativo: true },
  { id: "abobora",   nome: "Abóbora",         categoriaId: "legumes",    ativo: true },
  { id: "cenoura",   nome: "Cenoura",         categoriaId: "legumes",    ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&h=400&fit=crop" },
  { id: "beterraba", nome: "Beterraba",       categoriaId: "legumes",    ativo: true },
  { id: "alface",    nome: "Alface",          categoriaId: "verduras",   ativo: true },
  { id: "repolho",   nome: "Repolho",         categoriaId: "verduras",   ativo: true },
  { id: "coentro",   nome: "Coentro",         categoriaId: "verduras",   ativo: true },
  { id: "salsa",     nome: "Salsinha",        categoriaId: "verduras",   ativo: true },
  { id: "cebolinha", nome: "Cebolinha",       categoriaId: "verduras",   ativo: true },
  { id: "pimenta",   nome: "Pimenta de Cheiro",categoriaId: "temperos",  ativo: true },
  { id: "batata",    nome: "Batata",          categoriaId: "tuberculos", ativo: true },
  { id: "mandioca",  nome: "Mandioca",        categoriaId: "tuberculos", ativo: true },
  { id: "inhame",    nome: "Inhame",          categoriaId: "tuberculos", ativo: true },
  { id: "macaxeira", nome: "Macaxeira",       categoriaId: "tuberculos", ativo: true },
  { id: "limao",     nome: "Limão",           categoriaId: "frutas",     ativo: true },
  { id: "laranja",   nome: "Laranja",         categoriaId: "frutas",     ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&h=400&fit=crop" },
  { id: "manga",     nome: "Manga",           categoriaId: "frutas",     ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&h=400&fit=crop" },
  { id: "mamao",     nome: "Mamão",           categoriaId: "frutas",     ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=600&h=400&fit=crop" },
  { id: "banana",    nome: "Banana",          categoriaId: "frutas",     ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=400&fit=crop" },
  { id: "melancia",  nome: "Melancia",        categoriaId: "frutas",     ativo: true },
  { id: "abacaxi",   nome: "Abacaxi",         categoriaId: "frutas",     ativo: true,  imagemUrl: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&h=400&fit=crop" },
  { id: "goiaba",    nome: "Goiaba",          categoriaId: "frutas",     ativo: true },
  { id: "acerola",   nome: "Acerola",         categoriaId: "frutas",     ativo: true },
  { id: "caju",      nome: "Caju",            categoriaId: "frutas",     ativo: true },
];

const INIT_USUARIOS: Usuario[] = [
  { id: "u1", nome: "Restaurante Tempero da Roça", tipo: "restaurante", documentoTipo: "cnpj", cnpjCpf: "12.345.678/0001-91", email: "tempero@exemplo.com.br", senha: "123456", endereco: "Rua Nova, Barraca 23-A, Setor C", whatsapp: "(75) 99100-0001", responsavel: "Maria das Graças", alimentosInteresse: ["tomate","cebola","coentro","pimentao"], horario: "06:00 às 14:00", status: "aprovado", criadoEm: "2026-08-01T08:00:00", ultimaAtividade: "2026-08-15T07:30:00" },
  { id: "u2", nome: "Distribuidora São Cristóvão", tipo: "comerciante", cnpjCpf: "00.000.002/0001-02", email: "sao.cristovao@exemplo.com.br", senha: "123456", endereco: "Baraúnas, Galpão 3, Lote 45", whatsapp: "(75) 99100-0002", responsavel: "João Batista Oliveira", alimentosInteresse: ["mamao","banana","manga","abacaxi"], horario: "05:00 às 13:00", status: "aprovado", criadoEm: "2026-07-28T06:00:00", ultimaAtividade: "2026-08-15T06:45:00" },
  { id: "u3", nome: "Restaurante Sabor Nordestino", tipo: "restaurante", documentoTipo: "cnpj", cnpjCpf: "23.456.789/0001-13", email: "sabornordestino@exemplo.com.br", endereco: "Queimadinha, Loja 7, Setor B", whatsapp: "(75) 99100-0003", responsavel: "Ana Cláudia Costa", alimentosInteresse: ["banana","mamao","cenoura","beterraba"], horario: "06:30 às 15:00", status: "aprovado", criadoEm: "2026-08-05T07:30:00" },
  { id: "u4", nome: "Mercado Progresso", tipo: "comerciante", cnpjCpf: "00.000.004/0001-24", email: "mercado.progresso@exemplo.com.br", endereco: "Rua Nova, Barraca 14, Setor A", whatsapp: "(75) 99100-0004", responsavel: "Pedro Alves Lima", alimentosInteresse: ["tomate","quiabo","maxixe","jilo"], horario: "04:00 às 12:00", status: "aprovado", criadoEm: "2026-07-20T05:00:00" },
  { id: "u5", nome: "Lanchonete Boa Vista", tipo: "restaurante", documentoTipo: "cnpj", cnpjCpf: "34.567.890/0001-55", email: "boavista@exemplo.com.br", endereco: "Baraúnas, Loja 2, Corredor Norte", whatsapp: "(75) 99100-0005", responsavel: "Carla Ferreira", alimentosInteresse: ["alface","tomate","cebolinha"], horario: "07:00 às 18:00", status: "pendente", criadoEm: "2026-08-14T09:00:00" },
  { id: "u6", nome: "Hortifrúti Raízes do Sertão", tipo: "comerciante", cnpjCpf: "00.000.006/0001-46", email: "raizesdosertao@exemplo.com.br", endereco: "Queimadinha, Galpão 1, Dock 8", whatsapp: "(75) 99100-0006", responsavel: "Raimundo Nonato", alimentosInteresse: ["manga","goiaba","caju"], horario: "04:30 às 12:30", status: "pendente", criadoEm: "2026-08-15T07:00:00" },
  { id: "admin", nome: "Administração Central", tipo: "admin", cnpjCpf: "00.000.000/0001-00", email: "admin@centrotroca.feira.ba", senha: "admin123", endereco: "Centro de Abastecimento, Administração", whatsapp: "(75) 99100-0000", responsavel: "Gestão do Sistema", alimentosInteresse: [], horario: "24h", status: "aprovado", criadoEm: "2026-01-01T00:00:00" },
];

const INIT_LISTAGENS: Listagem[] = [
  { id: "l1", tipo: "oferta",  usuarioId: "u2", alimento: "mamao",   quantidadeG: 3000, maturacao: "muito-maduro", prazo: "2026-08-18", observacao: "Caixas bem maduras, bom para consumo imediato.", fotoUrl: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=600&h=400&fit=crop", status: "ativa",        criadoEm: "2026-08-15T06:00:00" },
  { id: "l2", tipo: "oferta",  usuarioId: "u4", alimento: "tomate",  quantidadeG: 2000, maturacao: "maduro",       prazo: "2026-08-19", observacao: null, fotoUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=400&fit=crop", status: "ativa",        criadoEm: "2026-08-15T06:30:00" },
  { id: "l3", tipo: "pedido",  usuarioId: "u1", alimento: "banana",  quantidadeG: 1500, maturacao: "maduro",       prazo: "2026-08-20", observacao: "Preciso para amanhã de manhã.",  fotoUrl: null, status: "ativa",        criadoEm: "2026-08-15T07:00:00" },
  { id: "l4", tipo: "oferta",  usuarioId: "u2", alimento: "banana",  quantidadeG: 2000, maturacao: "verde",        prazo: "2026-08-22", observacao: "Boa para uso com prazo.",          fotoUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=400&fit=crop", status: "em-negociacao",criadoEm: "2026-08-14T08:00:00" },
  { id: "l5", tipo: "pedido",  usuarioId: "u3", alimento: "cenoura", quantidadeG: 1000, maturacao: "maduro",       prazo: "2026-08-21", observacao: null, fotoUrl: null, status: "ativa",        criadoEm: "2026-08-15T08:30:00" },
  { id: "l6", tipo: "oferta",  usuarioId: "u4", alimento: "quiabo",  quantidadeG: 700,  maturacao: "meio-maduro",  prazo: "2026-08-19", observacao: null, fotoUrl: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&h=400&fit=crop", status: "ativa",        criadoEm: "2026-08-15T09:00:00" },
  { id: "l7", tipo: "pedido",  usuarioId: "u4", alimento: "manga",   quantidadeG: 2500, maturacao: "meio-maduro",  prazo: "2026-08-22", observacao: null, fotoUrl: null, status: "ativa",        criadoEm: "2026-08-15T10:00:00" },
  { id: "l8", tipo: "oferta",  usuarioId: "u3", alimento: "cebola",  quantidadeG: 1500, maturacao: "maduro",       prazo: "2026-08-20", observacao: "Colhidas há dois dias.", fotoUrl: null, status: "concluida",     criadoEm: "2026-08-13T07:00:00" },
  { id: "l9", tipo: "oferta",  usuarioId: "u2", alimento: "abacaxi", quantidadeG: 1000, maturacao: "maduro",       prazo: "2026-08-20", observacao: null, fotoUrl: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&h=400&fit=crop", status: "em-negociacao",criadoEm: "2026-08-12T08:00:00" },
];

const INIT_PROPOSTAS: Proposta[] = [
  { id: "p1", listagemId: "l4", propostaPaiId: null, versao: 1, status: "contraproposto", criadoEm: "2026-08-14T10:00:00", proponenteId: "u1", oferecem: { alimento: "tomate", quantidadeG: 2000, maturacao: "maduro", observacao: "Tomates de ontem." }, querem: { alimento: "banana", quantidadeG: 2000, maturacao: "verde", observacao: null }, confirmacoes: [] },
  { id: "p2", listagemId: "l4", propostaPaiId: "p1", versao: 2, status: "proposto",       criadoEm: "2026-08-14T11:30:00", proponenteId: "u2", oferecem: { alimento: "banana",  quantidadeG: 1500, maturacao: "verde",  observacao: "Só tenho 1,5 kg disponível." }, querem: { alimento: "tomate",  quantidadeG: 1500, maturacao: "maduro", observacao: null }, confirmacoes: [] },
  { id: "p3", listagemId: "l9", propostaPaiId: null, versao: 1, status: "encontro-agendado", criadoEm: "2026-08-13T10:00:00", proponenteId: "u1", oferecem: { alimento: "cebola",  quantidadeG: 1000, maturacao: "maduro", observacao: null }, querem: { alimento: "abacaxi", quantidadeG: 1000, maturacao: "maduro", observacao: null }, confirmacoes: [{ usuarioId: "u2", resposta: "aconteceu", pesoG: 980, criadaEm: "2026-08-15T07:00:00" }] },
];

// e1 meeting was 2026-08-14 (yesterday) → TODAY > e.data → true → confirmation pending for u1
const INIT_ENCONTROS: Encontro[] = [
  { id: "e1", propostaId: "p3", data: "2026-08-14", horario: "06:00", local: "Centro de Abastecimento, Rua Nova, Setor C", criadoEm: "2026-08-13T20:00:00", alteracoes: [] },
];

const INIT_MENSAGENS: Mensagem[] = [
  { id: "m1", rootPropostaId: "p3", autorId: "sistema", tipo: "sistema", texto: "Restaurante Tempero da Roça enviou uma proposta para a oferta de Abacaxi.", criadaEm: "2026-08-13T10:00:00", lida: true },
  { id: "m2", rootPropostaId: "p3", autorId: "u1", tipo: "texto", texto: "Bom dia! Tenho cebola madura disponível, posso trocar 1 kg.", criadaEm: "2026-08-13T10:05:00", lida: true },
  { id: "m3", rootPropostaId: "p3", autorId: "u2", tipo: "texto", texto: "Combinado! Me serve. Pode ser amanhã cedo aqui no Setor C?", criadaEm: "2026-08-13T10:30:00", lida: true },
  { id: "m4", rootPropostaId: "p3", autorId: "u1", tipo: "texto", texto: "Pode ser às 06:00?", criadaEm: "2026-08-13T10:32:00", lida: true },
  { id: "m5", rootPropostaId: "p3", autorId: "u2", tipo: "texto", texto: "Perfeito.", criadaEm: "2026-08-13T10:35:00", lida: true },
  { id: "m6", rootPropostaId: "p3", autorId: "sistema", tipo: "sistema", texto: "Proposta aceita. Encontro agendado: 14/08 às 06:00 — Centro de Abastecimento, Rua Nova, Setor C.", criadaEm: "2026-08-13T20:00:00", lida: true },
  { id: "m7", rootPropostaId: "p1", autorId: "sistema", tipo: "sistema", texto: "Restaurante Tempero da Roça enviou uma proposta para a oferta de Banana.", criadaEm: "2026-08-14T10:00:00", lida: true },
  { id: "m8", rootPropostaId: "p1", autorId: "u1", tipo: "texto", texto: "Tenho tomate maduro pra trocar pelos seus 2 kg de banana.", criadaEm: "2026-08-14T10:05:00", lida: true },
  { id: "m9", rootPropostaId: "p1", autorId: "u2", tipo: "texto", texto: "Não tenho os 2 kg, só consigo 1,5 kg. Aceita?", criadaEm: "2026-08-14T11:25:00", lida: true },
  { id: "m10",rootPropostaId: "p1", autorId: "sistema", tipo: "sistema", texto: "Distribuidora São Cristóvão enviou uma contraproposta.", criadaEm: "2026-08-14T11:30:00", lida: false },
];

const INIT_NOTIFICACOES: Notificacao[] = [
  { id: "n1", usuarioId: "u1", mensagem: "João Batista (Distribuidora São Cristóvão) enviou uma contraproposta para Banana. Banana verde • 1,5 kg.", lida: false, criadaEm: "2026-08-14T11:35:00", listagemId: "l4", propostaId: "p2" },
  { id: "n2", usuarioId: "u1", mensagem: "Pedro Alves (Mercado Progresso) publicou uma nova oferta de Tomate. 2 kg, maduro.", lida: false, criadaEm: "2026-08-15T06:35:00", listagemId: "l2" },
  { id: "n3", usuarioId: "u2", mensagem: "Maria das Graças (Restaurante Tempero da Roça) propôs troca pela sua oferta de Banana.", lida: true, criadaEm: "2026-08-14T10:05:00", listagemId: "l4", propostaId: "p1" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function nomeAlimento(id: string, alimentosBD: AlimentoBD[]): string {
  return alimentosBD.find(a => a.id === id)?.nome ?? id;
}
function imagemAlimento(id: string, alimentosBD: AlimentoBD[]): string | null {
  return alimentosBD.find(a => a.id === id)?.imagemUrl ?? null;
}
function fmtDate(s: string): string { return new Date(s + (s.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }); }
function fmtDateShort(s: string): string { return new Date(s + (s.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" }); }
function fmtDT(s: string): string { return new Date(s).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }); }
function fmtHora(s: string): string { return new Date(s).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }); }
function genId(): string { return Math.random().toString(36).slice(2, 9); }

function toGrams(valor: number, u: Unidade): number { return u === "kg" ? valor * 1000 : valor; }
function fmtQtd(g: number): string {
  if (g >= 1000) { const kg = g / 1000; return `${Number.isInteger(kg) ? kg : kg.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`; }
  return `${Number.isInteger(g) ? g : g.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} g`;
}

function maskCPF(v: string): string { const d = v.replace(/\D/g,"").slice(0,11); if(d.length<=3)return d; if(d.length<=6)return `${d.slice(0,3)}.${d.slice(3)}`; if(d.length<=9)return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`; return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`; }
function maskCNPJ(v: string): string { const d = v.replace(/\D/g,"").slice(0,14); if(d.length<=2)return d; if(d.length<=5)return `${d.slice(0,2)}.${d.slice(2)}`; if(d.length<=8)return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`; if(d.length<=12)return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`; return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`; }
function maskPhone(v: string): string { const d = v.replace(/\D/g,"").slice(0,11); if(d.length<=2)return d.length===0?d:`(${d}`; if(d.length<=6)return `(${d.slice(0,2)}) ${d.slice(2)}`; if(d.length<=10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; }

function buildChain(propostas: Proposta[]): Proposta[] {
  const chain: Proposta[] = [];
  let cur: Proposta | undefined = propostas.find(p => !p.propostaPaiId);
  while (cur) { chain.push(cur); cur = propostas.find(p => p.propostaPaiId === cur!.id); }
  return chain;
}

// Confirmation available on the DAY AFTER the meeting day
function isDiaEncontroPassado(e: Encontro): boolean { return TODAY > e.data; }

function isConfirmacaoPendente(p: Proposta, encontros: Encontro[]): boolean {
  if (p.status !== "encontro-agendado") return false;
  const e = encontros.find(x => x.propostaId === p.id);
  return !!e && isDiaEncontroPassado(e);
}

function getPendingConfirmation(userId: string, propostas: Proposta[], listagens: Listagem[], encontros: Encontro[]): string | null {
  const p = propostas.find(pr => {
    if (pr.status !== "encontro-agendado") return false;
    const l = listagens.find(x => x.id === pr.listagemId);
    const envolvido = l?.usuarioId === userId || pr.proponenteId === userId;
    if (!envolvido || !isConfirmacaoPendente(pr, encontros)) return false;
    return !pr.confirmacoes.some(c => c.usuarioId === userId);
  });
  return p?.id ?? null;
}

type Errors = Record<string, string>;
function validateNome(v: string, min=3, max=100): string|null { if(!v.trim())return "Campo obrigatório."; if(v.trim().length<min)return `Mínimo ${min} caracteres.`; if(v.trim().length>max)return `Máximo ${max} caracteres.`; return null; }
function validateEmail(v: string): string|null { if(!v.trim())return "Campo obrigatório."; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))return "Informe um e-mail válido."; return null; }
function validateCNPJCPF(v: string, documentoTipo: TipoDocumento): string|null { const d=v.replace(/\D/g,""); if(documentoTipo==="cpf"&&d.length!==11)return "Informe um CPF válido (11 dígitos)."; if(documentoTipo==="cnpj"&&d.length!==14)return "Informe um CNPJ válido (14 dígitos)."; return null; }
function validatePhone(v: string): string|null { const d=v.replace(/\D/g,""); if(d.length<10||d.length>11)return "Informe um telefone com DDD."; return null; }
function validateQtd(v: string): string|null { const n=parseFloat(v); if(!v||isNaN(n))return "Informe uma quantidade válida."; if(n<=0)return "A quantidade deve ser maior que zero."; return null; }

// ─── PRIMITIVOS ───────────────────────────────────────────────────────────────

function Btn({ children, variant="primary", size="md", className="", onClick, disabled=false, type="button" }: {
  children: ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"outline";
  size?: "sm"|"md"|"lg"; className?: string; onClick?: ()=>void; disabled?: boolean; type?: "button"|"submit";
}) {
  const vs = { primary:"bg-primary text-primary-foreground hover:bg-primary/90", secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost:"text-foreground hover:bg-muted", danger:"bg-[#E85D4E] text-white hover:bg-[#c94a3c]", outline:"border border-primary text-primary hover:bg-primary/5" };
  const ss = { sm:"px-3 py-1.5 text-xs gap-1.5", md:"px-4 py-2.5 text-sm gap-2", lg:"px-5 py-3 text-sm gap-2" };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${vs[variant]} ${ss[size]} ${className}`}>{children}</button>;
}

function Inp({ label, error, note, ...p }: { label?: string; error?: string; note?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
      <input {...p} className={`w-full px-3 py-3 rounded-lg border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition ${error?"border-[#E85D4E]":"border-border"} ${p.className??""}`} />
      {error && <p className="text-xs text-[#E85D4E] flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
      {note && !error && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Sel({ label, error, children, ...p }: { label?: string; error?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
      <select {...p} className={`w-full px-3 py-3 rounded-lg border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition ${error?"border-[#E85D4E]":"border-border"} ${p.className??""}`}>{children}</select>
      {error && <p className="text-xs text-[#E85D4E] flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
    </div>
  );
}

function Txa({ label, error, ...p }: { label?: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
      <textarea {...p} className={`w-full px-3 py-3 rounded-lg border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition resize-none ${error?"border-[#E85D4E]":"border-border"} ${p.className??""}`} />
      {error && <p className="text-xs text-[#E85D4E] flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</p>}
    </div>
  );
}

// ─── STATUS DOT ───────────────────────────────────────────────────────────────

function StatusDot({ s, label }: { s: StatusTroca; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COR[s] }} />
      {label ?? STATUS_LABEL[s]}
    </span>
  );
}

// ─── LISTAGEM CARD (uniform height) ──────────────────────────────────────────

function ListagemCard({ l, usuarios, alimentosBD, onClick }: { l: Listagem; usuarios: Usuario[]; alimentosBD: AlimentoBD[]; onClick: ()=>void }) {
  const u = usuarios.find(x => x.id === l.usuarioId);
  const foto = l.fotoUrl ?? imagemAlimento(l.alimento, alimentosBD);
  return (
    <button onClick={onClick} className="w-full text-left group active:opacity-80 h-full">
      <div className="bg-card border border-border rounded-xl overflow-hidden group-hover:border-primary/30 transition-colors h-full flex flex-col">
        <div className="h-1.5 flex-shrink-0" style={{ backgroundColor: MAT[l.maturacao].cor }} />
        <div className="h-36 flex-shrink-0 overflow-hidden bg-muted/40 relative">
          {foto
            ? <img src={foto} alt={nomeAlimento(l.alimento, alimentosBD)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center"><span className="text-7xl font-black text-muted-foreground/8 select-none">{nomeAlimento(l.alimento, alimentosBD).charAt(0)}</span></div>
          }
        </div>
        <div className="p-3 flex flex-col flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: l.tipo==="oferta"?"#2F6B5E":"#B87A00" }}>{l.tipo==="oferta"?"Oferta":"Pedido"}</p>
          <p className="font-extrabold text-foreground text-base leading-tight">{nomeAlimento(l.alimento, alimentosBD)}</p>
          <p className="text-sm text-muted-foreground">{fmtQtd(l.quantidadeG)} · {MAT[l.maturacao].label}</p>
          <div className="flex items-center justify-between gap-2 mt-auto pt-2">
            <p className="text-xs text-muted-foreground truncate min-w-0">{u?.responsavel.split(" ")[0]}</p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">Até {fmtDateShort(l.prazo)}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── NOTIFICATION PANEL ───────────────────────────────────────────────────────

function NotifPanel({ notificacoes, onClose, onMarkRead, onMarkAllRead, onNavigate }: {
  notificacoes: Notificacao[]; onClose: ()=>void;
  onMarkRead: (id: string)=>void; onMarkAllRead: ()=>void;
  onNavigate: (listagemId: string)=>void;
}) {
  const unread = notificacoes.filter(n => !n.lida);
  const all = [...notificacoes].sort((a,b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime());
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-card border-l border-border z-50 shadow-2xl flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground text-sm">Notificações</h2>
            {unread.length > 0 && <span className="bg-[#E85D4E] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unread.length}</span>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {all.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><Bell className="w-8 h-8 mx-auto mb-2 opacity-20"/><p className="text-sm">Sem notificações.</p></div>
          ) : all.map(n => (
            <div key={n.id} className={`p-4 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}>
              {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block mr-2 mb-1" />}
              <p className="text-sm text-foreground leading-snug">{n.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtDT(n.criadaEm)}</p>
              <div className="flex gap-3 mt-1.5">
                {n.listagemId && (
                  <button onClick={() => { onNavigate(n.listagemId!); onMarkRead(n.id); onClose(); }}
                    className="text-xs text-primary font-semibold flex items-center gap-1">
                    Ver <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                {!n.lida && <button onClick={() => onMarkRead(n.id)} className="text-xs text-muted-foreground hover:text-foreground">Marcar como lida</button>}
              </div>
            </div>
          ))}
        </div>
        {unread.length > 0 && (
          <div className="p-3 border-t border-border flex-shrink-0">
            <button onClick={onMarkAllRead} className="text-xs text-muted-foreground hover:text-foreground w-full text-left">Marcar todas como lidas</button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────

function TopBar({ title, onBack, notifCount, onNotif }: { title: string; onBack?: ()=>void; notifCount: number; onNotif: ()=>void }) {
  return (
    <header className="md:hidden bg-primary text-primary-foreground h-12 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        {onBack ? <button onClick={onBack} className="active:opacity-70"><ArrowLeft className="w-5 h-5"/></button> : <ShoppingBasket className="w-4 h-4 text-[#E8A33D]"/>}
        <span className="font-bold text-sm truncate">{title}</span>
      </div>
      <div className="relative">
        <button onClick={onNotif} className="active:opacity-70 p-1">
          <Bell className="w-5 h-5"/>
          {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E85D4E] rounded-full text-[10px] font-bold flex items-center justify-center">{notifCount}</span>}
        </button>
      </div>
    </header>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

function BottomNav({ view, setView, isAdmin, adminTab, setAdminTab }: {
  view: View; setView: (v: View)=>void; isAdmin: boolean;
  adminTab: AdminTab; setAdminTab: (t: AdminTab)=>void;
}) {
  if (isAdmin) {
    const tabs: Array<{ tab: AdminTab; label: string; icon: React.ElementType }> = [
      { tab: "visao-geral", label: "Painel", icon: Activity },
      { tab: "usuarios",    label: "Usuários",icon: Users },
      { tab: "publicacoes", label: "Públic.", icon: Package },
      { tab: "trocas",      label: "Trocas",  icon: RefreshCw },
      { tab: "alimentos",   label: "Alimentos",icon: UtensilsCrossed },
    ];
    return (
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border">
        <div className="flex items-center justify-around px-1 pt-1 pb-4">
          {tabs.map(t => { const active = view==="admin" && adminTab===t.tab; return (
            <button key={t.tab} onClick={() => { setAdminTab(t.tab); setView("admin"); }} className="flex flex-col items-center gap-1 px-2 py-1 min-w-[44px]">
              <t.icon className={`w-5 h-5 transition-colors ${active?"text-primary":"text-muted-foreground"}`}/>
              <span className={`text-[9px] font-semibold ${active?"text-primary":"text-muted-foreground"}`}>{t.label}</span>
            </button>
          ); })}
        </div>
      </nav>
    );
  }

  const tabs: Array<{ key: View; label: string; icon: React.ElementType }|null> = [
    { key: "dashboard",      label: "Início",    icon: Home },
    { key: "listagens",      label: "Listagens", icon: Package },
    null,
    { key: "minhas-trocas",  label: "Trocas",    icon: RefreshCw },
    { key: "perfil",         label: "Perfil",    icon: User },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border">
      <div className="flex items-end justify-around px-1 pt-1 pb-4">
        {tabs.map((tab, i) => {
          if (!tab) return (
            <button key="pub" onClick={() => setView("nova-listagem")} className="flex flex-col items-center gap-1 -mt-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Plus className="w-5 h-5 text-white"/>
              </div>
              <span className="text-[10px] text-muted-foreground">Publicar</span>
            </button>
          );
          const active = view===tab.key;
          return (
            <button key={tab.key} onClick={() => setView(tab.key)} className="flex flex-col items-center gap-1 px-3 py-1 min-w-[44px]">
              <tab.icon className={`w-5 h-5 transition-colors ${active?"text-primary":"text-muted-foreground"}`}/>
              <span className={`text-[10px] font-semibold ${active?"text-primary":"text-muted-foreground"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function Sidebar({ user, view, setView, notifCount, onNotif, onLogout, adminTab, setAdminTab }: {
  user: Usuario; view: string; setView: (v: View)=>void;
  notifCount: number; onNotif: ()=>void; onLogout: ()=>void;
  adminTab: AdminTab; setAdminTab: (t: AdminTab)=>void;
}) {
  if (user.id === "admin") {
    const items: Array<{ tab: AdminTab; label: string; icon: React.ElementType }> = [
      { tab: "visao-geral",  label: "Visão Geral",  icon: Activity },
      { tab: "usuarios",     label: "Usuários",     icon: Users },
      { tab: "publicacoes",  label: "Publicações",  icon: Package },
      { tab: "trocas",       label: "Trocas",       icon: RefreshCw },
      { tab: "ocorrencias",  label: "Ocorrências",  icon: AlertTriangle },
      { tab: "alimentos",    label: "Alimentos",    icon: UtensilsCrossed },
    ];
    return (
      <aside className="bg-primary flex flex-col h-full w-full">
        <div className="p-5 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0"><ShoppingBasket className="w-4 h-4 text-[#E8A33D] flex-shrink-0"/><div className="min-w-0"><p className="font-black text-primary-foreground text-xs truncate">Painel Admin</p><p className="font-bold text-primary-foreground/60 text-[10px] truncate">Feira Circular</p></div></div>
          <button onClick={onNotif} className="relative text-primary-foreground/70 hover:text-primary-foreground"><Bell className="w-4 h-4"/>{notifCount>0&&<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E85D4E] rounded-full text-[9px] font-bold flex items-center justify-center">{notifCount}</span>}</button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {items.map(item => { const active=view==="admin"&&adminTab===item.tab; return (
            <button key={item.tab} onClick={() => { setAdminTab(item.tab); setView("admin"); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${active?"bg-white/15 text-primary-foreground":"text-primary-foreground/65 hover:bg-white/10 hover:text-primary-foreground"}`}>
              <item.icon className="w-4 h-4 flex-shrink-0"/>{item.label}
            </button>
          ); })}
          <div className="pt-2 border-t border-white/10 mt-2">
            <button onClick={() => setView("perfil")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${view==="perfil"?"bg-white/15 text-primary-foreground":"text-primary-foreground/65 hover:bg-white/10 hover:text-primary-foreground"}`}><User className="w-4 h-4"/>Perfil</button>
          </div>
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs font-semibold text-primary-foreground truncate">{user.responsavel}</p>
          <button onClick={onLogout} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/80 mt-1">Sair</button>
        </div>
      </aside>
    );
  }

  const items: Array<{ key: View; label: string; icon: React.ElementType }> = [
    { key: "dashboard",     label: "Início",        icon: Home },
    { key: "listagens",     label: "Listagens",     icon: Package },
    { key: "nova-listagem", label: "Publicar",      icon: Plus },
    { key: "minhas-trocas", label: "Minhas Trocas", icon: RefreshCw },
    { key: "perfil",        label: "Perfil",        icon: User },
  ];
  return (
    <aside className="bg-primary flex flex-col h-full w-full">
      <div className="p-5 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2"><ShoppingBasket className="w-4 h-4 text-[#E8A33D] flex-shrink-0"/><div><p className="font-black text-primary-foreground text-xs">Feira Circular</p><p className="font-bold text-primary-foreground/60 text-[10px]">Trocas de Hortifrúti</p></div></div>
        <button onClick={onNotif} className="relative text-primary-foreground/70 hover:text-primary-foreground"><Bell className="w-4 h-4"/>{notifCount>0&&<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E85D4E] rounded-full text-[9px] font-bold flex items-center justify-center">{notifCount}</span>}</button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {items.map(item => { const active=view===item.key; return (
          <button key={item.key} onClick={() => setView(item.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${active?"bg-white/15 text-primary-foreground":"text-primary-foreground/65 hover:bg-white/10 hover:text-primary-foreground"}`}>
            <item.icon className="w-4 h-4 flex-shrink-0"/><span className="flex-1 text-left">{item.label}</span>
          </button>
        ); })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${user.tipo==="restaurante"?"bg-white/20":"bg-[#E8A33D]"}`}>{user.nome.charAt(0)}</div>
          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-primary-foreground truncate">{user.nome}</p><p className="text-[10px] text-primary-foreground/55 capitalize">{user.tipo}</p></div>
        </div>
        <button onClick={onLogout} className="text-xs text-primary-foreground/40 hover:text-primary-foreground/80">Sair</button>
      </div>
    </aside>
  );
}

// ─── LANDING ─────────────────────────────────────────────────────────────────

function LandingView({ onLogin, onRegistro }: { onLogin: ()=>void; onRegistro: ()=>void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground px-5">
        <div className="max-w-md mx-auto pt-12 pb-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><ShoppingBasket className="w-4 h-4 text-[#E8A33D]"/></div>
            <div>
              <p className="text-xs font-bold text-primary-foreground/80">Feira Circular</p>
              <p className="text-[10px] text-primary-foreground/50 flex items-center gap-1"><MapPin className="w-2.5 h-2.5"/>Centro de Abastecimento, Feira de Santana-BA</p>
            </div>
          </div>
          <h1 className="text-3xl font-black text-primary-foreground leading-tight mb-3">Troca de alimentos<br/>entre estabelecimentos.</h1>
          <p className="text-sm text-primary-foreground/70 leading-relaxed mb-2">Restaurantes e comerciantes de hortifrúti trocam diretamente, reduzindo desperdício e aproveitando alimentos que seriam perdidos.</p>
          <p className="text-xs text-primary-foreground/45 mb-8">Rua Nova · Baraúnas · Queimadinha</p>
          <div className="flex gap-3">
            <Btn size="lg" onClick={onLogin} className="flex-1 border border-white/25 text-white bg-white/10 hover:bg-white/20">Entrar</Btn>
            <Btn variant="danger" size="lg" onClick={onRegistro} className="flex-1">Criar cadastro</Btn>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-8 pt-5 border-t border-white/15">
            {[
              { value: "Ofertas", label: "de excedentes" },
              { value: "Pedidos", label: "de estabelecimentos" },
              { value: "Trocas", label: "combinadas no chat" },
            ].map(item => (
              <div key={item.value}>
                <p className="text-sm font-black text-primary-foreground">{item.value}</p>
                <p className="text-[10px] leading-tight text-primary-foreground/55 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 px-5 py-8 max-w-md md:max-w-4xl mx-auto w-full space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">O que você encontra aqui</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Package, title: "Excedentes", text: "Alimentos próximos da maturação ideal para venda." },
              { icon: RefreshCw, title: "Trocas diretas", text: "Negocie quantidade, maturação e prazo." },
              { icon: MapPin, title: "Pontos do Centro", text: "Combine o encontro em um local conhecido." },
              { icon: Shield, title: "Histórico", text: "Acompanhe propostas e confirmações na plataforma." },
            ].map(item => (
              <div key={item.title} className="border border-border rounded-xl p-3 bg-card">
                <item.icon className="w-4 h-4 text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Como funciona</p>
          <div className="space-y-4">
            {[
              { n:1, t:"Publique um pedido ou oferta", d:"Informe o alimento, quantidade, maturação e prazo da sua publicação." },
              { n:2, t:"Receba propostas e negocie no chat", d:"Outros estabelecimentos enviam propostas. Converse e negocie diretamente na plataforma." },
              { n:3, t:"Feche o acordo e agende o encontro", d:"Com proposta aceita, combine data, horário e local para a troca." },
              { n:4, t:"Confirme que a troca aconteceu", d:"Após o encontro, cada parte confirma se a troca foi realizada." },
            ].map(item => (
              <div key={item.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{item.n}</div>
                <div><p className="text-sm font-semibold text-foreground">{item.t}</p><p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.d}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-[#E8A33D]/30 bg-[#E8A33D]/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#B87A00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground mb-1">Antes de publicar</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Separe o lote, confira o peso e descreva a maturação com clareza. Uma foto atual ajuda a outra parte a decidir mais rápido.</p>
            </div>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground mb-1">Por que essa plataforma existe?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">No Centro de Abastecimento de Feira de Santana, restaurantes frequentemente precisam de alimentos ainda verdes para usar ao longo da semana, enquanto comerciantes ficam com excedentes maduros que não conseguem vender. A plataforma organiza esse encontro, reduz perdas e beneficia os dois lados.</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Combinados importantes</p>
          {[
            { icon: Clock, text: "Combine horário e local antes de aceitar a proposta." },
            { icon: CheckCircle2, text: "Confira embalagem, qualidade e peso no momento da troca." },
            { icon: Shield, text: "Confirme a troca somente depois de conferir o lote recebido." },
          ].map(item => (
            <div key={item.text} className="flex items-start gap-2.5">
              <item.icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">Acesso por cadastro aprovado pelo administrador.</p>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function LoginView({ usuarios, onLogin, onRegistro, onBack }: { usuarios: Usuario[]; onLogin: (u: Usuario)=>void; onRegistro: ()=>void; onBack: ()=>void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const usuario = usuarios.find(u => u.status === "aprovado" && u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha);
    if (!usuario) { setErro("E-mail ou senha inválidos."); return; }
    onLogin(usuario);
  }
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-5"><ArrowLeft className="w-4 h-4"/>Voltar</button>
        <div className="flex items-center gap-2 mb-1"><ShoppingBasket className="w-4 h-4 text-[#E8A33D]"/><p className="text-xs font-semibold text-primary-foreground/60 uppercase tracking-widest">Feira Circular</p></div>
        <div className="flex items-center gap-2"><ShoppingBasket className="w-5 h-5 text-[#E8A33D]"/><h1 className="text-2xl font-black text-primary-foreground">Entrar na plataforma</h1></div>
        <p className="text-xs text-primary-foreground/40 mt-1">Use o e-mail e a senha do estabelecimento.</p>
      </div>
      <div className="flex-1 px-5 py-4 max-w-md mx-auto w-full">
        <form onSubmit={submit} className="space-y-4">
          <Inp label="E-mail" type="email" value={email} autoComplete="email" onChange={e=>{setEmail(e.target.value);setErro("")}} placeholder="contato@estabelecimento.com" />
          <Inp label="Senha" type="password" value={senha} autoComplete="current-password" onChange={e=>{setSenha(e.target.value);setErro("")}} placeholder="Sua senha" />
          {erro && <p className="text-sm text-[#E85D4E] flex items-center gap-1"><AlertCircle className="w-4 h-4"/>{erro}</p>}
          <Btn type="submit" className="w-full">Entrar</Btn>
        </form>
        <div className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Não tem cadastro? <button onClick={onRegistro} className="text-primary font-semibold hover:underline">Solicitar acesso</button></p>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTRO ─────────────────────────────────────────────────────────────────

function RegistroView({ onSubmit, onBack, alimentosBD, categorias }: {
  onSubmit: (data: Partial<Usuario>)=>void | Promise<void>; onBack: ()=>void;
  alimentosBD: AlimentoBD[]; categorias: CategoriaAlimento[];
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nome:"", tipo:"restaurante" as "restaurante"|"comerciante", documentoTipo:"cnpj" as TipoDocumento, cnpjCpf:"", endereco:"", whatsapp:"", responsavel:"", email:"", senha:"", confirmaSenha:"", abre:"", fecha:"", horario:"", alimentosInteresse:[] as string[], termos:false });
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(f=>({...f,[k]:v})); setErrors(e=>{ const n={...e}; delete n[k as string]; return n; }); }

  function validateStep1(): boolean {
    const e: Errors = {};
    const nErr=validateNome(form.nome,3,100); if(nErr)e.nome=nErr;
    const rErr=validateNome(form.responsavel,3,80); if(rErr)e.responsavel=rErr;
    const dErr=validateCNPJCPF(form.cnpjCpf,form.documentoTipo); if(dErr)e.cnpjCpf=dErr;
    const emErr=validateEmail(form.email); if(emErr)e.email=emErr;
    if(form.senha.length<6)e.senha="A senha deve ter ao menos 6 caracteres.";
    if(form.senha!==form.confirmaSenha)e.confirmaSenha="As senhas não conferem.";
    const enErr=validateNome(form.endereco,5,200); if(enErr)e.endereco=enErr;
    const tErr=validatePhone(form.whatsapp); if(tErr)e.whatsapp=tErr;
    if(!form.horario)e.horario="Selecione o horário.";
    setErrors(e); return Object.keys(e).length===0;
  }

  function goStep3() { if(form.alimentosInteresse.length===0){setErrors({alimentosInteresse:"Selecione ao menos um alimento."});return;} setErrors({}); setStep(3); }

  const alimentosAtivos = alimentosBD.filter(a => a.ativo);
  const catsAtivas = categorias.filter(c => c.ativa);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-5 pt-12 pb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-5"><ArrowLeft className="w-4 h-4"/>Voltar</button>
        <h1 className="text-2xl font-black text-primary-foreground">Solicitar acesso</h1>
        <div className="flex gap-1.5 mt-4">{[1,2,3].map(s=><div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step>=s?"bg-white":"bg-white/25"}`}/>)}</div>
      </div>
      <div className="max-w-lg mx-auto px-5 py-6">
        {step===1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-foreground mb-4">Dados do estabelecimento</h2>
            <div><p className="text-sm font-semibold text-foreground mb-2">Tipo <span className="text-[#E85D4E]">*</span></p><div className="flex gap-3">{(["restaurante","comerciante"] as const).map(t=><button key={t} type="button" onClick={()=>{set("tipo",t);if(t==="restaurante"){set("documentoTipo","cnpj");set("cnpjCpf","");}}} className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold capitalize transition-colors ${form.tipo===t?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>{t}</button>)}</div></div>
            <Inp label="Nome do estabelecimento *" placeholder="Ex: Restaurante do João" maxLength={100} value={form.nome} error={errors.nome} onChange={e=>set("nome",e.target.value)}/>
            <Inp label="Nome do responsável *" placeholder="Nome completo" maxLength={80} value={form.responsavel} error={errors.responsavel} onChange={e=>set("responsavel",e.target.value)}/>
            {form.tipo==="comerciante"&&<div><p className="text-sm font-semibold text-foreground mb-2">Tipo de documento *</p><div className="flex gap-2"><button type="button" onClick={()=>{set("documentoTipo","cpf");set("cnpjCpf","")}} className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold ${form.documentoTipo==="cpf"?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>CPF</button><button type="button" onClick={()=>{set("documentoTipo","cnpj");set("cnpjCpf","")}} className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold ${form.documentoTipo==="cnpj"?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>CNPJ</button></div></div>}
            <Inp label={`${form.documentoTipo.toUpperCase()} *`} placeholder={form.documentoTipo==="cpf"?"000.000.000-00":"00.000.000/0001-00"} value={form.cnpjCpf} error={errors.cnpjCpf} onChange={e=>set("cnpjCpf",form.documentoTipo==="cpf"?maskCPF(e.target.value):maskCNPJ(e.target.value))}/>
            <Inp label="E-mail *" type="email" placeholder="contato@estabelecimento.com" maxLength={120} value={form.email} error={errors.email} onChange={e=>set("email",e.target.value)}/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Inp label="Senha *" type="password" value={form.senha} error={errors.senha} onChange={e=>set("senha",e.target.value)}/><Inp label="Confirmar senha *" type="password" value={form.confirmaSenha} error={errors.confirmaSenha} onChange={e=>set("confirmaSenha",e.target.value)}/></div>
            <Inp label="WhatsApp *" placeholder="(75) 99000-0000" value={form.whatsapp} error={errors.whatsapp} onChange={e=>set("whatsapp",maskPhone(e.target.value))}/>
            <Inp label="Endereço no Centro de Abastecimento *" placeholder="Setor, corredor ou loja" maxLength={200} value={form.endereco} error={errors.endereco} onChange={e=>set("endereco",e.target.value)}/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Inp label="Abre às *" type="time" value={form.abre} error={errors.abre} onChange={e=>{set("abre",e.target.value);set("horario",`${e.target.value} às ${form.fecha||"--:--"}`)}}/><Inp label="Fecha às *" type="time" value={form.fecha} error={errors.fecha} onChange={e=>{set("fecha",e.target.value);set("horario",`${form.abre||"--:--"} às ${e.target.value}`)}}/></div>
            <Btn onClick={()=>{ if(validateStep1())setStep(2); }} className="w-full mt-2">Próximo</Btn>
          </div>
        )}
        {step===2 && (
          <div>
            <h2 className="font-bold text-foreground mb-1">Alimentos de interesse</h2>
            <p className="text-sm text-muted-foreground mb-4">O que você costuma precisar ou oferecer.</p>
            {errors.alimentosInteresse && <p className="text-xs text-[#E85D4E] mb-3 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.alimentosInteresse}</p>}
            {catsAtivas.map(cat => (
              <div key={cat.id} className="mb-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{cat.nome}</p>
                <div className="flex flex-wrap gap-2">
                  {alimentosAtivos.filter(a=>a.categoriaId===cat.id).map(a=>(
                    <button key={a.id} type="button" onClick={()=>set("alimentosInteresse",form.alimentosInteresse.includes(a.id)?form.alimentosInteresse.filter(x=>x!==a.id):[...form.alimentosInteresse,a.id])} className={`px-3 py-1.5 rounded-full text-sm border-2 font-medium transition-colors ${form.alimentosInteresse.includes(a.id)?"bg-primary text-primary-foreground border-primary":"border-border text-foreground"}`}>{a.nome}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3 mt-4"><Btn variant="ghost" onClick={()=>setStep(1)}>Voltar</Btn><Btn onClick={goStep3} className="flex-1">Próximo</Btn></div>
          </div>
        )}
        {step===3 && (
          <div className="space-y-5">
            <h2 className="font-bold text-foreground">Termo de responsabilidade</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-900 mb-2">Ao se cadastrar, você se compromete a:</p>
              <ul className="space-y-1 text-amber-800 list-disc list-inside text-sm">
                <li>Entregar alimentos embalados e sem contaminação</li>
                <li>Comparecer ao encontro no horário combinado</li>
                <li>Registrar o peso com a própria balança</li>
                <li>Confirmar a conclusão da troca na plataforma</li>
              </ul>
            </div>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={form.termos} onChange={e=>set("termos",e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary"/><span className="text-sm text-foreground">Li e concordo com os termos.</span></label>
            <div className="flex items-start gap-2 bg-muted rounded-lg p-3 text-xs text-muted-foreground"><Info className="w-4 h-4 flex-shrink-0 mt-0.5"/>O cadastro será analisado pelo administrador antes da liberação.</div>
            <div className="flex gap-3"><Btn variant="ghost" onClick={()=>setStep(2)}>Voltar</Btn><Btn onClick={()=>onSubmit(form)} className="flex-1" disabled={!form.termos}><Check className="w-4 h-4"/>Enviar</Btn></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function DashboardView({ user, listagens, propostas, usuarios, encontros, pendingConfirmationId, alimentosBD, setView, navTo }: {
  user: Usuario; listagens: Listagem[]; propostas: Proposta[]; usuarios: Usuario[];
  encontros: Encontro[]; pendingConfirmationId: string|null;
  alimentosBD: AlimentoBD[]; setView: (v: View)=>void;
  navTo: (v: View, id?: string, from?: View)=>void;
}) {
  const minhasAtivas = listagens.filter(l => l.usuarioId===user.id && (l.status==="ativa"||l.status==="em-negociacao"));
  const aguardandoResposta = propostas.filter(p => { const l=listagens.find(x=>x.id===p.listagemId); return l?.usuarioId===user.id && p.status==="proposto"; });
  const proximosEncontros = propostas.filter(p => {
    if(p.status!=="encontro-agendado")return false;
    const l=listagens.find(x=>x.id===p.listagemId);
    if(l?.usuarioId!==user.id&&p.proponenteId!==user.id)return false;
    const e=encontros.find(x=>x.propostaId===p.id);
    return e && !isDiaEncontroPassado(e);
  });
  const oportunidades = listagens
    .filter(l => l.status === "ativa" && l.tipo === "oferta" && l.usuarioId !== user.id && user.alimentosInteresse.includes(l.alimento))
    .sort((a,b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    .slice(0, 3);

  const pendingProposta = pendingConfirmationId ? propostas.find(p=>p.id===pendingConfirmationId) : null;
  const pendingListagem = pendingProposta ? listagens.find(l=>l.id===pendingProposta.listagemId) : null;
  const pendingEncontro = pendingProposta ? encontros.find(e=>e.propostaId===pendingProposta.id) : null;
  const outraParte = pendingProposta ? (pendingProposta.proponenteId===user.id ? usuarios.find(u=>u.id===listagens.find(l=>l.id===pendingProposta.listagemId)?.usuarioId) : usuarios.find(u=>u.id===pendingProposta.proponenteId)) : null;

  return (
    <div className="px-4 py-5 max-w-2xl md:max-w-5xl mx-auto space-y-6">
      <div><p className="text-sm text-muted-foreground">Bem-vindo</p><h1 className="text-xl font-black text-foreground">{user.responsavel.split(" ")[0]}</h1><p className="text-xs text-muted-foreground mt-0.5">{user.nome}</p></div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Resumo da sua operação</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
          {[
            { icon: Package, value: minhasAtivas.length, label: "Publicações ativas" },
            { icon: MessageSquare, value: aguardandoResposta.length, label: "Propostas recebidas" },
            { icon: CalendarCheck, value: proximosEncontros.length, label: "Encontros marcados" },
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-3">
              <item.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-xl font-black text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {pendingConfirmationId && pendingListagem && pendingEncontro && (
        <div className="bg-[#E85D4E]/10 border border-[#E85D4E]/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#E85D4E] flex-shrink-0 mt-0.5"/>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Você tem uma troca para confirmar.</p>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {outraParte && <p className="font-semibold text-foreground">Encontro com {outraParte.nome}</p>}
                <p>{nomeAlimento(pendingListagem.alimento, alimentosBD)} · {fmtQtd(pendingProposta?.oferecem.quantidadeG??0)}</p>
                <p>{fmtDateShort(pendingEncontro.data)} às {pendingEncontro.horario} · {pendingEncontro.local}</p>
              </div>
              <Btn size="sm" variant="danger" className="mt-3" onClick={() => navTo("detalhes", pendingListagem.id, "dashboard")}>Responder agora</Btn>
            </div>
          </div>
        </div>
      )}

      {proximosEncontros.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Próximos encontros</p>
          {proximosEncontros.map(p => {
            const e=encontros.find(x=>x.propostaId===p.id); const l=listagens.find(x=>x.id===p.listagemId);
            const outra=p.proponenteId===user.id?usuarios.find(u=>u.id===l?.usuarioId):usuarios.find(u=>u.id===p.proponenteId);
            return (
              <button key={p.id} onClick={()=>l&&navTo("detalhes",l.id,"dashboard")} className="w-full text-left bg-card border border-border rounded-xl p-4 flex items-start gap-3 active:opacity-80 mb-2">
                <CalendarCheck className="w-5 h-5 text-[#E8A33D] flex-shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#B87A00] uppercase tracking-widest mb-0.5">Encontro agendado</p>
                  <p className="text-sm font-semibold text-foreground">{outra?.nome}</p>
                  <p className="text-xs text-muted-foreground">{nomeAlimento(p.oferecem.alimento, alimentosBD)} · {fmtQtd(p.oferecem.quantidadeG)}</p>
                  {e && <p className="text-xs text-muted-foreground mt-1">{fmtDateShort(e.data)} às {e.horario}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1"/>
              </button>
            );
          })}
        </div>
      )}

      {aguardandoResposta.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Aguardando sua resposta</p>
          {aguardandoResposta.map(p => (
            <button key={p.id} onClick={()=>navTo("detalhes",p.listagemId,"dashboard")} className="w-full text-left bg-card border border-border rounded-lg p-4 flex items-center justify-between active:opacity-80 mb-2">
              <div>
                <p className="text-xs font-bold text-[#B87A00] uppercase mb-0.5">Proposta recebida</p>
                <p className="text-sm font-semibold text-foreground">{nomeAlimento(p.oferecem.alimento,alimentosBD)} {fmtQtd(p.oferecem.quantidadeG)} por {nomeAlimento(p.querem.alimento,alimentosBD)}</p>
                <p className="text-xs text-muted-foreground">{usuarios.find(u=>u.id===p.proponenteId)?.nome}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </button>
          ))}
        </div>
      )}

      {oportunidades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Oportunidades para você</p>
            <button onClick={()=>setView("listagens")} className="text-xs font-semibold text-primary">Ver todas</button>
          </div>
          <div className="space-y-2">
            {oportunidades.map(l => (
              <button key={l.id} onClick={()=>navTo("detalhes",l.id,"dashboard")} className="w-full text-left bg-card border border-border rounded-xl p-3 flex items-center gap-3 active:opacity-80">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{nomeAlimento(l.alimento,alimentosBD)} · {fmtQtd(l.quantidadeG)}</p>
                  <p className="text-xs text-muted-foreground">{MAT[l.maturacao].label} · disponível até {fmtDateShort(l.prazo)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {minhasAtivas.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Suas publicações</p>
          {minhasAtivas.map(l => {
            const nProp=propostas.filter(p=>p.listagemId===l.id).length;
            return (
              <button key={l.id} onClick={()=>navTo("detalhes",l.id,"dashboard")} className="w-full flex items-center gap-3 py-3 border-b border-border last:border-0 text-left active:opacity-70">
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{backgroundColor:MAT[l.maturacao].cor}}/>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{nomeAlimento(l.alimento,alimentosBD)} · {fmtQtd(l.quantidadeG)}</p>
                  <p className="text-xs text-muted-foreground">{l.tipo==="oferta"?"Oferta":"Pedido"} · {nProp} proposta{nProp!==1?"s":""} · Até {fmtDateShort(l.prazo)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
              </button>
            );
          })}
        </div>
      )}

      {!pendingConfirmationId && proximosEncontros.length===0 && aguardandoResposta.length===0 && minhasAtivas.length===0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma atividade no momento.</p>
          <Btn onClick={()=>setView("listagens")} className="mt-4 mx-auto">Ver listagens disponíveis</Btn>
        </div>
      )}
    </div>
  );
}

// ─── LISTAGENS ────────────────────────────────────────────────────────────────

function ListagensView({ listagens, usuarios, alimentosBD, categorias, navTo }: {
  listagens: Listagem[]; usuarios: Usuario[]; alimentosBD: AlimentoBD[];
  categorias: CategoriaAlimento[]; navTo: (v: View, id: string, from: View)=>void;
}) {
  const [filtroTipo, setFiltroTipo] = useState<"todos"|TipoListagem>("todos");
  const [filtroAlimento, setFiltroAlimento] = useState("");
  const [filtroMat, setFiltroMat] = useState<""|Maturacao>("");
  const alimentosAtivos = alimentosBD.filter(a=>a.ativo);
  const filtered = listagens.filter(l => {
    if(l.status==="cancelada"||l.status==="concluida")return false;
    if(filtroTipo!=="todos"&&l.tipo!==filtroTipo)return false;
    if(filtroAlimento&&l.alimento!==filtroAlimento)return false;
    if(filtroMat&&l.maturacao!==filtroMat)return false;
    return true;
  });
  return (
    <div className="max-w-2xl md:max-w-5xl mx-auto">
      <div className="px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["todos","oferta","pedido"] as const).map(t=><button key={t} onClick={()=>setFiltroTipo(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors ${filtroTipo===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t==="todos"?"Todos":t==="oferta"?"Ofertas":"Pedidos"}</button>)}
          <select value={filtroAlimento} onChange={e=>setFiltroAlimento(e.target.value)} className="px-3 py-1.5 rounded-full border border-border bg-white text-xs text-foreground focus:outline-none flex-shrink-0">
            <option value="">Alimento</option>
            {alimentosAtivos.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <select value={filtroMat} onChange={e=>setFiltroMat(e.target.value as ""|Maturacao)} className="px-3 py-1.5 rounded-full border border-border bg-white text-xs text-foreground focus:outline-none flex-shrink-0">
            <option value="">Maturação</option>
            {(["verde","meio-maduro","maduro","muito-maduro"] as const).map(m=><option key={m} value={m}>{MAT[m].label}</option>)}
          </select>
        </div>
      </div>
      <div className="px-4 py-4">
        {filtered.length===0
          ? <div className="text-center py-16 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-3 opacity-20"/><p className="text-sm">Nenhuma publicação com esses filtros.</p></div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">{filtered.map(l=><ListagemCard key={l.id} l={l} usuarios={usuarios} alimentosBD={alimentosBD} onClick={()=>navTo("detalhes",l.id,"listagens")}/>)}</div>
        }
      </div>
    </div>
  );
}

// ─── NOVA LISTAGEM ─────────────────────────────────────────────────────────────

function NovaListagemView({ onSubmit, onBack, alimentosBD, categorias }: {
  onSubmit: (l: Partial<Listagem>)=>void; onBack: ()=>void;
  alimentosBD: AlimentoBD[]; categorias: CategoriaAlimento[];
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ tipo:"oferta" as TipoListagem, alimento:"", quantidade:"", unidade:"kg" as Unidade, maturacao:"" as ""|Maturacao, prazo:"", observacao:"", fotoUrl:"" });
  const [errors, setErrors] = useState<Errors>({});
  const alimentosAtivos = alimentosBD.filter(a=>a.ativo);
  const catsAtivas = categorias.filter(c=>c.ativa);

  function validateStep2(): boolean {
    const e: Errors = {};
    const qErr=validateQtd(form.quantidade); if(qErr)e.quantidade=qErr;
    if(!form.maturacao)e.maturacao="Selecione a maturação.";
    if(!form.prazo)e.prazo="Informe a data de validade da publicação.";
    setErrors(e); return Object.keys(e).length===0;
  }
  function submit() {
    const e: Errors = {};
    if(!form.fotoUrl)e.foto="A foto do lote é obrigatória.";
    if(form.observacao.length>140)e.observacao="Máximo 140 caracteres.";
    setErrors(e); if(Object.keys(e).length>0)return;
    const alim = alimentosBD.find(a=>a.id===form.alimento);
    onSubmit({ tipo:form.tipo, alimento:form.alimento, quantidadeG:toGrams(Number(form.quantidade),form.unidade), maturacao:form.maturacao as Maturacao, prazo:form.prazo, observacao:form.observacao||null, fotoUrl:form.fotoUrl || alim?.imagemUrl || null, status:"ativa" });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex gap-1.5 mb-6">{[1,2,3].map(s=><div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step>=s?"bg-primary":"bg-muted"}`}/>)}</div>
      {step===1 && (
        <div className="space-y-5">
          <h2 className="font-bold text-foreground text-lg">O que você quer publicar?</h2>
          <div className="flex gap-3">{(["oferta","pedido"] as const).map(t=><button key={t} type="button" onClick={()=>setForm(f=>({...f,tipo:t}))} className={`flex-1 py-4 rounded-xl border-2 text-sm font-bold transition-colors ${form.tipo===t?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>{t==="oferta"?"Tenho e ofereço":"Preciso e busco"}</button>)}</div>
          <Sel label="Qual alimento? *" value={form.alimento} error={errors.alimento} onChange={e=>{setForm(f=>({...f,alimento:e.target.value}));setErrors(er=>{const n={...er};delete n.alimento;return n;});}}>
            <option value="">Selecione</option>
            {catsAtivas.map(cat=><optgroup key={cat.id} label={cat.nome}>{alimentosAtivos.filter(a=>a.categoriaId===cat.id).map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</optgroup>)}
          </Sel>
          <Btn onClick={()=>{ if(!form.alimento){setErrors({alimento:"Selecione um alimento."});return;} setErrors({}); setStep(2); }} className="w-full">Próximo</Btn>
        </div>
      )}
      {step===2 && (
        <div className="space-y-5">
          <h2 className="font-bold text-foreground text-lg">Detalhes do lote</h2>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Quantidade *</p>
            <div className="flex gap-2">
              <input type="number" min="0" step="any" placeholder="Ex: 1,5" value={form.quantidade} onChange={e=>{setForm(f=>({...f,quantidade:e.target.value}));setErrors(er=>{const n={...er};delete n.quantidade;return n;});}} className={`flex-1 px-3 py-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition ${errors.quantidade?"border-[#E85D4E]":"border-border"}`}/>
              <select value={form.unidade} onChange={e=>setForm(f=>({...f,unidade:e.target.value as Unidade}))} className="px-4 py-3 rounded-lg border border-border bg-white text-sm focus:outline-none">
                <option value="kg">kg</option><option value="g">g</option>
              </select>
            </div>
            {errors.quantidade&&<p className="text-xs text-[#E85D4E] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.quantidade}</p>}
            {form.quantidade&&!errors.quantidade&&<p className="text-xs text-muted-foreground mt-1">Equivale a {fmtQtd(toGrams(Number(form.quantidade),form.unidade))}</p>}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Maturação *</p>
            <div className="grid grid-cols-2 gap-2">
              {(["verde","meio-maduro","maduro","muito-maduro"] as const).map(m=>(
                <button key={m} type="button" onClick={()=>{setForm(f=>({...f,maturacao:m}));setErrors(er=>{const n={...er};delete n.maturacao;return n;});}} className={`flex items-center gap-2.5 py-3 px-3 rounded-lg border-2 text-sm font-semibold transition-colors ${form.maturacao===m?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:MAT[m].cor}}/>{MAT[m].label}
                </button>
              ))}
            </div>
            {errors.maturacao&&<p className="text-xs text-[#E85D4E] mt-1">{errors.maturacao}</p>}
          </div>
          <Inp label="Disponível para propostas até *" type="date" value={form.prazo} min={TODAY} error={errors.prazo} onChange={e=>{setForm(f=>({...f,prazo:e.target.value}));setErrors(er=>{const n={...er};delete n.prazo;return n;});}}/>
          <div className="flex gap-3"><Btn variant="ghost" onClick={()=>setStep(1)}>Voltar</Btn><Btn onClick={()=>{ if(validateStep2())setStep(3); }} className="flex-1">Próximo</Btn></div>
        </div>
      )}
      {step===3 && (
        <div className="space-y-5">
          <h2 className="font-bold text-foreground text-lg">Foto e observação</h2>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Foto do lote *</p>
            <label className={`block w-full border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${form.fotoUrl?"border-primary bg-primary/5":errors.foto?"border-[#E85D4E]":"border-border"}`}>
              <input type="file" accept="image/*" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{setForm(f=>({...f,fotoUrl:String(reader.result)}));setErrors(er=>{const n={...er};delete n.foto;return n;});};reader.readAsDataURL(file);}}/>
              {form.fotoUrl?<img src={form.fotoUrl} alt="Pré-visualização do lote" className="h-40 w-full rounded-lg object-cover"/>:<div className="py-5"><ImagePlus className="w-8 h-8 text-muted-foreground mx-auto mb-2"/><p className="text-sm text-muted-foreground">Toque para escolher uma foto</p></div>}
            </label>
            {errors.foto&&<p className="text-xs text-[#E85D4E] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.foto}</p>}
          </div>
          <Txa label="Observação (opcional, máx. 140 caracteres)" placeholder="Detalhe curto sobre o lote..." maxLength={140} rows={3} value={form.observacao} error={errors.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/>
          {form.observacao&&<p className="text-xs text-muted-foreground text-right">{form.observacao.length}/140</p>}
          <div className="flex gap-3"><Btn variant="ghost" onClick={()=>setStep(2)}>Voltar</Btn><Btn onClick={submit} className="flex-1"><Check className="w-4 h-4"/>Publicar</Btn></div>
        </div>
      )}
    </div>
  );
}

// ─── CHAT VIEW ─────────────────────────────────────────────────────────────────

function ChatView({ rootPropostaId, mensagens, propostas, listagens, usuarios, user, alimentosBD, onSend, onBack }: {
  rootPropostaId: string; mensagens: Mensagem[]; propostas: Proposta[];
  listagens: Listagem[]; usuarios: Usuario[]; user: Usuario; alimentosBD: AlimentoBD[];
  onSend: (texto: string)=>void; onBack: ()=>void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const proposta = propostas.find(p => p.id === rootPropostaId);
  const listagem = proposta ? listagens.find(l => l.id === proposta.listagemId) : null;

  const todasProp = proposta ? propostas.filter(p => p.listagemId === proposta.listagemId) : [];
  const chain = buildChain(todasProp);

  const chatMsgs = mensagens.filter(m => m.rootPropostaId === rootPropostaId).sort((a,b)=>new Date(a.criadaEm).getTime()-new Date(b.criadaEm).getTime());

  // Merge messages and proposals into timeline
  type TimelineItem = { time: string } & ({ kind: "msg"; msg: Mensagem } | { kind: "proposta"; p: Proposta });
  const timeline: TimelineItem[] = [
    ...chatMsgs.map(m => ({ time: m.criadaEm, kind: "msg" as const, msg: m })),
    ...chain.map(p => ({ time: p.criadoEm, kind: "proposta" as const, p })),
  ].sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [timeline.length]);

  function sendMsg() {
    const t = input.trim(); if(!t) return;
    onSend(t); setInput("");
  }

  const contraparte = proposta?.proponenteId === user.id
    ? usuarios.find(u => u.id === listagem?.usuarioId)
    : usuarios.find(u => u.id === proposta?.proponenteId);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border bg-background flex items-center gap-3 flex-shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${contraparte?.tipo==="restaurante"?"bg-primary":"bg-[#E8A33D]"}`}>
          {contraparte?.nome.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{contraparte?.nome}</p>
          {listagem && <p className="text-xs text-muted-foreground">{nomeAlimento(listagem.alimento, alimentosBD)} · {fmtQtd(listagem.quantidadeG)}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {timeline.map((item, i) => {
          if (item.kind === "msg") {
            const m = item.msg;
            const isMe = m.autorId === user.id;
            const isSistema = m.tipo === "sistema";
            if (isSistema) return (
              <div key={m.id} className="flex justify-center">
                <div className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[85%] text-center">{m.texto}</div>
              </div>
            );
            const autor = usuarios.find(u => u.id === m.autorId);
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {!isMe && <p className="text-[10px] text-muted-foreground px-1">{autor?.responsavel.split(" ")[0]}</p>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    {m.texto}
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">{fmtHora(m.criadaEm)}</p>
                </div>
              </div>
            );
          }
          // Proposta card in timeline
          const p = item.p;
          const isMe = p.proponenteId === user.id;
          return (
            <div key={p.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] w-full">
                <div className={`border rounded-xl p-3 ${isMe ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Proposta v{p.versao}</p>
                    <StatusDot s={p.status}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-primary/5 rounded-lg p-2">
                      <p className="font-bold text-[10px] text-primary uppercase mb-1">Ofereço</p>
                      <p className="font-semibold text-foreground">{nomeAlimento(p.oferecem.alimento, alimentosBD)}</p>
                      <p className="text-muted-foreground">{fmtQtd(p.oferecem.quantidadeG)} · {MAT[p.oferecem.maturacao].label}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-[10px] text-muted-foreground uppercase mb-1">Peço</p>
                      <p className="font-semibold text-foreground">{nomeAlimento(p.querem.alimento, alimentosBD)}</p>
                      <p className="text-muted-foreground">{fmtQtd(p.querem.quantidadeG)} · {MAT[p.querem.maturacao].label}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-right">{fmtDT(p.criadoEm)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-background flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder="Mensagem..." rows={1} className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"/>
          <button onClick={sendMsg} disabled={!input.trim()} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"><Send className="w-4 h-4"/></button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Para negociar a proposta formal, use a tela de detalhes da publicação.</p>
      </div>
    </div>
  );
}

// ─── DETALHES ─────────────────────────────────────────────────────────────────

function DetalhesView({ listagemId, listagens, propostas, usuarios, user, encontros, alimentosBD, ocorrencias, onBack, onAddProposta, onUpdateListagem, onUpdateProposta, onRegistrarConfirmacao, onAgendarEncontro, onEditEncontro, onEditListagem, onEncerrarListagem, onReportarProblema, onOpenChat }: {
  listagemId: string; listagens: Listagem[]; propostas: Proposta[]; usuarios: Usuario[];
  user: Usuario; encontros: Encontro[]; alimentosBD: AlimentoBD[]; ocorrencias: OcorrenciaPos[];
  onBack: ()=>void; onAddProposta: (p: Partial<Proposta>)=>void;
  onUpdateListagem: (id: string, status: StatusListagem)=>void;
  onUpdateProposta: (id: string, u: Partial<Proposta>)=>void;
  onRegistrarConfirmacao: (propostaId: string, r: "aconteceu"|"nao-aconteceu", pesoG?: number)=>void;
  onAgendarEncontro: (propostaId: string, data: string, horario: string, local: string)=>void;
  onEditEncontro: (eId: string, data: string, horario: string, local: string)=>void;
  onEditListagem: (id: string, u: Partial<Listagem>)=>void;
  onEncerrarListagem: (id: string)=>void;
  onReportarProblema: (propostaId: string, listagemId: string, tipo: OcorrenciaPos["tipo"], descricao: string)=>void;
  onOpenChat: (rootPropostaId: string)=>void;
}) {
  const listagem = listagens.find(l => l.id === listagemId);
  const [showPForm, setShowPForm] = useState(false);
  const [showAgForm, setShowAgForm] = useState(false);
  const [showEeForm, setShowEeForm] = useState(false);
  const [showElForm, setShowElForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const [confirmResposta, setConfirmResposta] = useState<"aconteceu"|"nao-aconteceu"|"">("");
  const [pesoInput, setPesoInput] = useState("");
  const [pesoUnidade, setPesoUnidade] = useState<Unidade>("kg");
  const [checkEmbalagem, setCheckEmbalagem] = useState(false);
  const [checkContaminacao, setCheckContaminacao] = useState(false);

  const [pForm, setPForm] = useState({ modo:"equivalente" as "equivalente"|"quantidade"|"outro", alimento:"", quantidade:"", unidade:"kg" as Unidade, maturacao:"" as ""|Maturacao, observacao:"" });
  const [pErrors, setPErrors] = useState<Errors>({});
  const [agForm, setAgForm] = useState({ data:"", horario:"", local:"" });
  const [agErrors, setAgErrors] = useState<Errors>({});
  const [eeForm, setEeForm] = useState({ data:"", horario:"", local:"" });
  const [elForm, setElForm] = useState({ quantidade:"", unidade:"kg" as Unidade, maturacao:"" as ""|Maturacao, prazo:"", observacao:"" });
  const [elErrors, setElErrors] = useState<Errors>({});
  const [reportForm, setReportForm] = useState({ tipo:"qualidade" as OcorrenciaPos["tipo"], descricao:"" });
  const [reportErrors, setReportErrors] = useState<Errors>({});

  if (!listagem) return <div className="p-6 text-sm text-muted-foreground">Publicação não encontrada.</div>;

  const dono = usuarios.find(u => u.id === listagem.usuarioId);
  const euDono = user.id === listagem.usuarioId;
  const todasP = propostas.filter(p => p.listagemId === listagemId);
  const cadeia = buildChain(todasP);
  const ultima = cadeia[cadeia.length - 1];
  const euProponente = todasP.some(p => p.proponenteId === user.id);
  const envolvido = euDono || euProponente;

  const encontroAtual = ultima ? encontros.find(e => e.propostaId === ultima.id) : null;
  const confirmacaoPendente = ultima ? isConfirmacaoPendente(ultima, encontros) : false;
  const euJaConfirmei = ultima?.confirmacoes.some(c => c.usuarioId === user.id) ?? false;
  const outraJaConfirmou = ultima?.confirmacoes.some(c => c.usuarioId !== user.id) ?? false;
  const aguardandoMinha = confirmacaoPendente && envolvido && !euJaConfirmei;
  const aguardandoOutra = confirmacaoPendente && envolvido && euJaConfirmei && !outraJaConfirmou;

  const rootProposta = cadeia[0];
  const podeVerChat = !!rootProposta && envolvido;

  const pesoG = pesoInput ? toGrams(Number(pesoInput), pesoUnidade) : 0;
  const pesoAcordadoG = ultima?.oferecem.quantidadeG ?? 0;
  const difG = pesoG - pesoAcordadoG;
  const difPct = pesoAcordadoG > 0 ? Math.abs(difG/pesoAcordadoG)*100 : 0;
  const foraTolerancia = pesoG > 0 && difPct > 5;

  const cats = [...new Set(alimentosBD.filter(a=>a.ativo).map(a=>a.categoriaId))];

  function submitProposta() {
    const e: Errors = {};
    if(pForm.modo!=="equivalente"&&!pForm.alimento)e.alimento="Selecione um alimento.";
    const quantidadeG=pForm.modo==="equivalente"?listagem.quantidadeG:toGrams(Number(pForm.quantidade),pForm.unidade);
    if(pForm.modo!=="equivalente"){const qErr=validateQtd(pForm.quantidade);if(qErr)e.quantidade=qErr;if(quantidadeG>listagem.quantidadeG*1.2)e.quantidade="A quantidade pode ser no máximo 20% maior que a publicação.";}
    if(pForm.modo!=="equivalente"&&!pForm.maturacao)e.maturacao="Selecione a maturação.";
    setPErrors(e); if(Object.keys(e).length>0)return;
    const pai=cadeia.length>0?ultima.id:null;
    onAddProposta({ listagemId, propostaPaiId:pai, versao:cadeia.length+1, proponenteId:user.id, oferecem:{alimento:pForm.modo==="equivalente"?listagem.alimento:pForm.alimento,quantidadeG,maturacao:pForm.modo==="equivalente"?listagem.maturacao:pForm.maturacao as Maturacao,observacao:pForm.observacao||null}, querem:{alimento:listagem.alimento,quantidadeG:listagem.quantidadeG,maturacao:listagem.maturacao,observacao:null} });
    setShowPForm(false); setPForm({modo:"equivalente",alimento:"",quantidade:"",unidade:"kg",maturacao:"",observacao:""});
  }

  function submitAgendamento() {
    const e: Errors = {};
    if(!agForm.data)e.data="Informe a data."; if(!agForm.horario)e.horario="Informe o horário."; if(!agForm.local.trim())e.local="Informe o local.";
    setAgErrors(e); if(Object.keys(e).length>0)return;
    onAgendarEncontro(ultima!.id,agForm.data,agForm.horario,agForm.local.trim());
    setShowAgForm(false); setAgForm({data:"",horario:"",local:""});
  }

  function submitEditEncontro() {
    if(!encontroAtual)return;
    onEditEncontro(encontroAtual.id, eeForm.data||encontroAtual.data, eeForm.horario||encontroAtual.horario, eeForm.local||encontroAtual.local);
    setShowEeForm(false);
  }

  function submitEditListagem() {
    const e: Errors = {};
    if(elForm.quantidade){const qErr=validateQtd(elForm.quantidade);if(qErr)e.quantidade=qErr;}
    if(!elForm.prazo&&!listagem.prazo)e.prazo="Informe a data.";
    setElErrors(e); if(Object.keys(e).length>0)return;
    onEditListagem(listagemId,{ quantidadeG:elForm.quantidade?toGrams(Number(elForm.quantidade),elForm.unidade):listagem.quantidadeG, maturacao:(elForm.maturacao as Maturacao)||listagem.maturacao, prazo:elForm.prazo||listagem.prazo, observacao:elForm.observacao!==undefined?(elForm.observacao||null):listagem.observacao });
    setShowElForm(false);
  }

  function submitConfirm() {
    if(!confirmResposta)return;
    if(confirmResposta==="aconteceu"&&(!checkEmbalagem||!checkContaminacao))return;
    const peso=confirmResposta==="aconteceu"&&pesoInput?pesoG:undefined;
    onRegistrarConfirmacao(ultima!.id,confirmResposta,peso);
    setShowConfirmModal(false); setConfirmResposta(""); setPesoInput(""); setCheckEmbalagem(false); setCheckContaminacao(false);
  }

  function submitReport() {
    const e: Errors = {};
    if(!reportForm.descricao.trim())e.descricao="Descreva o problema.";
    setReportErrors(e); if(Object.keys(e).length>0)return;
    onReportarProblema(ultima!.id, listagemId, reportForm.tipo, reportForm.descricao.trim());
    setShowReportForm(false); setReportForm({tipo:"qualidade",descricao:""});
  }

  function displayLabel(p: Proposta): string {
    return isConfirmacaoPendente(p,encontros)?"Confirmação pendente":STATUS_LABEL[p.status];
  }

  const alimentosAtivos = alimentosBD.filter(a=>a.ativo);

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto">
      {listagem.fotoUrl && (
        <div className="h-52 md:h-64 overflow-hidden bg-muted relative">
          <img src={listagem.fotoUrl} alt={nomeAlimento(listagem.alimento, alimentosBD)} className="w-full h-full object-cover"/>
          <div className="absolute top-0 inset-x-0 h-2" style={{backgroundColor:MAT[listagem.maturacao].cor}}/>
        </div>
      )}
      {!listagem.fotoUrl && <div className="h-2" style={{backgroundColor:MAT[listagem.maturacao].cor}}/>}
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{color:listagem.tipo==="oferta"?"#2F6B5E":"#B87A00"}}>{listagem.tipo}</p><h1 className="text-2xl font-black text-foreground break-words">{nomeAlimento(listagem.alimento, alimentosBD)}</h1></div>
            <div className="text-left sm:text-right"><p className="text-2xl font-black text-foreground whitespace-nowrap">{fmtQtd(listagem.quantidadeG)}</p><p className="text-xs text-muted-foreground mt-1">{MAT[listagem.maturacao].label}</p></div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span>Disponível até {fmtDate(listagem.prazo)}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{dono?.endereco}</span>
          </div>
          {listagem.observacao && <p className="text-sm text-muted-foreground mt-3 bg-muted rounded-lg px-3 py-2">{listagem.observacao}</p>}
        </div>

        {/* Owner actions */}
        {euDono && (listagem.status==="ativa"||listagem.status==="em-negociacao") && (
          <div className="flex gap-2 flex-wrap">
            <Btn size="sm" variant="secondary" onClick={()=>{ setElForm({quantidade:"",unidade:"kg",maturacao:listagem.maturacao,prazo:listagem.prazo,observacao:listagem.observacao??""});setShowElForm(true); }}><Pencil className="w-3.5 h-3.5"/>Editar</Btn>
            <Btn size="sm" variant="ghost" className="text-muted-foreground" onClick={()=>{ if(window.confirm("Encerrar esta publicação?"))onEncerrarListagem(listagemId); }}>Encerrar</Btn>
          </div>
        )}

        {/* Edit listagem */}
        {showElForm && (
          <div className="border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between"><p className="font-bold text-foreground">Editar publicação</p><button onClick={()=>setShowElForm(false)}><X className="w-4 h-4 text-muted-foreground"/></button></div>
            <div><p className="text-sm font-semibold text-foreground mb-1.5">Nova quantidade</p><div className="flex gap-2"><input type="number" min="0" step="any" placeholder={`Atual: ${fmtQtd(listagem.quantidadeG)}`} value={elForm.quantidade} onChange={e=>setElForm(f=>({...f,quantidade:e.target.value}))} className={`flex-1 px-3 py-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${elErrors.quantidade?"border-[#E85D4E]":"border-border"}`}/><select value={elForm.unidade} onChange={e=>setElForm(f=>({...f,unidade:e.target.value as Unidade}))} className="px-3 py-3 rounded-lg border border-border bg-white text-sm focus:outline-none"><option value="kg">kg</option><option value="g">g</option></select></div>{elErrors.quantidade&&<p className="text-xs text-[#E85D4E] mt-1">{elErrors.quantidade}</p>}</div>
            <div><p className="text-sm font-semibold text-foreground mb-1.5">Maturação</p><div className="grid grid-cols-2 gap-2">{(["verde","meio-maduro","maduro","muito-maduro"] as const).map(m=><button key={m} type="button" onClick={()=>setElForm(f=>({...f,maturacao:m}))} className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${elForm.maturacao===m?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}><span className="w-2 h-2 rounded-full" style={{backgroundColor:MAT[m].cor}}/>{MAT[m].label}</button>)}</div></div>
            <Inp label="Nova data de validade" type="date" value={elForm.prazo} min={TODAY} error={elErrors.prazo} onChange={e=>setElForm(f=>({...f,prazo:e.target.value}))}/>
            <Txa label="Observação" placeholder="Observação sobre o lote..." rows={2} maxLength={140} value={elForm.observacao} onChange={e=>setElForm(f=>({...f,observacao:e.target.value}))}/>
            <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setShowElForm(false)}>Cancelar</Btn><Btn className="flex-1" onClick={submitEditListagem}><Check className="w-4 h-4"/>Salvar</Btn></div>
          </div>
        )}

        {/* Dono + Chat */}
        <div className="flex items-center justify-between py-3 border-y border-border">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${dono?.tipo==="restaurante"?"bg-primary":"bg-[#E8A33D]"}`}>{dono?.fotoUrl?<img src={dono.fotoUrl} alt={dono.nome} className="w-full h-full object-cover"/>:dono?.nome.charAt(0)}</div>
            <div className="min-w-0"><p className="text-sm font-semibold text-foreground truncate">{dono?.nome}</p><p className="text-xs text-muted-foreground truncate">{dono?.responsavel} · {dono?.horario}</p></div>
          </div>
          {podeVerChat && (
            <Btn size="sm" variant="secondary" onClick={()=>onOpenChat(rootProposta.id)}>
              <MessageSquare className="w-3.5 h-3.5"/>Chat
            </Btn>
          )}
        </div>

        {/* Encontro agendado */}
        {ultima?.status==="encontro-agendado" && encontroAtual && !confirmacaoPendente && (
          <div className="bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CalendarCheck className="w-5 h-5 text-[#E8A33D] flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs font-bold text-[#B87A00] uppercase tracking-widest mb-1">Encontro agendado</p>
                  <p className="text-sm font-semibold text-foreground">{new Date(encontroAtual.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</p>
                  <p className="text-sm text-muted-foreground">{encontroAtual.horario} · {encontroAtual.local}</p>
                  <p className="text-xs text-muted-foreground mt-2">Após o encontro, volte para confirmar se a troca aconteceu.</p>
                </div>
              </div>
              {envolvido && <button onClick={()=>{ setEeForm({data:encontroAtual.data,horario:encontroAtual.horario,local:encontroAtual.local});setShowEeForm(true); }} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"><Pencil className="w-3 h-3"/>Editar</button>}
            </div>
          </div>
        )}
        {showEeForm && encontroAtual && (
          <div className="border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between"><p className="font-bold text-foreground">Editar encontro</p><button onClick={()=>setShowEeForm(false)}><X className="w-4 h-4 text-muted-foreground"/></button></div>
            <Inp label="Nova data" type="date" value={eeForm.data} min={TODAY} onChange={e=>setEeForm(f=>({...f,data:e.target.value}))}/>
            <Inp label="Novo horário" type="time" value={eeForm.horario} onChange={e=>setEeForm(f=>({...f,horario:e.target.value}))}/>
            <Inp label="Local" value={eeForm.local} onChange={e=>setEeForm(f=>({...f,local:e.target.value}))}/>
            <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setShowEeForm(false)}>Cancelar</Btn><Btn className="flex-1" onClick={submitEditEncontro}><Check className="w-4 h-4"/>Salvar</Btn></div>
          </div>
        )}

        {/* Confirmação pendente */}
        {aguardandoMinha && encontroAtual && (
          <div className="bg-[#E85D4E]/10 border border-[#E85D4E]/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#E85D4E] flex-shrink-0 mt-0.5"/>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">A troca aconteceu?</p>
                <p className="text-xs text-muted-foreground mt-1">Encontro previsto para {fmtDateShort(encontroAtual.data)} às {encontroAtual.horario}. Informe o que aconteceu.</p>
                <Btn variant="danger" size="sm" className="mt-3" onClick={()=>setShowConfirmModal(true)}>Responder agora</Btn>
              </div>
            </div>
          </div>
        )}
        {aguardandoOutra && <div className="bg-muted rounded-xl p-4 flex items-center gap-3"><Timer className="w-5 h-5 text-[#E8A33D] flex-shrink-0"/><div><p className="text-sm font-semibold text-foreground">Sua confirmação foi registrada.</p><p className="text-xs text-muted-foreground">Aguardando a resposta da outra parte.</p></div></div>}

        {/* Report problem */}
        {ultima && ["concluido","divergencia","nao-compareceu"].includes(ultima.status) && envolvido && !ocorrencias.some(o=>o.propostaId===ultima.id&&o.usuarioId===user.id) && (
          <div>
            {!showReportForm
              ? <button onClick={()=>setShowReportForm(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-[#E85D4E] transition-colors"><Flag className="w-3.5 h-3.5"/>Reportar problema nesta troca</button>
              : (
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between"><p className="font-bold text-foreground text-sm">Reportar problema</p><button onClick={()=>setShowReportForm(false)}><X className="w-4 h-4 text-muted-foreground"/></button></div>
                  <Sel label="Tipo de problema" value={reportForm.tipo} onChange={e=>setReportForm(f=>({...f,tipo:e.target.value as OcorrenciaPos["tipo"]}))}>
                    <option value="qualidade">Qualidade do alimento</option>
                    <option value="quantidade">Quantidade incorreta</option>
                    <option value="diferente-anunciado">Diferente do anunciado</option>
                    <option value="outro">Outro</option>
                  </Sel>
                  <Txa label="Descrição *" placeholder="Descreva o problema..." rows={3} value={reportForm.descricao} error={reportErrors.descricao} onChange={e=>setReportForm(f=>({...f,descricao:e.target.value}))}/>
                  <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setShowReportForm(false)}>Cancelar</Btn><Btn variant="danger" className="flex-1" onClick={submitReport}><Flag className="w-3.5 h-3.5"/>Enviar</Btn></div>
                </div>
              )}
          </div>
        )}

        {/* Proposal chain */}
        {cadeia.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Histórico da negociação</p>
            <div className="relative space-y-4">
              {cadeia.length>1&&<div className="absolute left-[11px] top-6 bottom-6 w-px bg-border"/>}
              {cadeia.map((p,i) => {
                const proponente=usuarios.find(u=>u.id===p.proponenteId);
                const isMe=p.proponenteId===user.id;
                const isUlt=i===cadeia.length-1;
                const ativo=["proposto","contraproposto"].includes(p.status);
                const canAct=isUlt&&!isMe&&envolvido&&ativo&&listagem.status!=="cancelada";
                const canSched=isUlt&&envolvido&&p.status==="aceito"&&!encontroAtual;
                const lbl=displayLabel(p);
                return (
                  <div key={p.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 bg-card" style={{borderColor:p.status==="concluido"?"#2F6B5E":isUlt&&ativo?"#E8A33D":"#e5e7eb"}}>
                        {p.status==="concluido"?<Check className="w-2.5 h-2.5 text-[#2F6B5E]"/>:<span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:STATUS_COR[p.status]}}/>}
                      </div>
                    </div>
                    <div className={`flex-1 pb-2 ${isUlt&&ativo?"border border-[#E8A33D]/40 rounded-xl p-3 bg-[#E8A33D]/5":""}`}>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div><span className="text-xs font-semibold text-foreground">{isMe?"Você":proponente?.nome}</span><span className="text-xs text-muted-foreground ml-2">{fmtDT(p.criadoEm)}</span></div>
                        <StatusDot s={p.status} label={lbl}/>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-primary/5 rounded-lg p-3"><p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5">Ofereço</p><p className="font-extrabold text-foreground text-sm">{nomeAlimento(p.oferecem.alimento,alimentosBD)}</p><p className="text-base font-black text-foreground">{fmtQtd(p.oferecem.quantidadeG)}</p><div className="flex items-center gap-1 mt-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:MAT[p.oferecem.maturacao].cor}}/><span className="text-xs text-muted-foreground">{MAT[p.oferecem.maturacao].label}</span></div>{p.oferecem.observacao&&<p className="text-xs text-muted-foreground mt-1 italic">{p.oferecem.observacao}</p>}</div>
                        <div className="bg-muted rounded-lg p-3"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Peço</p><p className="font-extrabold text-foreground text-sm">{nomeAlimento(p.querem.alimento,alimentosBD)}</p><p className="text-base font-black text-foreground">{fmtQtd(p.querem.quantidadeG)}</p><div className="flex items-center gap-1 mt-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:MAT[p.querem.maturacao].cor}}/><span className="text-xs text-muted-foreground">{MAT[p.querem.maturacao].label}</span></div></div>
                      </div>
                      {p.confirmacoes.length>0&&(
                        <div className="mb-3 space-y-1">
                          {p.confirmacoes.map(c=>{ const cu=usuarios.find(x=>x.id===c.usuarioId); return (
                            <div key={c.usuarioId} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${c.resposta==="aconteceu"?"bg-green-50 text-green-700":"bg-red-50 text-[#E85D4E]"}`}>
                              {c.resposta==="aconteceu"?<ThumbsUp className="w-3 h-3"/>:<ThumbsDown className="w-3 h-3"/>}
                              <span className="font-semibold">{c.usuarioId===user.id?"Você":cu?.responsavel.split(" ")[0]}</span>
                              <span>{c.resposta==="aconteceu"?"confirmou que aconteceu":"disse que não aconteceu"}</span>
                              {c.pesoG&&<span className="text-muted-foreground">· {fmtQtd(c.pesoG)}</span>}
                              <span className="text-muted-foreground ml-auto">{fmtDT(c.criadaEm)}</span>
                            </div>
                          ); })}
                        </div>
                      )}
                      {p.status==="concluido"&&<div className="flex items-center gap-2 text-xs text-[#2F6B5E] bg-teal-50 rounded-lg px-3 py-2 mb-2"><CheckCircle2 className="w-3.5 h-3.5"/>Troca concluída.</div>}
                      {p.status==="nao-compareceu"&&<div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-2"><X className="w-3.5 h-3.5"/>Encontro não realizado.</div>}
                      {p.status==="divergencia"&&<div className="flex items-center gap-2 text-xs text-[#E85D4E] bg-red-50 rounded-lg px-3 py-2 mb-2"><AlertTriangle className="w-3.5 h-3.5"/>Respostas divergentes. Em análise pelo administrador.</div>}
                      <div className="flex flex-wrap gap-2">
                        {canAct&&<><Btn size="sm" onClick={()=>{ onUpdateProposta(p.id,{status:"aceito"}); onUpdateListagem(listagemId,"em-negociacao"); }}><Check className="w-3.5 h-3.5"/>Aceitar</Btn><Btn size="sm" variant="outline" onClick={()=>setShowPForm(true)}>Contrapropor</Btn><Btn size="sm" variant="ghost" className="text-muted-foreground" onClick={()=>onUpdateProposta(p.id,{status:"cancelado"})}>Recusar</Btn></>}
                        {canSched&&<Btn size="sm" variant="secondary" onClick={()=>setShowAgForm(true)}><CalendarCheck className="w-3.5 h-3.5"/>Registrar encontro</Btn>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Proposal form */}
        {!euDono && (cadeia.length===0||showPForm) && listagem.status==="ativa" && (
          showPForm ? (
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between"><p className="font-bold text-foreground">{cadeia.length>0?"Contraproposta":"Proposta de troca"}</p><button onClick={()=>setShowPForm(false)}><X className="w-4 h-4 text-muted-foreground"/></button></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><button type="button" onClick={()=>setPForm(f=>({...f,modo:"equivalente",alimento:listagem.alimento,quantidade:""}))} className={`p-3 rounded-lg border text-left text-xs font-semibold ${pForm.modo==="equivalente"?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>Troca equivalente<p className="font-normal mt-1">Mesmo alimento e peso</p></button><button type="button" onClick={()=>setPForm(f=>({...f,modo:"quantidade"}))} className={`p-3 rounded-lg border text-left text-xs font-semibold ${pForm.modo==="quantidade"?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>Ajustar peso<p className="font-normal mt-1">Até 20% a mais</p></button><button type="button" onClick={()=>setPForm(f=>({...f,modo:"outro"}))} className={`p-3 rounded-lg border text-left text-xs font-semibold ${pForm.modo==="outro"?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>Outro alimento<p className="font-normal mt-1">Escolha o que oferecer</p></button></div>
              <div className="bg-primary/5 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Eu ofereço</p>
                {pForm.modo!=="equivalente"&&<Sel value={pForm.alimento} error={pErrors.alimento} onChange={e=>{setPForm(f=>({...f,alimento:e.target.value}));setPErrors(er=>{const n={...er};delete n.alimento;return n;});}}>
                  <option value="">Selecione o alimento</option>
                  {cats.map(catId=>{ const cat=INIT_CATEGORIAS.find(c=>c.id===catId); return <optgroup key={catId} label={cat?.nome??catId}>{alimentosAtivos.filter(a=>a.categoriaId===catId).map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</optgroup>; })}
                </Sel>}
                {pForm.modo!=="equivalente"&&<div className="flex gap-2">
                  <input type="number" min="0" step="any" placeholder="Quantidade" value={pForm.quantidade} onChange={e=>{setPForm(f=>({...f,quantidade:e.target.value}));setPErrors(er=>{const n={...er};delete n.quantidade;return n;});}} className={`flex-1 px-3 py-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${pErrors.quantidade?"border-[#E85D4E]":"border-border"}`}/>
                  <select value={pForm.unidade} onChange={e=>setPForm(f=>({...f,unidade:e.target.value as Unidade}))} className="px-3 py-3 rounded-lg border border-border bg-white text-sm focus:outline-none"><option value="kg">kg</option><option value="g">g</option></select>
                </div>}
                {pErrors.quantidade&&<p className="text-xs text-[#E85D4E]">{pErrors.quantidade}</p>}
                <p className="text-xs text-muted-foreground">{pForm.modo==="equivalente"?`Equivalente a ${fmtQtd(listagem.quantidadeG)}`:pForm.quantidade?`Equivale a ${fmtQtd(toGrams(Number(pForm.quantidade),pForm.unidade))}. Limite: ${fmtQtd(Math.round(listagem.quantidadeG*1.2))}`:"Informe o peso desejado"}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["verde","meio-maduro","maduro","muito-maduro"] as const).map(m=><button key={m} type="button" onClick={()=>setPForm(f=>({...f,maturacao:m}))} className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${pForm.maturacao===m?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}><span className="w-2 h-2 rounded-full" style={{backgroundColor:MAT[m].cor}}/>{MAT[m].label}</button>)}
                </div>
                {pErrors.maturacao&&<p className="text-xs text-[#E85D4E]">{pErrors.maturacao}</p>}
                <Inp placeholder="Observação (opcional)" value={pForm.observacao} onChange={e=>setPForm(f=>({...f,observacao:e.target.value}))}/>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Peço em troca</p>
                <p className="font-extrabold text-foreground">{nomeAlimento(listagem.alimento,alimentosBD)}</p>
                <p className="text-sm text-muted-foreground">{pForm.quantidade?fmtQtd(toGrams(Number(pForm.quantidade),pForm.unidade)):"Mesmo peso que você oferecer"} · {MAT[listagem.maturacao].label}</p>
              </div>
              <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setShowPForm(false)}>Cancelar</Btn><Btn onClick={submitProposta} className="flex-1">Enviar</Btn></div>
            </div>
          ) : (
            <Btn onClick={()=>setShowPForm(true)} className="w-full" size="lg"><Plus className="w-4 h-4"/>Propor troca</Btn>
          )
        )}

        {/* Agendamento */}
        {showAgForm && (
          <div className="border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between"><p className="font-bold text-foreground">Registrar encontro</p><button onClick={()=>setShowAgForm(false)}><X className="w-4 h-4 text-muted-foreground"/></button></div>
            <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">Combine os detalhes no chat e registre aqui para confirmar a troca depois.</p>
            <Inp label="Data *" type="date" value={agForm.data} min={TODAY} error={agErrors.data} onChange={e=>{setAgForm(f=>({...f,data:e.target.value}));setAgErrors(er=>{const n={...er};delete n.data;return n;});}}/>
            <Inp label="Horário *" type="time" value={agForm.horario} error={agErrors.horario} onChange={e=>{setAgForm(f=>({...f,horario:e.target.value}));setAgErrors(er=>{const n={...er};delete n.horario;return n;});}}/>
            <Inp label="Local *" placeholder="Ex: Rua Nova, Setor C, barraca 23" value={agForm.local} maxLength={200} error={agErrors.local} onChange={e=>{setAgForm(f=>({...f,local:e.target.value}));setAgErrors(er=>{const n={...er};delete n.local;return n;});}}/>
            <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setShowAgForm(false)}>Cancelar</Btn><Btn className="flex-1" onClick={submitAgendamento}><CalendarCheck className="w-4 h-4"/>Registrar</Btn></div>
          </div>
        )}

        {euDono && cadeia.length===0 && <div className="text-center py-4 text-sm text-muted-foreground">Esta é a sua publicação. Aguarde propostas.</div>}
      </div>

      {/* Confirm modal */}
      {showConfirmModal && ultima && encontroAtual && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-5 space-y-4">
            <div><h3 className="font-bold text-foreground">A troca aconteceu?</h3><p className="text-xs text-muted-foreground mt-1">Encontro de {fmtDateShort(encontroAtual.data)} às {encontroAtual.horario}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setConfirmResposta("aconteceu")} className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${confirmResposta==="aconteceu"?"border-green-500 bg-green-50 text-green-700":"border-border text-muted-foreground"}`}><ThumbsUp className="w-6 h-6"/><span className="text-sm font-bold">Aconteceu</span></button>
              <button onClick={()=>setConfirmResposta("nao-aconteceu")} className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${confirmResposta==="nao-aconteceu"?"border-[#E85D4E] bg-red-50 text-[#E85D4E]":"border-border text-muted-foreground"}`}><ThumbsDown className="w-6 h-6"/><span className="text-sm font-bold">Não aconteceu</span></button>
            </div>
            {confirmResposta==="aconteceu" && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1.5">Peso que você recebeu (opcional)</p>
                  <div className="flex gap-2">
                    <input type="number" step="any" min="0" placeholder={`Acordado: ${fmtQtd(pesoAcordadoG)}`} value={pesoInput} onChange={e=>setPesoInput(e.target.value)} className="flex-1 px-3 py-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                    <select value={pesoUnidade} onChange={e=>setPesoUnidade(e.target.value as Unidade)} className="px-3 py-3 rounded-lg border border-border bg-white text-sm focus:outline-none"><option value="kg">kg</option><option value="g">g</option></select>
                  </div>
                  {pesoG>0&&(
                    <div className={`mt-2 rounded-lg p-3 text-xs space-y-1 ${foraTolerancia?"bg-red-50 border border-red-200":"bg-teal-50 border border-teal-200"}`}>
                      <div className="flex justify-between text-muted-foreground"><span>Acordado</span><span className="font-semibold">{fmtQtd(pesoAcordadoG)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Recebido</span><span className="font-semibold">{fmtQtd(pesoG)}</span></div>
                      <div className={`flex justify-between font-semibold ${foraTolerancia?"text-[#E85D4E]":"text-[#2F6B5E]"}`}><span>Diferença</span><span>{difG>0?"+":""}{fmtQtd(Math.abs(difG))} ({difPct.toFixed(1)}%)</span></div>
                      {foraTolerancia&&<p className="flex items-center gap-1 text-[#E85D4E] pt-1"><AlertCircle className="w-3 h-3"/>Acima de 5% de tolerância.</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {[{k:"embalagem",l:"Produtos embalados adequadamente"},{k:"contaminacao",l:"Sem sinais de contaminação"}].map(item=>(
                    <label key={item.k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={item.k==="embalagem"?checkEmbalagem:checkContaminacao} onChange={e=>item.k==="embalagem"?setCheckEmbalagem(e.target.checked):setCheckContaminacao(e.target.checked)} className="w-4 h-4 accent-primary"/>
                      <span className="text-sm text-foreground">{item.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={()=>setShowConfirmModal(false)}>Cancelar</Btn>
              <Btn className="flex-1" disabled={!confirmResposta||(confirmResposta==="aconteceu"&&(!checkEmbalagem||!checkContaminacao))} onClick={submitConfirm}><Check className="w-4 h-4"/>Confirmar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MINHAS TROCAS ─────────────────────────────────────────────────────────────

function MinhasTrocasView({ user, listagens, propostas, usuarios, encontros, alimentosBD, navTo }: {
  user: Usuario; listagens: Listagem[]; propostas: Proposta[]; usuarios: Usuario[];
  encontros: Encontro[]; alimentosBD: AlimentoBD[];
  navTo: (v: View, id: string, from: View)=>void;
}) {
  type Ev = { id: string; data: string; listagemId: string; descricao: string; detalhe: string; cor: string };
  const eventos: Ev[] = [];
  listagens.filter(l=>l.usuarioId===user.id).forEach(l=>{ eventos.push({ id:l.id, data:l.criadoEm, listagemId:l.id, descricao:`${l.tipo==="oferta"?"Oferta":"Pedido"} publicado`, detalhe:`${nomeAlimento(l.alimento,alimentosBD)} · ${fmtQtd(l.quantidadeG)} · até ${fmtDateShort(l.prazo)}`, cor:l.status==="concluida"?"#22c55e":l.status==="em-negociacao"?"#3b82f6":"#2F6B5E" }); });
  propostas.filter(p=>{ const l=listagens.find(x=>x.id===p.listagemId); return p.proponenteId===user.id||l?.usuarioId===user.id; }).forEach(p=>{
    const l=listagens.find(x=>x.id===p.listagemId);
    const outro=p.proponenteId===user.id?usuarios.find(u=>u.id===l?.usuarioId):usuarios.find(u=>u.id===p.proponenteId);
    const pendente=isConfirmacaoPendente(p,encontros);
    const label=pendente?"Confirmação pendente":STATUS_LABEL[p.status];
    const cor=pendente?"#E85D4E":STATUS_COR[p.status];
    eventos.push({ id:p.id, data:p.criadoEm, listagemId:p.listagemId, descricao:label, detalhe:`${nomeAlimento(p.oferecem.alimento,alimentosBD)} ${fmtQtd(p.oferecem.quantidadeG)} por ${nomeAlimento(p.querem.alimento,alimentosBD)} · ${outro?.nome??""}`, cor });
  });
  eventos.sort((a,b)=>new Date(b.data).getTime()-new Date(a.data).getTime());
  const grupos: Record<string,Ev[]> = {};
  eventos.forEach(e=>{ const d=new Date(e.data).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); if(!grupos[d])grupos[d]=[]; grupos[d].push(e); });
  if(eventos.length===0)return(<div className="px-4 py-16 text-center text-muted-foreground max-w-lg mx-auto"><RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20"/><p className="text-sm">Nenhuma atividade ainda.</p></div>);
  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-5">
      {Object.entries(grupos).map(([data,evs])=>(
        <div key={data} className="mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{data}</p>
          <div className="relative space-y-0"><div className="absolute left-[7px] top-2 bottom-2 w-px bg-border"/>
            {evs.map(ev=>(
              <button key={ev.id} onClick={()=>navTo("detalhes",ev.listagemId,"minhas-trocas")} className="w-full text-left flex gap-4 py-3 active:opacity-70">
                <div className="flex flex-col items-center flex-shrink-0 pt-1"><div className="w-3.5 h-3.5 rounded-full z-10 border-2 border-card" style={{backgroundColor:ev.cor}}/></div>
                <div className="flex-1 min-w-0 pb-3 border-b border-border last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{fmtHora(ev.data)}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{ev.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.detalhe}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1"/>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────

function AdminView({ tab, setTab, usuarios, listagens, propostas, encontros, ocorrencias, alimentosBD, categorias, onApprove, onRejectWithReason, onBlock, onUnblock, onDeleteUser, onRemoveListing, onAddAlimento, onEditAlimento, onToggleAlimento, onAddCategoria, onEditCategoria, onToggleCategoria }: {
  tab: AdminTab; setTab: (t: AdminTab)=>void;
  usuarios: Usuario[]; listagens: Listagem[]; propostas: Proposta[];
  encontros: Encontro[]; ocorrencias: OcorrenciaPos[];
  alimentosBD: AlimentoBD[]; categorias: CategoriaAlimento[];
  onApprove: (id: string)=>void; onRejectWithReason: (id: string, m: string)=>void;
  onBlock: (id: string, m: string)=>void; onUnblock: (id: string)=>void;
  onDeleteUser: (id: string)=>void; onRemoveListing: (id: string)=>void;
  onAddAlimento: (nome: string, catId: string)=>void;
  onEditAlimento: (id: string, nome: string, catId: string, imgUrl: string)=>void;
  onToggleAlimento: (id: string)=>void;
  onAddCategoria: (nome: string)=>void;
  onEditCategoria: (id: string, nome: string)=>void;
  onToggleCategoria: (id: string)=>void;
}) {
  type ModalAct = { type: "reject"|"block"|"delete-user"|"remove-listing"; targetId: string }|null;
  const [modal, setModal] = useState<ModalAct>(null);
  const [reason, setReason] = useState("");
  const [editingAlimento, setEditingAlimento] = useState<string|null>(null);
  const [alimentoForm, setAlimentoForm] = useState({ nome:"", catId:"", imgUrl:"" });
  const [novoAlimento, setNovoAlimento] = useState({ nome:"", catId:"" });
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editingCategoria, setEditingCategoria] = useState<string|null>(null);
  const [catEditNome, setCatEditNome] = useState("");
  const [paginaConfirmacoes, setPaginaConfirmacoes] = useState(0);

  const pendentes=usuarios.filter(u=>u.status==="pendente");
  const aprovados=usuarios.filter(u=>u.status==="aprovado"&&u.id!=="admin");
  const bloqueados=usuarios.filter(u=>u.status==="bloqueado");
  const rejeitados=usuarios.filter(u=>u.status==="rejeitado");
  const divergencias=propostas.filter(p=>p.status==="divergencia");
  const confirmacoesPendentes=propostas.filter(p=>isConfirmacaoPendente(p,encontros)&&p.confirmacoes.length<2);
  const encontrosAgendados=encontros.filter(e=>{ const p=propostas.find(x=>x.id===e.propostaId); return p?.status==="encontro-agendado"; });
  const confirmacoesPorPagina = 3;
  const totalPaginasConfirmacoes = Math.max(1, Math.ceil(confirmacoesPendentes.length / confirmacoesPorPagina));
  const paginaAtualConfirmacoes = Math.min(paginaConfirmacoes, totalPaginasConfirmacoes - 1);
  const confirmacoesVisiveis = confirmacoesPendentes.slice(paginaAtualConfirmacoes * confirmacoesPorPagina, (paginaAtualConfirmacoes + 1) * confirmacoesPorPagina);

  function execModal() {
    if(!modal)return;
    if(modal.type==="reject")onRejectWithReason(modal.targetId,reason||"Sem motivo informado.");
    else if(modal.type==="block")onBlock(modal.targetId,reason||"Sem motivo informado.");
    else if(modal.type==="delete-user")onDeleteUser(modal.targetId);
    else if(modal.type==="remove-listing")onRemoveListing(modal.targetId);
    setModal(null); setReason("");
  }

  const TABS: Array<{key:AdminTab;label:string}> = [
    {key:"visao-geral",label:"Visão Geral"},
    {key:"usuarios",label:`Usuários${pendentes.length>0?` (${pendentes.length})`:""}`},
    {key:"publicacoes",label:"Publicações"},
    {key:"trocas",label:"Trocas"},
    {key:"ocorrencias",label:`Ocorrências${(divergencias.length+ocorrencias.length)>0?` (${divergencias.length+ocorrencias.length})`:""}`},
    {key:"alimentos",label:"Alimentos"},
  ];

  return (
    <div className="max-w-4xl xl:max-w-6xl mx-auto">
      <div className="border-b border-border bg-background sticky top-0 z-10 px-4">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} className={`px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0 transition-colors ${tab===t.key?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted"}`}>{t.label}</button>)}
        </div>
      </div>
      <div className="px-4 py-5">
        {tab==="visao-geral" && (
          <div className="space-y-6">
            {(pendentes.length>0||confirmacoesPendentes.length>0)&&(
              <div className="space-y-3">
                {pendentes.length>0&&(
                  <div className="bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-xl p-4">
                    <p className="text-xs font-bold text-[#B87A00] uppercase tracking-widest mb-3">Cadastros aguardando aprovação</p>
                    {pendentes.map(u=>(
                      <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#E8A33D]/20 last:border-0">
                        <div><p className="text-sm font-semibold text-foreground">{u.nome}</p><p className="text-xs text-muted-foreground">{u.responsavel} · {u.tipo} · {fmtDate(u.criadoEm)}</p></div>
                        <div className="flex gap-2"><Btn size="sm" onClick={()=>onApprove(u.id)}><Check className="w-3 h-3"/>Aprovar</Btn><Btn size="sm" variant="danger" onClick={()=>{setModal({type:"reject",targetId:u.id});setReason("");}}><X className="w-3 h-3"/></Btn></div>
                      </div>
                    ))}
                  </div>
                )}
                {confirmacoesPendentes.length>0&&(
                  <div className="bg-[#E85D4E]/10 border border-[#E85D4E]/30 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2"><p className="text-xs font-bold text-[#E85D4E] uppercase tracking-widest">Confirmações pendentes</p>{totalPaginasConfirmacoes>1&&<span className="text-[11px] font-semibold text-[#E85D4E]">Página {paginaAtualConfirmacoes+1} de {totalPaginasConfirmacoes}</span>}</div>
                    {confirmacoesVisiveis.map(p=>{ const l=listagens.find(x=>x.id===p.listagemId); const e=encontros.find(x=>x.propostaId===p.id); const prop=usuarios.find(u=>u.id===p.proponenteId); const dono=usuarios.find(u=>u.id===l?.usuarioId); const propConf=p.confirmacoes.find(c=>c.usuarioId===p.proponenteId); const donoConf=p.confirmacoes.find(c=>c.usuarioId===l?.usuarioId); return (
                      <div key={p.id} className="py-3 border-b border-[#E85D4E]/20 last:border-0 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{prop?.nome} com {dono?.nome}</p>
                        {e&&<p className="text-xs text-muted-foreground">{fmtDateShort(e.data)} às {e.horario}</p>}
                        <div className="flex gap-3 mt-1.5">
                          {[{u:prop,c:propConf},{u:dono,c:donoConf}].map((item,i)=>(
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${item.c?(item.c.resposta==="aconteceu"?"bg-green-50 text-green-700":"bg-red-50 text-[#E85D4E]"):"bg-muted text-muted-foreground"}`}>
                              {item.u?.responsavel.split(" ")[0]}: {item.c?(item.c.resposta==="aconteceu"?"Aconteceu":"Não aconteceu"):"Pendente"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ); })}
                    {totalPaginasConfirmacoes>1&&<div className="flex items-center justify-between pt-3"><button type="button" disabled={paginaAtualConfirmacoes===0} onClick={()=>setPaginaConfirmacoes(paginaAtualConfirmacoes-1)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#E85D4E] disabled:opacity-40"><ChevronLeft className="w-4 h-4"/>Anterior</button><button type="button" disabled={paginaAtualConfirmacoes===totalPaginasConfirmacoes-1} onClick={()=>setPaginaConfirmacoes(paginaAtualConfirmacoes+1)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#E85D4E] disabled:opacity-40">Próxima<ChevronRight className="w-4 h-4"/></button></div>}
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Situação atual</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {label:"Ofertas ativas",val:listagens.filter(l=>l.tipo==="oferta"&&l.status==="ativa").length,cor:"#2F6B5E"},
                  {label:"Pedidos ativos",val:listagens.filter(l=>l.tipo==="pedido"&&l.status==="ativa").length,cor:"#B87A00"},
                  {label:"Encontros agendados",val:encontrosAgendados.length,cor:"#ca8a04"},
                  {label:"Confirmações pendentes",val:confirmacoesPendentes.length,cor:"#E85D4E"},
                  {label:"Ocorrências abertas",val:ocorrencias.filter(o=>o.status==="aberta").length,cor:"#E85D4E"},
                  {label:"Trocas concluídas",val:propostas.filter(p=>p.status==="concluido").length,cor:"#22c55e"},
                  {label:"Usuários aprovados",val:aprovados.length,cor:"#2F6B5E"},
                  {label:"Pendentes aprovação",val:pendentes.length,cor:"#ca8a04"},
                ].map(item=>(
                  <div key={item.label} className="bg-card border border-border rounded-lg p-3">
                    <p className="text-2xl font-black" style={{color:item.cor}}>{item.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Publicações por tipo</p><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{nome:"Ofertas",total:listagens.filter(l=>l.tipo==="oferta").length},{nome:"Pedidos",total:listagens.filter(l=>l.tipo==="pedido").length}]}><XAxis dataKey="nome" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="total" fill="#2F6B5E" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
              <div className="bg-card border border-border rounded-xl p-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Status das trocas</p><div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={[{nome:"Em negociação",total:propostas.filter(p=>["proposto","contraproposto"].includes(p.status)).length,cor:"#E8A33D"},{nome:"Agendadas",total:propostas.filter(p=>p.status==="encontro-agendado").length,cor:"#ca8a04"},{nome:"Concluídas",total:propostas.filter(p=>p.status==="concluido").length,cor:"#2F6B5E"},{nome:"Com problema",total:propostas.filter(p=>["divergencia","nao-compareceu","cancelado"].includes(p.status)).length,cor:"#E85D4E"}]} margin={{left:8,right:12}}><XAxis type="number" allowDecimals={false} tick={{fontSize:11}}/><YAxis type="category" dataKey="nome" width={92} tick={{fontSize:10}}/><Tooltip formatter={(value)=>[value,"Trocas"]}/><Bar dataKey="total" radius={[0,4,4,0]}>{["#E8A33D","#ca8a04","#2F6B5E","#E85D4E"].map(c=><Cell key={c} fill={c}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
            </div>
            {encontrosAgendados.length>0&&(
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Encontros agendados</p>
                <div className="divide-y divide-border">
                  {encontrosAgendados.map(e=>{ const p=propostas.find(x=>x.id===e.propostaId); const l=p?listagens.find(x=>x.id===p.listagemId):null; const prop=p?usuarios.find(u=>u.id===p.proponenteId):null; const dono=l?usuarios.find(u=>u.id===l.usuarioId):null; const passado=isDiaEncontroPassado(e); return (
                    <div key={e.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground break-words">{prop?.nome} com {dono?.nome}</p><p className="text-xs text-muted-foreground break-words">{fmtDateShort(e.data)} às {e.horario} · {e.local}</p></div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${passado?"bg-red-50 text-[#E85D4E]":"bg-amber-50 text-amber-700"}`}>{passado?"Aguard. confirmação":"Agendado"}</span>
                    </div>
                  ); })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="usuarios" && (
          <div className="space-y-6">
            {pendentes.length>0&&(
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Aguardando aprovação ({pendentes.length})</p>
                <div className="space-y-3">
                  {pendentes.map(u=>(
                    <div key={u.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="min-w-0"><p className="font-bold text-foreground break-words">{u.nome}</p><p className="text-xs text-muted-foreground capitalize break-words">{u.tipo} · {u.responsavel}</p></div>
                        <div className="flex gap-2 flex-shrink-0"><Btn size="sm" onClick={()=>onApprove(u.id)}><Check className="w-3.5 h-3.5"/>Aprovar</Btn><Btn size="sm" variant="danger" onClick={()=>{setModal({type:"reject",targetId:u.id});setReason("");}}><X className="w-3.5 h-3.5"/></Btn></div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><MapPin className="w-3 h-3 inline mr-1"/>{u.endereco}</p>
                        <p><ClipboardList className="w-3 h-3 inline mr-1"/>{u.cnpjCpf} · {u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Usuários ativos ({aprovados.length})</p>
              <div className="divide-y divide-border">
                {aprovados.map(u=>(
                  <div key={u.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${u.tipo==="restaurante"?"bg-primary":"bg-[#E8A33D]"}`}>{u.nome.charAt(0)}</div>
                        <div className="min-w-0"><p className="text-sm font-semibold text-foreground truncate">{u.nome}</p><p className="text-xs text-muted-foreground">{u.responsavel} · {u.tipo}</p></div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={()=>{setModal({type:"block",targetId:u.id});setReason("");}} className="text-xs text-muted-foreground hover:text-[#E85D4E] flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"><Ban className="w-3 h-3"/>Bloquear</button>
                        <button onClick={()=>setModal({type:"delete-user",targetId:u.id})} className="text-xs text-muted-foreground hover:text-[#E85D4E] px-2 py-1 rounded hover:bg-muted"><Trash2 className="w-3 h-3"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {bloqueados.length>0&&(
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Bloqueados ({bloqueados.length})</p>
                <div className="divide-y divide-border">
                  {bloqueados.map(u=>(
                    <div key={u.id} className="py-3 flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold text-foreground">{u.nome}</p>{u.motivoBloqueio&&<p className="text-xs text-[#E85D4E]">Motivo: {u.motivoBloqueio}</p>}</div>
                      <Btn size="sm" variant="secondary" onClick={()=>onUnblock(u.id)}>Desbloquear</Btn>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rejeitados.length>0&&(
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Recusados ({rejeitados.length})</p>
                <div className="divide-y divide-border">
                  {rejeitados.map(u=><div key={u.id} className="py-3"><p className="text-sm font-semibold text-foreground">{u.nome} · {u.responsavel}</p>{u.motivoRejeicao&&<p className="text-xs text-muted-foreground">Motivo: {u.motivoRejeicao}</p>}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="publicacoes" && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Todas as publicações ({listagens.length})</p>
            <div className="divide-y divide-border">
              {listagens.map(l=>{ const u=usuarios.find(x=>x.id===l.usuarioId); return (
                <div key={l.id} className="flex items-start justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{backgroundColor:MAT[l.maturacao].cor}}/>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><p className="text-sm font-bold text-foreground">{nomeAlimento(l.alimento,alimentosBD)}</p><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${l.tipo==="oferta"?"bg-teal-50 text-teal-700":"bg-amber-50 text-amber-700"}`}>{l.tipo}</span></div>
                      <p className="text-xs text-muted-foreground">{fmtQtd(l.quantidadeG)} · {u?.nome}</p>
                      <p className="text-xs text-muted-foreground">Válido até {fmtDate(l.prazo)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${l.status==="ativa"?"bg-teal-50 text-teal-700":l.status==="concluida"?"bg-green-50 text-green-700":"bg-muted text-muted-foreground"}`}>{l.status}</span>
                    {l.status!=="concluida"&&<button onClick={()=>setModal({type:"remove-listing",targetId:l.id})} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-[#E85D4E]"><Trash2 className="w-3.5 h-3.5"/></button>}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        )}

        {tab==="trocas" && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Todas as propostas ({propostas.length})</p>
            <div className="divide-y divide-border">
              {propostas.map(p=>{ const l=listagens.find(x=>x.id===p.listagemId); const prop=usuarios.find(u=>u.id===p.proponenteId); const dono=usuarios.find(u=>u.id===l?.usuarioId); const e=encontros.find(x=>x.propostaId===p.id); const pend=isConfirmacaoPendente(p,encontros); const lbl=pend?"Confirmação pendente":STATUS_LABEL[p.status]; const cor=pend?"#E85D4E":STATUS_COR[p.status]; return (
                <div key={p.id} className="py-4 space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:cor}}/><p className="text-sm font-bold text-foreground">{nomeAlimento(p.oferecem.alimento,alimentosBD)} por {nomeAlimento(p.querem.alimento,alimentosBD)}</p></div>
                      <p className="text-xs text-muted-foreground">{fmtQtd(p.oferecem.quantidadeG)} · {prop?.nome} com {dono?.nome}</p>
                      {e&&<p className="text-xs text-muted-foreground">{fmtDateShort(e.data)} às {e.horario} · {e.local}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{lbl}</span>
                  </div>
                  {p.confirmacoes.length>0&&(
                    <div className="flex gap-2 flex-wrap">
                      {p.confirmacoes.map(c=>{ const cu=usuarios.find(u=>u.id===c.usuarioId); return <span key={c.usuarioId} className={`text-xs px-2 py-0.5 rounded-full ${c.resposta==="aconteceu"?"bg-green-50 text-green-700":"bg-red-50 text-[#E85D4E]"}`}>{cu?.responsavel.split(" ")[0]}: {c.resposta==="aconteceu"?"aconteceu":"não aconteceu"}</span>; })}
                    </div>
                  )}
                </div>
              ); })}
            </div>
          </div>
        )}

        {tab==="ocorrencias" && (
          <div className="space-y-6">
            {divergencias.length>0&&(
              <div>
                <p className="text-xs font-bold text-[#E85D4E] uppercase tracking-widest mb-3">Divergências ({divergencias.length})</p>
                {divergencias.map(p=>{ const l=listagens.find(x=>x.id===p.listagemId); const prop=usuarios.find(u=>u.id===p.proponenteId); const dono=usuarios.find(u=>u.id===l?.usuarioId); return (
                  <div key={p.id} className="bg-card border border-[#E85D4E]/30 rounded-xl p-4 mb-3">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-[#E85D4E]"/><p className="font-bold text-foreground">{nomeAlimento(p.oferecem.alimento,alimentosBD)} por {nomeAlimento(p.querem.alimento,alimentosBD)}</p></div>
                    <p className="text-xs text-muted-foreground mb-2">{prop?.nome} com {dono?.nome}</p>
                    {p.confirmacoes.map(c=>{ const cu=usuarios.find(u=>u.id===c.usuarioId); return <div key={c.usuarioId} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded mb-1 ${c.resposta==="aconteceu"?"bg-green-50 text-green-700":"bg-red-50 text-[#E85D4E]"}`}>{c.resposta==="aconteceu"?<ThumbsUp className="w-3 h-3"/>:<ThumbsDown className="w-3 h-3"/>}<span className="font-semibold">{cu?.responsavel}</span><span>{c.resposta==="aconteceu"?"disse que aconteceu":"disse que não aconteceu"}</span>{c.pesoG&&<span className="text-muted-foreground">· {fmtQtd(c.pesoG)}</span>}</div>; })}
                  </div>
                ); })}
              </div>
            )}
            {ocorrencias.length>0&&(
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Problemas reportados ({ocorrencias.length})</p>
                <div className="divide-y divide-border">
                  {ocorrencias.map(o=>{ const u=usuarios.find(x=>x.id===o.usuarioId); const l=listagens.find(x=>x.id===o.listagemId); const tipoLabel={qualidade:"Qualidade",quantidade:"Quantidade",diferente:"Diferente do anunciado",outro:"Outro"} as Record<string,string>; return (
                    <div key={o.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{tipoLabel[o.tipo]??o.tipo} — {nomeAlimento(l?.alimento??"",alimentosBD)}</p>
                          <p className="text-xs text-muted-foreground">{u?.nome} · {fmtDT(o.criadoEm)}</p>
                          <p className="text-xs text-foreground mt-1">{o.descricao}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${o.status==="aberta"?"bg-amber-50 text-amber-700":o.status==="em-analise"?"bg-blue-50 text-blue-700":"bg-green-50 text-green-700"}`}>{o.status}</span>
                      </div>
                    </div>
                  ); })}
                </div>
              </div>
            )}
            {divergencias.length===0&&ocorrencias.length===0&&(
              <div className="text-center py-16 text-muted-foreground"><CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20"/><p className="text-sm">Nenhuma ocorrência registrada.</p></div>
            )}
          </div>
        )}

        {tab==="alimentos" && (
          <div className="space-y-6">
            {/* Categorias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Categorias</p>
              </div>
              <div className="divide-y divide-border">
                {categorias.map(cat=>(
                  <div key={cat.id} className="py-3 flex items-center justify-between gap-3">
                    {editingCategoria===cat.id
                      ? <div className="flex gap-2 flex-1"><input value={catEditNome} onChange={e=>setCatEditNome(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/><Btn size="sm" onClick={()=>{onEditCategoria(cat.id,catEditNome||cat.nome);setEditingCategoria(null);}}><Check className="w-3 h-3"/></Btn><button onClick={()=>setEditingCategoria(null)}><X className="w-4 h-4 text-muted-foreground"/></button></div>
                      : <><p className={`text-sm font-semibold ${!cat.ativa?"line-through text-muted-foreground":"text-foreground"}`}>{cat.nome}</p><div className="flex gap-2"><button onClick={()=>{setEditingCategoria(cat.id);setCatEditNome(cat.nome);}} className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted"><Pencil className="w-3 h-3"/></button><button onClick={()=>onToggleCategoria(cat.id)} className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted">{cat.ativa?"Desativar":"Ativar"}</button></div></>
                    }
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input value={novaCategoria} onChange={e=>setNovaCategoria(e.target.value)} placeholder="Nova categoria..." className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                <Btn size="sm" onClick={()=>{if(novaCategoria.trim()){onAddCategoria(novaCategoria.trim());setNovaCategoria("");}}}><Plus className="w-3.5 h-3.5"/>Adicionar</Btn>
              </div>
            </div>

            {/* Alimentos */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Alimentos ({alimentosBD.length})</p>
              <div className="divide-y divide-border">
                {alimentosBD.map(a=>(
                  <div key={a.id} className="py-3">
                    {editingAlimento===a.id
                      ? (
                        <div className="space-y-2">
                          <input value={alimentoForm.nome} onChange={e=>setAlimentoForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do alimento" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                          <div className="flex gap-2">
                            <select value={alimentoForm.catId} onChange={e=>setAlimentoForm(f=>({...f,catId:e.target.value}))} className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none">
                              {categorias.filter(c=>c.ativa).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                          </div>
                          <input value={alimentoForm.imgUrl} onChange={e=>setAlimentoForm(f=>({...f,imgUrl:e.target.value}))} placeholder="URL da imagem (opcional)" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                          <div className="flex gap-2"><Btn size="sm" onClick={()=>{onEditAlimento(a.id,alimentoForm.nome||a.nome,alimentoForm.catId||a.categoriaId,alimentoForm.imgUrl);setEditingAlimento(null);}}><Check className="w-3 h-3"/>Salvar</Btn><button onClick={()=>setEditingAlimento(null)} className="text-xs text-muted-foreground px-2 py-1">Cancelar</button></div>
                        </div>
                      )
                      : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {a.imagemUrl&&<img src={a.imagemUrl} alt={a.nome} className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>}
                            <div><p className={`text-sm font-semibold ${!a.ativo?"line-through text-muted-foreground":"text-foreground"}`}>{a.nome}</p><p className="text-xs text-muted-foreground">{categorias.find(c=>c.id===a.categoriaId)?.nome}</p></div>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={()=>{setEditingAlimento(a.id);setAlimentoForm({nome:a.nome,catId:a.categoriaId,imgUrl:a.imagemUrl??""});}} className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted"><Pencil className="w-3 h-3"/></button>
                            <button onClick={()=>onToggleAlimento(a.id)} className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted">{a.ativo?"Desativar":"Ativar"}</button>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input value={novoAlimento.nome} onChange={e=>setNovoAlimento(f=>({...f,nome:e.target.value}))} placeholder="Nome do novo alimento" className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                <select value={novoAlimento.catId} onChange={e=>setNovoAlimento(f=>({...f,catId:e.target.value}))} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none">
                  <option value="">Categoria</option>
                  {categorias.filter(c=>c.ativa).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <Btn size="sm" onClick={()=>{if(novoAlimento.nome.trim()&&novoAlimento.catId){onAddAlimento(novoAlimento.nome.trim(),novoAlimento.catId);setNovoAlimento({nome:"",catId:""});}}}><Plus className="w-3.5 h-3.5"/></Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-foreground">{modal.type==="reject"?"Recusar cadastro":modal.type==="block"?"Bloquear usuário":modal.type==="remove-listing"?"Encerrar publicação":"Excluir usuário"}</h3>
            {(modal.type==="reject"||modal.type==="block")&&<Txa label="Motivo (opcional)" placeholder="Descreva o motivo..." rows={3} value={reason} onChange={e=>setReason(e.target.value)}/>}
            {(modal.type==="delete-user"||modal.type==="remove-listing")&&<p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>}
            <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn variant="danger" className="flex-1" onClick={execModal}>{modal.type==="reject"?"Recusar":modal.type==="block"?"Bloquear":"Confirmar"}</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────

function PerfilView({ user, onLogout, onUpdatePerfil, alimentosBD }: {
  user: Usuario; onLogout: ()=>void;
  onUpdatePerfil: (u: Partial<Usuario>)=>void | Promise<void>; alimentosBD: AlimentoBD[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ responsavel:user.responsavel, whatsapp:user.whatsapp, email:user.email, endereco:user.endereco, horario:user.horario });
  const [errors, setErrors] = useState<Errors>({});
  const horarioOpts=["04:00 às 10:00","04:00 às 12:00","04:00 às 14:00","05:00 às 11:00","05:00 às 13:00","06:00 às 12:00","06:00 às 14:00","06:00 às 18:00","07:00 às 15:00","07:00 às 18:00"];
  function saveEdit() {
    const e: Errors = {};
    const rErr=validateNome(form.responsavel,3,80); if(rErr)e.responsavel=rErr;
    const tErr=validatePhone(form.whatsapp); if(tErr)e.whatsapp=tErr;
    const emErr=validateEmail(form.email); if(emErr)e.email=emErr;
    const enErr=validateNome(form.endereco,5,200); if(enErr)e.endereco=enErr;
    if(!form.horario)e.horario="Selecione o horário.";
    setErrors(e); if(Object.keys(e).length>0)return;
    onUpdatePerfil(form); setIsEditing(false);
  }
  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <div className="flex items-center gap-4 pb-5 border-b border-border">
        <label className="group relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-black flex-shrink-0 bg-primary cursor-pointer ring-offset-2 focus-within:ring-2 focus-within:ring-primary" title="Alterar foto do perfil">
          <input type="file" accept="image/*" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>onUpdatePerfil({fotoUrl:String(reader.result)});reader.readAsDataURL(file);}}/>
          {user.fotoUrl?<img src={user.fotoUrl} alt={user.nome} className="w-full h-full object-cover"/>:user.id==="admin"?<Shield className="w-6 h-6"/>:user.nome.charAt(0)}
          <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"><Camera className="w-5 h-5"/><span className="sr-only">Alterar foto</span></span>
        </label>
        <div className="flex-1 min-w-0"><p className="font-extrabold text-foreground text-lg leading-tight truncate">{user.nome}</p><p className="text-sm text-muted-foreground capitalize">{user.tipo}</p><span className="text-xs font-semibold text-[#2F6B5E] bg-teal-50 px-2 py-0.5 rounded-full inline-block mt-1">Aprovado</span></div>
        {!isEditing&&<Btn size="sm" variant="secondary" onClick={()=>{setForm({responsavel:user.responsavel,whatsapp:user.whatsapp,email:user.email,endereco:user.endereco,horario:user.horario});setIsEditing(true);}}><Pencil className="w-3.5 h-3.5"/>Editar</Btn>}
      </div>
      {isEditing ? (
        <div className="py-4 space-y-4">
          <Inp label="Nome do responsável *" value={form.responsavel} error={errors.responsavel} maxLength={80} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))}/>
          <Inp label="WhatsApp *" value={form.whatsapp} error={errors.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:maskPhone(e.target.value)}))}/>
          <Inp label="E-mail *" type="email" value={form.email} error={errors.email} maxLength={120} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
          <Inp label="Endereço *" value={form.endereco} error={errors.endereco} maxLength={200} onChange={e=>setForm(f=>({...f,endereco:e.target.value}))}/>
          <Sel label="Horário *" value={form.horario} error={errors.horario} onChange={e=>setForm(f=>({...f,horario:e.target.value}))}><option value="">Selecione</option>{horarioOpts.map(h=><option key={h} value={h}>{h}</option>)}</Sel>
          <div className="flex gap-2"><Btn variant="ghost" onClick={()=>setIsEditing(false)}>Cancelar</Btn><Btn className="flex-1" onClick={saveEdit}><Check className="w-4 h-4"/>Salvar</Btn></div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {[{label:"Responsável",val:user.responsavel,icon:User},{label:(user.documentoTipo??"cnpj").toUpperCase(),val:user.cnpjCpf,icon:ClipboardList},{label:"E-mail",val:user.email,icon:Eye},{label:"Endereço",val:user.endereco,icon:MapPin},{label:"Horário",val:user.horario,icon:Clock}].map(item=>(
            <div key={item.label} className="flex items-center gap-3 py-4">
              <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
              <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-sm font-semibold text-foreground">{item.val}</p></div>
            </div>
          ))}
        </div>
      )}
      {user.alimentosInteresse.length>0&&!isEditing&&(
        <div className="py-4 border-t border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Alimentos de interesse</p>
          <div className="flex flex-wrap gap-2">{user.alimentosInteresse.map(a=><span key={a} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">{nomeAlimento(a,alimentosBD)}</span>)}</div>
        </div>
      )}
      {!isEditing&&<div className="pt-4 border-t border-border"><button onClick={onLogout} className="text-sm text-[#E85D4E] font-semibold">Sair da conta</button></div>}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView]           = useState<View>("landing");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [fromView, setFromView]   = useState<View>("listagens");
  const [chatPropostaId, setChatPropostaId] = useState<string|null>(null);
  const [user, setUser]           = useState<Usuario|null>(null);
  const [toast, setToast]         = useState("");
  const [adminTab, setAdminTab]   = useState<AdminTab>("visao-geral");
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [usuarios,    setUsuarios]    = useState<Usuario[]>(INIT_USUARIOS);
  const [listagens,   setListagens]   = useState<Listagem[]>(INIT_LISTAGENS);
  const [propostas,   setPropostas]   = useState<Proposta[]>(INIT_PROPOSTAS);
  const [encontros,   setEncontros]   = useState<Encontro[]>(INIT_ENCONTROS);
  const [mensagens,   setMensagens]   = useState<Mensagem[]>(INIT_MENSAGENS);
  const [notificacoes,setNotificacoes]= useState<Notificacao[]>(INIT_NOTIFICACOES);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPos[]>([]);
  const [categorias,  setCategorias]  = useState<CategoriaAlimento[]>(INIT_CATEGORIAS);
  const [alimentosBD, setAlimentosBD] = useState<AlimentoBD[]>(INIT_ALIMENTOS_BD);

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(""),3500); }

  function navTo(v: View, id?: string, from?: View) {
    if(id)setSelectedId(id); if(from)setFromView(from); setView(v);
  }

  const notifCount = user ? notificacoes.filter(n=>n.usuarioId===user.id&&!n.lida).length : 0;
  const pendingConfirmationId = user ? getPendingConfirmation(user.id,propostas,listagens,encontros) : null;
  const isNested = (["detalhes","nova-listagem","chat"] as View[]).includes(view);

  function handleLogin(u: Usuario) { setUser(u); setView(u.id==="admin"?"admin":"dashboard"); }
  function handleLogout() { setUser(null); setView("landing"); }
  function traduzirErroAuth(message?: string): string {
    const texto = message?.toLowerCase() ?? "";
    if (texto.includes("user already registered") || texto.includes("already been registered")) return "Este e-mail já está cadastrado.";
    if (texto.includes("password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
    if (texto.includes("invalid email")) return "Informe um e-mail válido.";
    if (texto.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    if (texto.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    return message ?? "Não foi possível concluir o cadastro.";
  }
  async function handleRegistro(data: Partial<Usuario>) {
    if (!supabase) {
      showToast("Configure o Supabase no arquivo .env antes de criar uma conta.");
      return;
    }
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email!,
      password: data.senha!,
      options: {
        data: {
          name: data.nome,
          type: data.tipo,
          document: data.cnpjCpf,
          document_type: data.documentoTipo,
          address: data.endereco,
          whatsapp: data.whatsapp,
          responsible: data.responsavel,
          interests: data.alimentosInteresse ?? [],
          opening_hours: data.horario,
        },
      },
    });
    if (error || !authData.user) {
      showToast(traduzirErroAuth(error?.message));
      return;
    }
    const novo: Usuario = { id:genId(), nome:data.nome!, tipo:data.tipo!, documentoTipo:data.documentoTipo as TipoDocumento, cnpjCpf:data.cnpjCpf!, email:data.email??"", senha:data.senha, endereco:data.endereco!, whatsapp:data.whatsapp!, responsavel:data.responsavel!, alimentosInteresse:data.alimentosInteresse??[], horario:data.horario!, status:"pendente", criadoEm:new Date().toISOString() };
    setUsuarios(p=>[...p,novo]); setView("landing"); showToast("Cadastro realizado. Aguarde a aprovação do administrador.");
  }

  function handleAddListagem(data: Partial<Listagem>) {
    if(!user)return;
    const nova: Listagem = { id:genId(), tipo:data.tipo!, usuarioId:user.id, alimento:data.alimento!, quantidadeG:data.quantidadeG!, maturacao:data.maturacao!, prazo:data.prazo!, observacao:data.observacao??null, fotoUrl:data.fotoUrl??null, status:"ativa", criadoEm:new Date().toISOString() };
    setListagens(p=>[nova,...p]); setView("listagens"); showToast("Publicação criada.");
  }

  function handleEditListagem(id: string, updates: Partial<Listagem>) { setListagens(p=>p.map(l=>l.id===id?{...l,...updates}:l)); showToast("Publicação atualizada."); }
  function handleEncerrarListagem(id: string) { setListagens(p=>p.map(l=>l.id===id?{...l,status:"cancelada"}:l)); showToast("Publicação encerrada."); }

  function handleAddProposta(data: Partial<Proposta>) {
    if(!user)return;
    const nova: Proposta = { id:genId(), listagemId:data.listagemId!, propostaPaiId:data.propostaPaiId??null, versao:data.versao!, status:"proposto", criadoEm:new Date().toISOString(), proponenteId:user.id, oferecem:data.oferecem!, querem:data.querem!, confirmacoes:[] };
    setPropostas(p=>{ if(data.propostaPaiId)return [...p.map(x=>x.id===data.propostaPaiId?{...x,status:"contraproposto" as StatusTroca}:x),nova]; return [...p,nova]; });
    setListagens(p=>p.map(l=>l.id===data.listagemId?{...l,status:"em-negociacao"}:l));
    const l=listagens.find(x=>x.id===data.listagemId);
    const rootId=data.propostaPaiId??(nova.id);
    if(l&&l.usuarioId!==user.id){
      setNotificacoes(p=>[...p,{id:genId(),usuarioId:l.usuarioId,mensagem:`${user.nome} enviou uma proposta para sua ${l.tipo} de ${nomeAlimento(l.alimento,alimentosBD)}.`,lida:false,criadaEm:new Date().toISOString(),listagemId:l.id,propostaId:nova.id}]);
    }
    setMensagens(p=>[...p,{id:genId(),rootPropostaId:rootId,autorId:"sistema",tipo:"sistema",texto:`${user.nome} ${data.propostaPaiId?"enviou uma contraproposta.":"enviou uma proposta."}`,criadaEm:new Date().toISOString(),lida:false}]);
    showToast("Proposta enviada.");
  }

  function handleUpdateListagem(id: string, status: StatusListagem) { setListagens(p=>p.map(l=>l.id===id?{...l,status}:l)); }

  function handleUpdateProposta(id: string, updates: Partial<Proposta>) {
    setPropostas(p=>p.map(x=>x.id===id?{...x,...updates}:x));
    if(updates.status==="aceito"){ showToast("Proposta aceita. Registre o encontro quando combinar os detalhes."); }
    else if(updates.status==="cancelado"){ showToast("Proposta cancelada."); }
  }

  function handleAgendarEncontro(propostaId: string, data: string, horario: string, local: string) {
    const novoE: Encontro = { id:genId(), propostaId, data, horario, local, criadoEm:new Date().toISOString(), alteracoes:[] };
    setEncontros(p=>[...p,novoE]);
    setPropostas(p=>p.map(x=>x.id===propostaId?{...x,status:"encontro-agendado"}:x));
    const p=propostas.find(x=>x.id===propostaId);
    if(p){ const rootId=p.propostaPaiId??p.id; setMensagens(prev=>[...prev,{id:genId(),rootPropostaId:rootId,autorId:"sistema",tipo:"sistema",texto:`Encontro agendado: ${new Date(data+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} às ${horario} — ${local}.`,criadaEm:new Date().toISOString(),lida:false}]); }
    showToast("Encontro registrado.");
  }

  function handleEditEncontro(eId: string, data: string, horario: string, local: string) {
    setEncontros(p=>p.map(e=>{ if(e.id!==eId)return e; const alts=[...e.alteracoes]; if(e.data!==data)alts.push({campo:"data",de:e.data,para:data,em:new Date().toISOString()}); if(e.horario!==horario)alts.push({campo:"horario",de:e.horario,para:horario,em:new Date().toISOString()}); if(e.local!==local)alts.push({campo:"local",de:e.local,para:local,em:new Date().toISOString()}); return {...e,data,horario,local,alteracoes:alts}; }));
    showToast("Encontro atualizado.");
  }

  function handleRegistrarConfirmacao(propostaId: string, resposta: "aconteceu"|"nao-aconteceu", pesoG?: number) {
    if(!user)return;
    const p=propostas.find(x=>x.id===propostaId); if(!p)return;
    const novaConf: ConfirmacaoEncontro = { usuarioId:user.id, resposta, pesoG, criadaEm:new Date().toISOString() };
    const novasConfs=[...p.confirmacoes,novaConf];
    let novoStatus: StatusTroca="encontro-agendado";
    if(novasConfs.length>=2){ const todosA=novasConfs.every(c=>c.resposta==="aconteceu"); const todosN=novasConfs.every(c=>c.resposta==="nao-aconteceu"); novoStatus=todosA?"concluido":todosN?"nao-compareceu":"divergencia"; }
    setPropostas(prev=>prev.map(x=>x.id===propostaId?{...x,confirmacoes:novasConfs,status:novoStatus}:x));
    if(novoStatus==="concluido"){ setListagens(prev=>prev.map(l=>l.id===p.listagemId?{...l,status:"concluida"}:l)); showToast("Troca concluída."); }
    else if(novoStatus==="nao-compareceu")showToast("Registrado como não realizado.");
    else if(novoStatus==="divergencia")showToast("Respostas divergentes. Em análise.");
    else showToast("Confirmação registrada. Aguardando a outra parte.");
  }

  function handleReportarProblema(propostaId: string, listagemId: string, tipo: OcorrenciaPos["tipo"], descricao: string) {
    if(!user)return;
    const nova: OcorrenciaPos = { id:genId(), propostaId, listagemId, usuarioId:user.id, tipo, descricao, criadoEm:new Date().toISOString(), status:"aberta" };
    setOcorrencias(p=>[...p,nova]); showToast("Problema reportado ao administrador.");
  }

  function handleSendMensagem(texto: string) {
    if(!user||!chatPropostaId)return;
    const nova: Mensagem = { id:genId(), rootPropostaId:chatPropostaId, autorId:user.id, tipo:"texto", texto, criadaEm:new Date().toISOString(), lida:false };
    setMensagens(p=>[...p,nova]);
  }

  function handleOpenChat(rootPropostaId: string) { setChatPropostaId(rootPropostaId); navTo("chat"); }

  function markRead(id: string) { setNotificacoes(p=>p.map(n=>n.id===id?{...n,lida:true}:n)); }
  function markAllRead() { if(!user)return; setNotificacoes(p=>p.map(n=>n.usuarioId===user.id?{...n,lida:true}:n)); }

  function handleApprove(id: string) { setUsuarios(p=>p.map(u=>u.id===id?{...u,status:"aprovado",motivoRejeicao:undefined,motivoBloqueio:undefined}:u)); showToast("Cadastro aprovado."); }
  function handleRejectWithReason(id: string, motivo: string) { setUsuarios(p=>p.map(u=>u.id===id?{...u,status:"rejeitado",motivoRejeicao:motivo}:u)); showToast("Cadastro recusado."); }
  function handleBlock(id: string, motivo: string) { setUsuarios(p=>p.map(u=>u.id===id?{...u,status:"bloqueado",motivoBloqueio:motivo}:u)); showToast("Usuário bloqueado."); }
  function handleUnblock(id: string) { setUsuarios(p=>p.map(u=>u.id===id?{...u,status:"aprovado",motivoBloqueio:undefined}:u)); showToast("Usuário desbloqueado."); }
  function handleDeleteUser(id: string) { setUsuarios(p=>p.filter(u=>u.id!==id)); showToast("Usuário removido."); }
  function handleRemoveListing(id: string) { setListagens(p=>p.map(l=>l.id===id?{...l,status:"cancelada"}:l)); showToast("Publicação encerrada."); }

  function handleAddAlimento(nome: string, catId: string) { setAlimentosBD(p=>[...p,{id:genId(),nome,categoriaId:catId,ativo:true}]); showToast("Alimento adicionado."); }
  function handleEditAlimento(id: string, nome: string, catId: string, imgUrl: string) { setAlimentosBD(p=>p.map(a=>a.id===id?{...a,nome,categoriaId:catId,imagemUrl:imgUrl||undefined}:a)); showToast("Alimento atualizado."); }
  function handleToggleAlimento(id: string) { setAlimentosBD(p=>p.map(a=>a.id===id?{...a,ativo:!a.ativo}:a)); }
  function handleAddCategoria(nome: string) { setCategorias(p=>[...p,{id:genId(),nome,ativa:true}]); }
  function handleEditCategoria(id: string, nome: string) { setCategorias(p=>p.map(c=>c.id===id?{...c,nome}:c)); }
  function handleToggleCategoria(id: string) { setCategorias(p=>p.map(c=>c.id===id?{...c,ativa:!c.ativa}:c)); }
  async function handleUpdatePerfil(updates: Partial<Usuario>) {
    if(!user)return;
    if(supabase && user.id!=="admin" && updates.fotoUrl){
      const { error } = await supabase.from("profiles").update({ avatar_url: updates.fotoUrl }).eq("id", user.id);
      if(error){ showToast("Não foi possível salvar a foto no Supabase."); return; }
    }
    setUsuarios(p=>p.map(u=>u.id===user.id?{...u,...updates}:u)); setUser(u=>u?{...u,...updates}:u); showToast(updates.fotoUrl?"Foto do perfil salva.":"Dados atualizados.");
  }

  const viewTitles: Partial<Record<View,string>> = { dashboard:"Feira Circular", listagens:"Listagens", "minhas-trocas":"Minhas Trocas", "nova-listagem":"Nova publicação", admin:"Administração", perfil:"Perfil", chat:"Chat" };
  const topBarTitle = view==="detalhes"&&selectedId ? nomeAlimento(listagens.find(l=>l.id===selectedId)?.alimento??"",alimentosBD) : viewTitles[view]??"";

  if (!user) {
    return (
      <>
        {toast&&<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold max-w-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0"/><span className="flex-1">{toast}</span><button onClick={()=>setToast("")}><X className="w-3.5 h-3.5 opacity-60"/></button></div>}
        {view==="registro"&&<RegistroView onSubmit={handleRegistro} onBack={()=>setView("landing")} alimentosBD={alimentosBD} categorias={categorias}/>}
        {view==="login"&&<LoginView usuarios={usuarios} onLogin={handleLogin} onRegistro={()=>setView("registro")} onBack={()=>setView("landing")}/>}
        {view!=="registro"&&view!=="login"&&<LandingView onLogin={()=>setView("login")} onRegistro={()=>setView("registro")}/>}
      </>
    );
  }

  function renderMain() {
    switch(view) {
      case "dashboard": return <DashboardView user={user!} listagens={listagens} propostas={propostas} usuarios={usuarios} encontros={encontros} pendingConfirmationId={pendingConfirmationId} alimentosBD={alimentosBD} setView={setView} navTo={navTo}/>;
      case "listagens": return <ListagensView listagens={listagens} usuarios={usuarios} alimentosBD={alimentosBD} categorias={categorias} navTo={navTo}/>;
      case "detalhes": return selectedId ? <DetalhesView listagemId={selectedId} listagens={listagens} propostas={propostas} usuarios={usuarios} user={user!} encontros={encontros} alimentosBD={alimentosBD} ocorrencias={ocorrencias} onBack={()=>setView(fromView)} onAddProposta={handleAddProposta} onUpdateListagem={handleUpdateListagem} onUpdateProposta={handleUpdateProposta} onRegistrarConfirmacao={handleRegistrarConfirmacao} onAgendarEncontro={handleAgendarEncontro} onEditEncontro={handleEditEncontro} onEditListagem={handleEditListagem} onEncerrarListagem={handleEncerrarListagem} onReportarProblema={handleReportarProblema} onOpenChat={handleOpenChat}/> : null;
      case "nova-listagem": return <NovaListagemView onSubmit={handleAddListagem} onBack={()=>setView("listagens")} alimentosBD={alimentosBD} categorias={categorias}/>;
      case "minhas-trocas": return <MinhasTrocasView user={user!} listagens={listagens} propostas={propostas} usuarios={usuarios} encontros={encontros} alimentosBD={alimentosBD} navTo={navTo}/>;
      case "admin": return user!.id==="admin" ? <AdminView tab={adminTab} setTab={setAdminTab} usuarios={usuarios} listagens={listagens} propostas={propostas} encontros={encontros} ocorrencias={ocorrencias} alimentosBD={alimentosBD} categorias={categorias} onApprove={handleApprove} onRejectWithReason={handleRejectWithReason} onBlock={handleBlock} onUnblock={handleUnblock} onDeleteUser={handleDeleteUser} onRemoveListing={handleRemoveListing} onAddAlimento={handleAddAlimento} onEditAlimento={handleEditAlimento} onToggleAlimento={handleToggleAlimento} onAddCategoria={handleAddCategoria} onEditCategoria={handleEditCategoria} onToggleCategoria={handleToggleCategoria}/> : null;
      case "perfil": return <PerfilView user={user!} onLogout={handleLogout} onUpdatePerfil={handleUpdatePerfil} alimentosBD={alimentosBD}/>;
      case "chat": return chatPropostaId ? <ChatView rootPropostaId={chatPropostaId} mensagens={mensagens} propostas={propostas} listagens={listagens} usuarios={usuarios} user={user!} alimentosBD={alimentosBD} onSend={handleSendMensagem} onBack={()=>setView(fromView||"detalhes")}/> : null;
      default: return null;
    }
  }

  return (
    <>
      {toast&&<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold max-w-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0"/><span className="flex-1">{toast}</span><button onClick={()=>setToast("")}><X className="w-3.5 h-3.5 opacity-60"/></button></div>}

      {showNotifPanel && (
        <NotifPanel
          notificacoes={notificacoes.filter(n=>n.usuarioId===user.id)}
          onClose={()=>setShowNotifPanel(false)}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onNavigate={(listagemId)=>navTo("detalhes",listagemId,"dashboard")}
        />
      )}

      <div className="flex h-dvh min-h-screen bg-background overflow-hidden">
        <div className="hidden md:flex w-60 flex-shrink-0 min-h-0">
          <Sidebar user={user} view={view} setView={setView} notifCount={notifCount} onNotif={()=>setShowNotifPanel(true)} onLogout={handleLogout} adminTab={adminTab} setAdminTab={setAdminTab}/>
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <TopBar title={topBarTitle} onBack={isNested?()=>{ if(view==="chat")setView(fromView||"detalhes"); else setView(fromView); }:undefined} notifCount={notifCount} onNotif={()=>setShowNotifPanel(true)}/>
          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${!isNested?"pb-20 md:pb-0":""}`}>
            {renderMain()}
          </div>
        </div>
      </div>

      {!isNested&&(
        <BottomNav view={view} setView={setView} isAdmin={user.id==="admin"} adminTab={adminTab} setAdminTab={setAdminTab}/>
      )}
    </>
  );
}
