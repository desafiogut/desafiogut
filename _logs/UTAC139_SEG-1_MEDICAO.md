# UTAC139 — SEG-1 MEDIÇÃO (correcção visual da Edição Especial: padronização e exibição)

Enunciado: «CORREÇÃO VISUAL DA EDIÇÃO ESPECIAL: PADRONIZAÇÃO E EXIBIÇÃO» (operador → Hermes, 2026-11-18 02:42 -03:00).
Numerado **UTAC139** (último fechado: UTAC138, commit `fd770db`). Só leitura neste segmento.
Medido em 2026-11-18 02:45–03:15 -03:00. **Nenhum ficheiro do repo foi alterado.**

## 1. Estado do repo (premissa do GATE 1)
- HEAD `fd770db` em `main`. Trabalho alheio não commitado: `.agents/skills/aidesigner-frontend/*`, `.gitignore`, `.mcp.json`,
  `desafio-gut/frontend/package-lock.json` e dezenas de `_logs/MC1xx*` por versionar ⇒ **não são meus, não tocados**.
- Commits de hoje que já tocam exactamente o objecto deste enunciado:
  `cb2748f feat(UTAC138): a edição especial entra no padrão das edições — Início e Menor Lance Único`
  → `e9fff51 fix(UTAC138): na aba Menor Lance Único a tabela de lances segue a edição especial` → `fd770db docs(UTAC138): fecho`.
- Deploy publicado: `6afd3105498caea6d5020a8b`, criado **2026-11-18T05:00:53Z** (= 02:00 BRT), ou seja **depois** do último commit
  de código (`e9fff51`). Site `silly-stardust-ca71bc` (sem domínio próprio configurado no Netlify).

## 2. ⚠️ Conflito enunciado × repositório (declarado, não reinterpretado)
O enunciado descreve o estado **anterior** ao UTAC138: «o Opus 5.5 criou um layout customizado e transparente … exibiu a edição
apenas no Início». Medição: esse estado **já não existe** — foi substituído dentro do próprio UTAC138 (a pedido do operador,
registado no relatório de fecho do UTAC138 §«A especial no padrão das edições»). O que sobra por fazer da letra do enunciado é
**nada de visual**; ver §7 (órfãos) e §8 (id).

## 3. Frente A — padronização do layout (medido no código)
| item do enunciado | medido | veredicto |
|---|---|---|
| localizar `CardEdicaoEspecial.jsx` | `src/components/edicao-especial/CardEdicaoEspecial.jsx` (144 l.) | existe |
| usar o cartão padrão como base | `CardEdicaoEspecial.jsx:42` `import CartaoEdicao from "../CartaoEdicao.jsx"`; devolve `<CartaoEdicao acao="lance" …>` (l. 130-141) | **feito** |
| remover transparência | `globals.css` não tem **nenhuma** regra com a palavra `especial`; o vidro é o `.gut-glass-standard` (`background: rgba(13,18,53,0.88)`, **sem** `backdrop-filter`) | **feito** |
| cronómetro integrado no padrão | o `tempo` é passado ao cartão (`tempo={tempo}`, l. 137) e desenhado na faixa da arte, como nas edições normais | **feito** |
| imagem grande com `object-fit` | `CartaoEdicao.jsx:139-140` `<img data-testid="cartao-arte" … style={{width:"100%", aspectRatio: formato, objectFit:"cover"}}>` | **feito** |

Notas:
- O `div[data-slot="edicao-especial"]` tem `background-color: rgba(0,0,0,0)` — é o **invólucro sem superfície**; a superfície visível
  é o `.gut-glass-standard` interno. Não é o «card transparente» do enunciado.
- `ContagemDecrescente.jsx` (o cronómetro grande do layout antigo) já **não é montado** em código de produção — só os testes o importam.
  A lógica de contagem vive em `_estilo-especial.js` (`alvoDaContagem`, `formatarContagem`) e o tick em `useAgoraServidor`
  (dentro do `CardEdicaoEspecial`). **A lógica do cronómetro foi preservada**, como o enunciado exige.

## 4. Frente B — exibição nas duas abas (medido em PRODUÇÃO, DOM ao vivo)
Medição no site publicado, com o gate LGPD aceite (4 caixas + botão), expressão devolvida pelo `browser_console`:

Início (`/`):
```
{achou:true, estado:"agendada", edicao:"ESPECIAL-RELAMPAGO1", vidro:true,
 vbg:"rgba(13, 18, 53, 0.88)", bf:"none", fit:"cover", w:928, h:522,
 arte:"https://vjslwowwrpcawijdiksm.supabase.co/storage/v1/object/public/artes-edicoes/especial-relampago-1.jpg",
 txt:"⚡ Relâmpago | ESPECIAL-RELAMPAGO1 | 🕒 Em breve | Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin | 12d 16:11:00"}
```
Menor Lance Único (`/mercado`):
```
{achou:true, estado:"agendada", edicao:"ESPECIAL-RELAMPAGO1", vbg:"rgba(13, 18, 53, 0.88)", bf:"none",
 fit:"cover", w:904, h:509, txt:"ESPECIAL-RELAMPAGO1 | 🕒 Em breve | Fritadeira … | 12d 16:10:39"}
```
- A especial ocupa o lugar do cartão Relâmpago nas **duas** páginas, com o mesmo vidro dos outros cartões (0.88, sem filtro)
  e a arte a 16:9 com `object-fit: cover` (928×522 no Início, 904×509 no Mercado).
