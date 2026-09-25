// scheduled-anuncio-especial.mjs — MC94.5.
//
// O GUTO avisa os testadores, UMA única vez, 24 h antes da rodada especial:
//   alvo  = 03/10/2026 20:00 (Brasília) = 2026-10-03T23:00:00.000Z
//   envio = mensagem in-app na loja de notificações do participante (MC15.7)
//
// ═══════════════════════════════════════════════════════════════════════════
// PORQUE ESTE FICHEIRO EXISTE (e o que o SEG-1 mediu, porque não era óbvio)
// ═══════════════════════════════════════════════════════════════════════════
// O canal do participante JÁ EXISTIA e funciona ponta a ponta — foi preciso
// medir para o saber, porque há DUAS coisas chamadas «notificações» no projecto:
//
//   1) `_lib/notificacoes-usuario.mjs` → Blob por endereço. É AQUI que se
//      escreve. Lido por `GET /notificacoes`, no ramo do PARTICIPANTE
//      (`getParticipante(req)` → `lerNotificacoes(endereco)`), e mostrado pelo
//      `ChatbotWidget.jsx` — o widget do GUTO, presente em todas as rotas —
//      que conta o badge `🔔 N` e injeta cada mensagem como CARD no chat.
//      Um `tipo` DESCONHECIDO cai no fallback `|| "notificacao"` e aparece na
//      mesma: é isso que torna esta mensagem visível sem tocar no frontend.
//   2) `GET /notificacoes` no ramo ADMIN → eventos DERIVADOS on-read
//      (`tempo_limite_5min`, `sistema_pausado`, …), sem store próprio. É outra
//      coisa, com o mesmo nome.
//
// ⛔ E o comentário em `AppContext.jsx:337` diz «notificacoes: array de eventos
//    vindos de GET /notificacoes (admin-only)» — é FALSO: o endpoint tem ramo de
//    participante. Se alguém tiver lido só esse comentário, conclui que o canal
//    não existe. (Mesma classe dos «96 px» e do `createOnLogin` já corrigidos.)
//
// ⛔ PUSH NÃO EXISTE: `admin-notify.mjs` devolve 501 para `canal: "push"`
//    («será implementado após Firebase + APK novo»). Logo: in-app, como o
//    operador previu no briefing.
//
// ═══════════════════════════════════════════════════════════════════════════
// PÚBLICO (R18, 2026-09-25) — decisão do operador
// ═══════════════════════════════════════════════════════════════════════════
// «Todos os que se autenticaram antes de uma data que eu indico», via
// `atividade_utilizadores`. Data indicada: 02/10/2026 23:59 (Brasília).
//
// ⚠️ PORQUE NÃO «os testadores» em sentido estrito: mediu-se que o CÓDIGO NÃO
//    SABE quem são. `atividade_utilizadores` tem `endereco, primeiro_acesso,
//    ultimo_acesso, acessos` — nenhum campo de testador; `registarAtividade`
//    corre em `auth-user.mjs`, logo regista TODOS os que fazem login; e não há
//    um único marcador de testador/beta no projecto. Os testadores vivem na
//    lista da Play Console, fora da app. Isto é uma APROXIMAÇÃO — declarada,
//    escolhida pelo operador entre as opções medidas — não um facto.
//
// ═══════════════════════════════════════════════════════════════════════════
// IDEMPOTÊNCIA — duas camadas, e porque NÃO se copiou o irmão
// ═══════════════════════════════════════════════════════════════════════════
// O irmão `scheduled-encerrar-especial.mjs` grava o marcador ANTES de agir,
// porque a acção dele é uma transacção on-chain que CUSTA DINHEIRO: um
// duplicado custa, uma perda resolve-se à mão. Aqui é o contrário — o custo de
// um duplicado é um card repetido, e o custo de uma perda é um anúncio que
// nunca chegou. Logo a ordem inverte-se:
//
//   camada 1 — o marcador (`anuncio-especial:ESPECIAL-AIRFRYER-24h`) é gravado
//              DEPOIS de o ciclo de envio terminar: garante «uma única vez» no
//              caminho normal (o cron de 5 em 5 minutos não repete);
//   camada 2 — `adicionarNotificacao` já ignora um duplicado NÃO-LIDO com a
//              mesma chave `tipo:edicaoId:valor`. Se o lambda for morto a meio
//              do ciclo, o tick seguinte volta a correr (sem marcador) e esta
//              camada impede que quem já recebeu receba de novo.
//
// A decisão de inverter a ordem é DELIBERADA e está aqui escrita para que
// ninguém a «corrija» para o padrão do irmão sem perceber que o risco é outro.
//
// FAIL-SOFT: qualquer erro é registado e o tick termina; o caminho manual é o
// `POST /admin-notify` (canal inapp, destino específico), que já existe.

