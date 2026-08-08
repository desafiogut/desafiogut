// dicaSessao — o que se pode saber sobre a sessão ANTES de o Privy responder.
//
// MC89.31. O restauro da sessão Privy custa ~1,3 s no APK (medido). Durante essa
// janela `address` é null e a app não sabe QUEM está a usá-la — mas o disco sabe.
// Este módulo lê essa informação de forma SÍNCRONA, a tempo do primeiro render.
//
// ⚠️ TUDO O QUE ESTÁ AQUI SERVE PARA ENCAMINHAR, NUNCA PARA AUTORIZAR.
// Um palpite errado manda alguém para uma porta; quem decide se ela abre é o
// backend. As três defesas do painel admin continuam de pé e intocadas:
//   1. AdminLayout: `if (!isAdmin) → "Acesso restrito"` (isAdmin real, do backend)
//   2. AdminAuthContext: sessão admin exige assinatura EIP-191 + ADMIN_TOKEN
//   3. Backend: fail-closed no Postgres, níveis por endereço (MC89.11)
//
// PORQUE UMA CHAVE SEPARADA DO `gut_admin_check`:
// `gut_admin_check` é a resposta de AUTORIZAÇÃO e tem TTL de 5 min de propósito
// — promover ou despromover um admin tem de propagar depressa (useAdmin.js:10-13).
// Esse TTL curto NÃO é tocado. Mas medi no MC89.31-S0 que o cache frio custa o
// mesmo que o quente (1430 ms vs 1314 ms), logo um palpite preso àqueles 5 min
// corrigiria "reabri agora mesmo" e deixaria de pé "reabri amanhã" — que é o
// caso que o operador descreveu. A dica de encaminhamento vive 24 h.
//
// É exatamente a assimetria que o MC88.42 já usa para o lojista, e que o MC89.36
// pôs a viver neste mesmo módulo (ver `CHAVE_LOJISTA`):
//     lojista : gut_corporativo_hint (24 h, encaminha) + cotaCorporativa (servidor, autoriza)
//     admin   : gut_admin_hint       (24 h, encaminha) + gut_admin_check  (5 min, autoriza)

const CHAVE_DICA = "gut_admin_hint";
const TTL_MS     = 24 * 60 * 60 * 1000; // 24 h — igual ao cache de saldo (MC88.34)

// MC89.36 — a dica do LOJISTA, agora com chave própria.
//
// ANTES vivia dentro do `gut_saldo_cache`, como o campo `tipoConfirmado`. Isso
// parecia arrumação e era um defeito: o `gut_saldo_cache` pertence à guarda de
// coerência do SALDO (AppContext, MC88.34), que o apaga inteiro no logout para
// que o saldo de A nunca apareça a B. Essa guarda está certa para o que foi
// escrita — só que levava à frente um valor que não é saldo, não é dado pessoal,
// e cuja regra de invalidação é outra.
//
// CONSEQUÊNCIA MEDIDA (MC89.35, tabela de decisão 10/10): o palpite do lojista
// morria em SEIS cenários — logout, troca de conta, mais de 24 h, primeiro
// login, reinstalação, sessão ilegível — e dois deles são exatamente o gesto que
// o operador usa para testar. O ADM não sofria do mesmo porque `gut_admin_hint`
// tem chave própria e `limparDicaAdmin` não tem um único ponto de chamada no
// produto. A assimetria nunca foi decidida; era só onde cada um foi guardado.
//
// Com chave própria, o palpite do lojista passa a ter o MESMO ciclo de vida do
// do ADM. As guardas são as mesmas três (ver `lojistaProvavel`), incluindo a que
// o ancora ao endereço da sessão em disco.
const CHAVE_LOJISTA = "gut_corporativo_hint";

function storagePadrao() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * Endereço da sessão Privy, lido do localStorage de forma SÍNCRONA.
 *
 * `privy:connections` NÃO é credencial — é o endereço público da carteira.
 * Lê-lo não infringe a regra de não manusear segredos: os tokens vivem noutras
 * chaves e não são tocados aqui. (Nota herdada do MC88.34, onde esta guarda
 * nasceu depois de um teste por mutação mostrar o saldo de OUTRA conta pintado
 * durante 2,7 s por falta dela.)
 *
 * @returns {string|null} endereço em minúsculas, ou null se não houver sessão.
 */
export function enderecoSessaoSincrono(storage = storagePadrao()) {
  try {
    const raw = storage?.getItem("privy:connections");
    if (!raw) return null;
    const m = raw.match(/0x[a-fA-F0-9]{40}/);
    return m ? m[0].toLowerCase() : null;
  } catch { return null; }
}

/**
 * Grava a dica de encaminhamento depois de o BACKEND ter respondido.
 *
 * Chamada com `isAdmin === false` apaga a dica em vez de gravar uma negativa:
 * é o que corrige um ex-admin despromovido logo no primeiro restauro em que o
 * backend responde, sem esperar pelas 24 h. Mesmo desenho do `tipoConfirmado`
 * do MC88.42, que também se apaga quando o lojista deixa de o ser.
 */