- Filtro de busca: `GET /.netlify/functions/edicoes` devolve `ESPECIAL-RELAMPAGO1` em `"agendadas"` (não em `edicoes`), e as duas
  páginas usam `escolherEspecial(edicoes, agendadas, agoraMs)` (`_estilo-especial.js:151`) — o Mercado passa `agendadas`
  explicitamente (`MercadoLances.jsx:278-285`). **A query inclui a especial; nada a corrigir.**
- A arte servida é **byte-idêntica** ao ficheiro do operador: `sha256 1a3c474a333a2c6c7f6c8dd2629f13c0ceea829ab281dd21ed62edcd70d79699`
  (478 740 B) para `Desktop/EDICAO ESPECIAL.jpeg` **e** para o objecto do Storage.

## 5. Frente C — testes
- Harness canónico (`node scripts/mc966-suite-harness.mjs ambos < /dev/null`): `frontend: VERMELHO 2 falha(s)` ·
  `backend: VERDE 1499/1505 pass`.
- Detalhe do frontend (`node --test --test-concurrency=1`, 1418 ✔ / 2 ✖): **as duas falhas são as mesmas duas** de
  `src/__tests__/mc9952-seguranca-gate.test.mjs` — «(f) caminho do DNS» e «(g) o nome prefixado …» — que resolvem DNS real
  (`exemplo.com`, `cdn.jsdelivr.net`, `i.imgur.com`).
- **Causa medida, não presumida:** o resolver do sistema é `127.0.0.1` e **recusa** as resoluções
  (`resolve4('example.com') → ECONNREFUSED`; `reverse('127.0.0.1')` devolve domínios da Steam). Com o resolver a funcionar
  (`new Resolver().setServers(['8.8.8.8'])`) a mesma query devolve `172.66.147.243,104.20.23.154`.
  ⇒ o guard falha-fechado e bloqueia domínios legítimos ⇒ **RED de ambiente, não de código**.
- Não é regressão do UTAC138: os dois ficheiros estão **limpos** face ao HEAD (`git status` vazio) e o último commit que os tocou
  é anterior (`33e9c80 fix(MC99.5.2.1e)`); o fecho do UTAC138 mediu **1346/1346 frontend VERDE** com estes mesmos ficheiros.
- RAM livre no momento da suíte: **1 397 MB** (< 1 500 da A14). Aplicada a regra refinada da série: um VERDE com contagens
  exactas continua válido e **só um VERMELHO a baixa RAM é NÃO MEDI**; aqui o vermelho tem causa identificada (DNS) e
  reproduz-se fora da suíte.
- Conclusão honesta: **não há vermelho atribuível a este objecto**. A suíte de UI da especial (SSR) passa.

## 6. Órfãos encontrados (declarados; **não removidos** — decisão do operador)
1. `src/components/edicao-especial/ContagemDecrescente.jsx` — componente do cronómetro do layout antigo, **já não montado**
   (só `__tests__/especial.test.mjs` e a lista `COMPONENTES` de `especial-i18n.test.mjs` o referenciam).
   Removê-lo obriga a mexer na lista do teste de i18n e a apagar chaves `edicao.especial.*` nos **3** idiomas (o teste falha
   com chaves órfãs) — escopo que **não** é visual e que o enunciado não pede («manter o componente de contagem decrescente»).
   Proposta: remoção num UTAC de limpeza próprio, com o teste de i18n ajustado na mesma alteração.
2. `_estilo-especial.js` re-exporta `caixa` (sem consumidores) e exporta `janelaEmBrasilia` (sem consumidores).
   Zero efeito visual; mesma proposta de limpeza.
3. Nenhuma classe/classe CSS órfã da especial existe em `globals.css` (0 ocorrências de «especial»).

## 7. DIVERGÊNCIA DE ID (declarada, decisão já tomada no UTAC138)
O enunciado cita `ESPECIAL-RELAMPAGO-1`. O id real é **`ESPECIAL-RELAMPAGO1`** (sem o 2.º hífen): o regex de fonte de verdade
`EDICAO_ID_RE = ^(?:(PROG|RELAMP|R)-\d+|ESPECIAL-[A-Z0-9]+)$` (`_lib/edicoes-core.mjs:46`) recusa o segundo hífen, e a decisão
R18-138 do operador aceitou a forma sem hífen. **Não se renomeia nada** (renomear partiria edição publicada + histórico).

## 8. Veredito do SEG-1
**A LETRA DO ENUNCIADO JÁ ESTÁ CUMPRIDA NO HEAD `fd770db` E EM PRODUÇÃO** (deploy `6afd3105`, 02:00 BRT de hoje).
Classe do §7 de `utac-conflito-enunciado-repositorio.md`: executar o enunciado à letra seria **no-op** e publicaria no registo
uma correcção que não aconteceu. Entrega-se: medição + verificação adversarial (SEG4) + declaração dos órfãos.
