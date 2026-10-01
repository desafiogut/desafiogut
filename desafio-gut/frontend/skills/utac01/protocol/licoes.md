# LIÇÕES DA SÉRIE — protocolo da série UTAC (DesafioGUT)

Extraído dos UTACs fechados de **duas janelas** da série: a recente (**MC100 … MC105a.1**, fonte
primária) e citações mais antigas (**MC72 … MC99.5.3**, que vieram já referenciadas nos UTACs
recentes). Cada lição indica o UTAC que a originou. **Auto-contido.**

---

## Sobre como trabalhar

1. **Testar o USO, não só a FUNÇÃO** *(MC99.1, MC102.1a)*. Provar que o widget/botão/página
   funciona de ponta a ponta, não só o backend. Um teste unitário verde com o caminho real quebrado
   não conta.
2. **PoC a correr primeiro** *(MC102.1b, MC104.3, MC105a)*. Antes de tocar em código, um script
   pequeno que mede o comportamento actual. O PoC cresce ANTES de se mexer no alvo.
3. **A/B PAREADO** *(MC104.2, MC104.3, MC105a)*. Causalidade só se prova com **antes/depois** nos
   **mesmos dados**, braços alternados (HEAD, novo, HEAD, novo). Uma só fotografia não é prova.
4. **Controlo positivo obrigatório** *(MC102.1b)*. Se o instrumento não distingue o caso «errado»
   do «certo», o resultado verde não vale. Ex.: token errado tem de dar resposta diferente.
5. **Validador adversarial não é burocracia** *(MC98, MC99.5.1, MC104.3, MC105a)*. Subagente
   independente, em worktree próprio, instruído a **TENTAR REFUTAR**. Já derrubou conclusões em
   5 UTACs seguidos (MC98 refutou A2, A3 e A7).
6. **Mutação obrigatória (T1)** *(toda a série)*. Todo o teste que nasce verde prova-se
   introduzindo a falha que devia apanhar → **RED** → restaurar → md5 idêntico.
7. **NUNCA `git add -A`** *(8× na série)*. Arrasta `_tmp*`, scratch e ficheiros de sessão.
   Adicionar ficheiro a ficheiro.

## Sobre o que corre mal

8. **O enunciado deriva do código** *(medido em todos os UTACs de 6 seguidos)*. Baseline errado,
   contagem redonda, caminho de ficheiro errado. **Sinais de alarme:** contagem redonda
   (528/826), lista explícita de ficheiros, um `find` que devolve nada. Protocolo: medir →
   executar a INTENÇÃO → declarar o desvio com o número.
9. **`Object.hasOwn` para leitura estrita** *(MC103)*. Ler chaves de objecto sem herdar o protótipo;
   `in`/`obj[key]` mentem com `constructor`, `__proto__`, etc.
10. **Duplos de bibliotecas copiados do `dist/` real** *(MC102.0)*. Um duplo inventado mente;
    copiar o comportamento do pacote real (código de erro exacto, `data:null`, `->>` em texto).
11. **`netlify env:set` imprime o valor** *(MC102.1b)*. Nunca usar `env:set` para segredos com eco
    visível; ler sempre via script que só imprime nome/tamanho.
12. **A API externa pode responder 200 aos erros** *(MC102.1b — Frenet)*. Ler o `ErrorMessage`;
    um código sem eventos **não é** erro. O token autentica sempre: medir com um controlo positivo.
13. **Dados fiscais preservados** *(MC104.x)*. NF-e, `txHash`, `commitmentHash` e rastreio **nunca**
    são anonimizados nem apagados. Prova: teste literal + `deepEqual` do resto do registo.
14. **Anonimizar ≠ apagar** *(MC104.2, MC104.3)*. Substituir por `anon:<sha256>` (pseudónimo) é
    diferente de apagar; o número de chaves mantém-se. Nunca apagar o que tem de ser retido.
15. **O texto promete mais do que o código** *(MC104.3)*. «Anónimo» quando é pseudónimo; «não
    mantemos dados identificáveis» quando se mantém o hash. O validador apanha; corrigir o texto.
16. **Um mutante equivalente declara-se** *(MC105a)*. Se a construção impede matar o mutante
    (ex.: `id` é chave primária), declara-se equivalente em vez de forçar um teste artificial.
17. **Concorrência expõe o que o teste sequencial esconde** *(MC105a, MC105a.1)*. 10 cliques
    simultâneos revelaram 402 falso e cobrança sem reembolso. Testar com `Promise.all`.
18. **Compensação tem custo** *(MC105a)*. Sem chave de idempotência, o par débito+reembolso deixa o
    saldo a descer 2× por instantes numa corrida — registar, não esconder.
