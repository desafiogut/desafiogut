// MC17.1 — Ledger off-chain de "senhas de troco" do lojista.
//
// Regra de negócio (validada pelo cliente):
//   - O lojista NÃO compra senhas avulsas. As suas senhas vêm do EXCEDENTE da
//     cota comercial: se o produto anunciado vale menos que o mínimo da cota,
//     a diferença vira senhas (R$ 2,00 cada).
//   - Essas senhas de troco VALEM 30 DIAS. Após o prazo expiram e saem do saldo.
//   - Consumo é FIFO: os lotes mais antigos são gastos primeiro.
//
// Porquê off-chain: as senhas on-chain (contrato LeilaoGUT) NÃO expiram e o
// contrato não pode mudar (R2). Logo o troco vive aqui, num Blob, com expiração.
// A ponte para lances on-chain converte troco -> saldoSenhas on-demand (FIFO),
// fora deste módulo (módulo puro de estado, sem IO de contrato).
//
// Blob: troco-senhas:{endereco}
//   { lotes: [ { id, senhas, origem, criadoEm, expiraEm } ],
//     expiradosAcum, senhasExpiradasAcum, atualizadoEm }

// MC36.1 — troco em Supabase (troco-senhas-store). Escrita só Supabase (R11);
// leitura com fallback para o Blob legado (financeiro-fallback) durante a transição.
import { getTroco, setTroco, listTroco } from "./troco-senhas-store.mjs";
import { lerTrocoLegado } from "./financeiro-fallback.mjs";

export const VALOR_POR_SENHA_CENTAVOS = 200;       // R$ 2,00 por senha
export const TROCO_VALIDADE_DIAS      = 30;        // validade do troco
export const TROCO_AVISO_DIAS         = 5;         // aviso GUTO antes de expirar
const MS_DIA   = 24 * 60 * 60 * 1000;

function chave(endereco) {
  return String(endereco || "").toLowerCase();
}

function registroVazio() {
  return { lotes: [], expiradosAcum: 0, senhasExpiradasAcum: 0, atualizadoEm: null };
}

// Converte um excedente em centavos para nº inteiro de senhas (piso).
export function senhasDoExcedente(excedenteCentavos) {
  const c = Number(excedenteCentavos);
  if (!Number.isFinite(c) || c <= 0) return 0;
  return Math.floor(c / VALOR_POR_SENHA_CENTAVOS);
}

// Separa lotes em ativos/expirados face a `agora` (ms). Não persiste.
function separar(lotes, agora) {
  const ativos = [];
  const expirados = [];
  for (const l of (Array.isArray(lotes) ? lotes : [])) {
    if (new Date(l.expiraEm).getTime() <= agora) expirados.push(l);
    else ativos.push(l);
  }
  // FIFO: mais antigos primeiro (por criadoEm).
  ativos.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
  return { ativos, expirados };
}

function somaSenhas(lotes) {
  return lotes.reduce((s, l) => s + Number(l.senhas || 0), 0);
}

// Aplica expiração: remove lotes vencidos e acumula o histórico de expirados.
// Retorna { registro, expiradosAgora (lotes), senhasExpiradasAgora }.
function aplicarExpiracao(registro, agora) {
  const { ativos, expirados } = separar(registro.lotes, agora);
  const senhasExpiradasAgora = somaSenhas(expirados);
  const novo = {
    ...registro,
    lotes: ativos,
    expiradosAcum: Number(registro.expiradosAcum || 0) + expirados.length,
    senhasExpiradasAcum: Number(registro.senhasExpiradasAcum || 0) + senhasExpiradasAgora,
    atualizadoEm: new Date(agora).toISOString(),
  };
  return { registro: novo, expiradosAgora: expirados, senhasExpiradasAgora };
}

// Credita um lote de senhas de troco com validade de 30 dias.
// Idempotente por `idemKey` (se fornecida): re-execução não duplica o lote.
export async function creditarTroco({ endereco, senhas, origem = "excedente-cota", idemKey = null }) {
  const n = Math.floor(Number(senhas));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, code: "senhas_invalidas", message: "senhas deve ser inteiro > 0" };
  }
  const k     = chave(endereco);
  const agora = Date.now();
  // MC36.1 — lê Supabase + fallback Blob legado; escrita só Supabase.
  const atual = (await getTroco(k)) ?? (await lerTrocoLegado(k)) ?? registroVazio();

  // Expira o que já venceu antes de creditar o novo lote.
  const { registro: limpo } = aplicarExpiracao(atual, agora);

  if (idemKey && limpo.lotes.some((l) => l.id === idemKey)) {
    return { ok: true, idempotent: true, registro: limpo, saldoTroco: somaSenhas(limpo.lotes) };
  }

  const lote = {
    id:       idemKey || `troco-${k}-${agora}`,
    senhas:   n,
    origem,
    criadoEm: new Date(agora).toISOString(),
    expiraEm: new Date(agora + TROCO_VALIDADE_DIAS * MS_DIA).toISOString(),
  };
  const registro = { ...limpo, lotes: [...limpo.lotes, lote], atualizadoEm: lote.criadoEm };
  await setTroco(k, registro);
  return { ok: true, idempotent: false, lote, registro, saldoTroco: somaSenhas(registro.lotes) };
}

