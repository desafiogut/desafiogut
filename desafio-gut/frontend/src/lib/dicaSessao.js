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
// É exatamente a assimetria que o MC88.42 já usa para o lojista:
//     lojista : tipoConfirmado  (24 h, encaminha) + cotaCorporativa (servidor, autoriza)
//     admin   : dica desta chave (24 h, encaminha) + gut_admin_check (5 min, autoriza)

const CHAVE_DICA = "gut_admin_hint";
const TTL_MS     = 24 * 60 * 60 * 1000; // 24 h — igual ao cache de saldo (MC88.34)

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