import { schedule } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { adicionarNotificacao } from "./_lib/notificacoes-usuario.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";

// ── Constantes (exportadas: os testes medem-nas em vez de as repetirem) ──────

/** Edição anunciada. */
export const EDICAO = "ESPECIAL-AIRFRYER";

/** 03/10/2026 20:00 Brasília (UTC-3) = 23:00 UTC. */
export const ALVO_ISO = "2026-10-03T23:00:00.000Z";

/** 02/10/2026 23:59 Brasília = 03/10 02:59 UTC — corte de `primeiro_acesso`. */
export const CORTE_TESTADORES_ISO = "2026-10-03T02:59:00.000Z";

/** De 5 em 5 minutos: se o tick do minuto exacto falhar, o seguinte apanha. */
export const CRON = "*/5 * * * *";

/** Store/Chave do marcador de envio único. */
export const STORE_MARCADOR = "anuncio-especial";
export const CHAVE_MARCADOR = `${EDICAO}-24h`;

/** Tipo da notificação. Desconhecido para o frontend → cai no fallback e aparece. */
export const TIPO = "anuncio_especial";

/** Texto (PT-BR, único idioma — R18). Sugerido pelo operador; sujeito a confirmação. */
export const MENSAGEM =
  "Faltam 24h! Amanhã às 20h começa a rodada especial da Air Fryer. " +
  "É relâmpago: lance a partir de R$ 0,01, debita do saldo. " +
  "Só 30 minutos. Não fica de fora!";

/**
 * Deve disparar agora? PURA — é a regra que os testes medem e as mutações quebram.
 * @param {{agoraMs?:number, alvoMs?:number, jaEnviado?:boolean}} p
 * @returns {{disparar:boolean, motivo:string}}
 */
export function decidirDisparo({ agoraMs, alvoMs = Date.parse(ALVO_ISO), jaEnviado = false } = {}) {
  if (jaEnviado) return { disparar: false, motivo: "ja_enviado" };
  if (!Number.isFinite(agoraMs)) return { disparar: false, motivo: "agora_invalido" };
  if (agoraMs < alvoMs) return { disparar: false, motivo: "antes_do_alvo" };
  return { disparar: true, motivo: "no_alvo" };
}

/** Endereço válido no formato usado em todo o projecto. */
const RE_ENDERECO = /^0x[0-9a-f]{40}$/;

/**
 * O público: endereços com `primeiro_acesso <= corte`, normalizados para minúsculas.
 * Lança se a leitura falhar (o chamador trata — fail-soft no tick, mas sem
 * marcar como enviado, para poder tentar de novo).
 * @param {{corteIso?:string, sb?:object}} p
 * @returns {Promise<string[]>}
 */
export async function listarPublico({ corteIso = CORTE_TESTADORES_ISO, sb = null } = {}) {
  const db = sb || getSupabaseReadOnly();
  const { data, error } = await db
    .from("atividade_utilizadores")
    .select("endereco")
    .lte("primeiro_acesso", corteIso);
  if (error) throw new Error(`atividade_utilizadores: ${error.message || error}`);
  const vistos = new Set();
  for (const linha of data || []) {
    const e = String(linha?.endereco || "").toLowerCase();
    // A tabela pode trazer linhas legadas/estranhas: só endereços válidos entram.
    if (RE_ENDERECO.test(e)) vistos.add(e);
  }
  return [...vistos];
}