export function gravarDicaAdmin(endereco, isAdmin, storage = storagePadrao()) {
  if (!storage || !endereco) return;
  try {
    if (!isAdmin) { storage.removeItem(CHAVE_DICA); return; }
    storage.setItem(CHAVE_DICA, JSON.stringify({
      endereco: String(endereco).toLowerCase(),
      isAdmin: true,
      em: Date.now(),
    }));
  } catch { /* storage cheio ou indisponível — a dica é best-effort */ }
}

/** Remove a dica (logout, troca de conta, invalidação manual). */
export function limparDicaAdmin(storage = storagePadrao()) {
  try { storage?.removeItem(CHAVE_DICA); } catch { /* idem */ }
}

/**
 * `true` quando há razão para crer que quem tem a sessão em disco é admin.
 *
 * Três condições, todas obrigatórias:
 *   1. existe dica e não expirou (24 h);
 *   2. a dica diz isAdmin === true;
 *   3. o endereço da dica é o MESMO de `privy:connections`.
 *
 * A condição 3 é a que impede que uma dica escrita à mão sirva de alguma coisa:
 * quem puser `isAdmin:true` com o SEU endereço vê o redirect e a seguir
 * "Acesso restrito" — exatamente o que já veria hoje ao escrever /admin na barra
 * de endereço. Não há ganho de superfície de ataque.
 */
// ⚠️ NÃO ACRESCENTAR AQUI UMA "PAUSA" DO ENCAMINHAMENTO (decisão do MC89.34).
//
// Chegou a existir: `pausarPainelAdmin/retomarPainelAdmin/painelAdminPausado`,
// em sessionStorage, para o botão "Sair do painel" levar o ADM ao Dashboard
// comum. Foi implementada, testada (7/7 por mutação) e validada no aparelho —
// e depois REVERTIDA por decisão do operador: as telas de utilizador comum não
// devem existir para o ADM, de todo. O painel é a app inteira dele.
//
// Se um dia isto voltar a ser pedido, o que se quer é quase de certeza outra
// coisa: uma forma de SAIR (ver "Sair da conta" no AdminLayout), e não uma
// forma de o admin navegar como consumidor.

export function adminProvavel(storage = storagePadrao()) {
  try {
    const raw = storage?.getItem(CHAVE_DICA);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.isAdmin !== true) return false;
    if (!Number.isFinite(d.em) || Date.now() - d.em > TTL_MS) return false;
    const sessao = enderecoSessaoSincrono(storage);
    if (!sessao) return false;
    return String(d.endereco).toLowerCase() === sessao;
  } catch { return false; }
}

// ─── Dica do LOJISTA (MC89.36) ───────────────────────────────────────────────
// Gémea da do ADM, de propósito: mesmas três guardas, mesmo TTL, mesma regra de
// apagar-em-vez-de-gravar-negativa. Onde as duas divergirem, alguém terá de
// explicar porquê — foi divergirem sem querer que criou o defeito do MC89.35.

/**
 * Grava a dica do lojista depois de o BACKEND ter respondido.
 *
 * Chamada com `eCorporativo === false` APAGA a dica em vez de gravar uma
 * negativa. É o que solta um ex-lojista do painel antigo logo no primeiro
 * restauro em que /cotas responde, sem esperar pelas 24 h — exatamente o que a
 * linha que isto substitui já fazia (`tipoConfirmado: … : null`).
 */
export function gravarDicaLojista(endereco, eCorporativo, storage = storagePadrao()) {
  if (!storage || !endereco) return;
  try {
    if (!eCorporativo) { storage.removeItem(CHAVE_LOJISTA); return; }
    storage.setItem(CHAVE_LOJISTA, JSON.stringify({
      endereco: String(endereco).toLowerCase(),
      corporativo: true,
      em: Date.now(),
    }));
  } catch { /* storage cheio ou indisponível — a dica é best-effort */ }
}

/** Remove a dica do lojista (troca de conta, invalidação manual). */
export function limparDicaLojista(storage = storagePadrao()) {
  try { storage?.removeItem(CHAVE_LOJISTA); } catch { /* idem */ }
}

/**
 * `true` quando há razão para crer que quem tem a sessão em disco é lojista.
 *
 * As MESMAS três condições do `adminProvavel`, todas obrigatórias:
 *   1. existe dica e não expirou (24 h);
 *   2. a dica diz corporativo === true;
 *   3. o endereço da dica é o MESMO de `privy:connections`.
 *
 * ⚠️ A condição 3 é a que impede que uma dica escrita à mão sirva de alguma
 * coisa. Quem puser `corporativo:true` com o SEU endereço vê o redirect e a
 * seguir é expulso por `CorporativoRoute` assim que /cotas responder que não tem
 * cota — o mesmo que já veria hoje ao escrever /corporativo na barra de
 * endereço. Não há ganho de superfície de ataque: isto ENCAMINHA, não autoriza.
 *
 * ⚠️ E NÃO é dado pessoal: é a string "corporativo" associada a um endereço
 * público que já está no disco, em `privy:connections`.
 */
export function lojistaProvavel(storage = storagePadrao()) {
  try {
    const raw = storage?.getItem(CHAVE_LOJISTA);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.corporativo !== true) return false;
    if (!Number.isFinite(d.em) || Date.now() - d.em > TTL_MS) return false;
    const sessao = enderecoSessaoSincrono(storage);
    if (!sessao) return false;
    return String(d.endereco).toLowerCase() === sessao;
  } catch { return false; }
}