// Lê o saldo de troco, aplicando expiração (persistente). Distingue ativo de
// "a expirar em <=5 dias". Útil para UI, GUTO e leitura geral.
export async function lerTroco(endereco) {
  const k     = chave(endereco);
  const agora = Date.now();
  // MC36.1 — lê Supabase + fallback Blob legado.
  const atual = (await getTroco(k)) ?? (await lerTrocoLegado(k)) ?? registroVazio();
  const { registro, senhasExpiradasAgora } = aplicarExpiracao(atual, agora);

  // Persiste a remoção dos expirados só se houve mudança (evita escrita à toa).
  if (senhasExpiradasAgora > 0 || registro.lotes.length !== (atual.lotes?.length || 0)) {
    await setTroco(k, registro); // escrita só Supabase (R11)
  }

  const limiteAviso = agora + TROCO_AVISO_DIAS * MS_DIA;
  const lotesExpirando = registro.lotes.filter((l) => new Date(l.expiraEm).getTime() <= limiteAviso);
  return {
    saldoTroco:        somaSenhas(registro.lotes),
    lotes:             registro.lotes,
    expiramEmBreve:    somaSenhas(lotesExpirando),     // senhas que expiram em <=5d
    lotesExpirando,
    senhasExpiradasAgora,                              // expiradas NESTA leitura (p/ GUTO "expiraram hoje")
    expiradosAcum:        Number(registro.expiradosAcum || 0),
    senhasExpiradasAcum:  Number(registro.senhasExpiradasAcum || 0),
  };
}

// Consome `qtd` senhas de troco FIFO (lotes mais antigos primeiro).
// Retorna { ok, consumidas, restante, saldoDepois }. Não converte on-chain.
export async function consumirTrocoFIFO({ endereco, qtd }) {
  const pedir = Math.floor(Number(qtd));
  if (!Number.isFinite(pedir) || pedir <= 0) {
    return { ok: false, code: "qtd_invalida", message: "qtd deve ser inteiro > 0" };
  }
  const k     = chave(endereco);
  const agora = Date.now();
  // MC36.1 — lê Supabase + fallback Blob legado.
  const atual = (await getTroco(k)) ?? (await lerTrocoLegado(k)) ?? registroVazio();
  const { registro } = aplicarExpiracao(atual, agora);

  const disponivel = somaSenhas(registro.lotes);
  if (disponivel < pedir) {
    await setTroco(k, registro); // persiste expiração mesmo sem consumo (só Supabase)
    return { ok: false, code: "troco_insuficiente",
             message: `Troco insuficiente: ${disponivel} < ${pedir}`,
             saldoTroco: disponivel };
  }

  let restanteConsumir = pedir;
  const novosLotes = [];
  for (const lote of registro.lotes) { // já ordenado FIFO em separar()
    if (restanteConsumir <= 0) { novosLotes.push(lote); continue; }
    const usa = Math.min(Number(lote.senhas), restanteConsumir);
    const sobra = Number(lote.senhas) - usa;
    restanteConsumir -= usa;
    if (sobra > 0) novosLotes.push({ ...lote, senhas: sobra });
  }
  const final = { ...registro, lotes: novosLotes, atualizadoEm: new Date(agora).toISOString() };
  await setTroco(k, final); // escrita só Supabase (R11)
  return { ok: true, consumidas: pedir, restante: somaSenhas(novosLotes), saldoDepois: somaSenhas(novosLotes) };
}

// Resumo agregado para o relatório do Admin: total ativo e total expirado.
export async function resumoTrocoAdmin() {
  const agora = Date.now();
  let senhasAtivas = 0, senhasExpiradas = 0, lojistas = 0;
  const detalhe = [];
  try {
    // MC36.1 — lista via Supabase (substitui store.list() do Blob).
    const lista = await listTroco();
    for (const { cliente_id, payload: reg } of lista) {
      if (!reg) continue;
      lojistas += 1;
      const { ativos } = separar(reg.lotes, agora);
      const ativasReg = somaSenhas(ativos);
      // expiradas históricas + as que venceram mas ainda não foram purgadas
      const venceuNaoPurgado = somaSenhas((reg.lotes || []).filter(
        (l) => new Date(l.expiraEm).getTime() <= agora));
      const expiradasReg = Number(reg.senhasExpiradasAcum || 0) + venceuNaoPurgado;
      senhasAtivas += ativasReg;
      senhasExpiradas += expiradasReg;
      detalhe.push({ lojista: cliente_id, ativas: ativasReg, expiradas: expiradasReg });
    }
  } catch (err) {
    console.warn("[troco-senhas] resumoTrocoAdmin falhou:", err?.message);
  }
  return { lojistas, senhasAtivas, senhasExpiradas, detalhe };
}