/**
 * O NÚCLEO do tick, com tudo injectável (relógio, store, cliente de dados) — para os
 * testes medirem a lógica REAL com um relógio simulado, sem truques de timezone nem
 * de mock de `Date`. O `handler` abaixo é fino de propósito (mesmo desenho de
 * `consolidar-lances.mjs` → `_lib/consolidacao.mjs`).
 *
 * @param {{agoraMs?:number, store?:object, sb?:object, dryRun?:boolean, notificar?:Function}} p
 * @returns {Promise<{acao:string, motivo?:string, total?:number, escritas?:number, naoEscritas?:number}>}
 */
export async function executarTick({
  agoraMs = Date.now(),
  store = null,
  sb = null,
  dryRun = process.env.ANUNCIO_ESPECIAL_DRY_RUN === "1",
  notificar = adicionarNotificacao,
} = {}) {
  // 1. Marcador. Sem o conseguir ler, NÃO se envia: perder um tick é recuperável
  //    (o cron volta em 5 min); um segundo envio a toda a gente não é.
  let jaEnviado = false;
  try {
    const st = store || getStore({ name: STORE_MARCADOR, consistency: "strong" });
    store = st;
    jaEnviado = !!(await st.get(CHAVE_MARCADOR, { type: "json" }));
  } catch (err) {
    console.error("[anuncio-especial] marcador ilegível — tick abortado:", err?.message);
    return { acao: "abortado", motivo: "marcador_ilegivel" };
  }

  // 2. É a hora?
  const d = decidirDisparo({ agoraMs, jaEnviado });
  if (!d.disparar) {
    console.log(`[anuncio-especial] sem disparo (${d.motivo})`);
    return { acao: "sem_disparo", motivo: d.motivo };
  }

  // 3. Público.
  let publico;
  try {
    publico = await listarPublico({ sb });
  } catch (err) {
    console.error("[anuncio-especial] público indisponível — tick abortado:", err?.message);
    return { acao: "abortado", motivo: "publico_indisponivel" }; // sem marcador: tenta no próximo tick
  }

  // 4. Ensaio: calcula tudo e não escreve nada.
  if (dryRun) {
    console.log(`[anuncio-especial:ENSAIO] dispararia para ${publico.length} endereço(s); nada escrito.`);
    return { acao: "ensaio", total: publico.length };
  }

  // 5. Enviar.
  let escritas = 0;
  let naoEscritas = 0;
  for (const endereco of publico) {
    try {
      const ok = await notificar(endereco, { tipo: TIPO, edicaoId: EDICAO, valor: null, mensagem: MENSAGEM });
      if (ok) escritas++; else naoEscritas++; // false = dedupe (camada 2) ou store indisponível
    } catch (err) {
      naoEscritas++;
      console.warn(`[anuncio-especial] falha a notificar ${String(endereco).slice(0, 10)}…:`, err?.message);
    }
  }

  // 6. Marca DEPOIS (ver o cabeçalho: aqui o risco é perder o anúncio, não duplicá-lo).
  try {
    await store.setJSON(CHAVE_MARCADOR, {
      enviadoEm: new Date(agoraMs).toISOString(),
      edicao: EDICAO,
      total: publico.length,
      escritas,
      naoEscritas,
      corte: CORTE_TESTADORES_ISO,
    });
  } catch (err) {
    console.error("[anuncio-especial] falha a gravar o marcador:", err?.message);
  }

  console.log(`[anuncio-especial] anunciado: ${escritas} escrita(s), ${naoEscritas} não-escrita(s), de ${publico.length}.`);
  return { acao: "anunciado", total: publico.length, escritas, naoEscritas };
}

/** O handler agendado: uma linha, para o núcleo ficar testável. */
export const handler = schedule(CRON, () => executarTick());
