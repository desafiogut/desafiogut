# Edição especial — configuração dinâmica (UTAC140 / UTAC140b)

As edições especiais vivem no Blob **`edicoes-metadata`** (chave = id `ESPECIAL-<A-Z0-9>`, sem segundo hífen).
Desde o UTAC140b, o comportamento da especial lê-se **da própria edição**. Mudar um destes campos não precisa
de deploy nem de migração. Campos ausentes ou inválidos caem no valor por omissão.

| Campo | Tipo | Omissão | Efeito |
|---|---|---|---|
| `produto` | texto | — (o GUTO usa «Air Fryer» se faltar) | nome do produto no cartão, no GUTO e no resultado |
| `inicio_em` / `termino_em` | ISO 8601 | — | janela de lances. O cronómetro conta até `termino_em` («A apuração será em:») |
| `status` | `aberto` / `encerrado` / `apurado` | `aberto` | `encerrado`/`apurado` fecham a edição antes da hora |
| `rankingAoVivo` | boolean | `true` | regista cada lance na tabela ao vivo (Supabase `ranking_especial`: ordem de chegada, sem valor) |
| `passeACadaLances` | inteiro 0..100 | `3` | UTAC142.1 (R18-142.1-A): o lance gasta **só pontos** e passa sem Passe. Quem tem Passe Relâmpago gasta 1 a cada N lances (3.º, 6.º, 9.º…), depois de o lance existir. `0` desliga. O bónus +100 continua na compra. Substitui o `passePorLance` do UTAC142 (R18-142-C) |
| `avisosLider` | boolean | `true` | UTAC142 (R18-142-E): o GUTO avisa, de 5 em 5 min (`scheduled-lider-especial`), quem passou a ter, perdeu ou voltou a ter o menor lance único. Sem valores na mensagem. «Portador» = Passe no inventário ou Passe gasto nesta edição |
| `top10.publico` | boolean | `true` | o Top 10 público leva os valores. Tem de ficar `true` enquanto houver APK v12 (ele só desenha linhas com valor — R18-140-G) |
| `top10.janelaHoras` | inteiro 1..720 | `24` | durante quanto tempo, depois do fim, se serve a tabela completa (Meus Ativos) |
| `top10.exigePasse` | boolean | `true` | a tabela completa de Meus Ativos exige Passe (Relâmpago ou Programado) |
| `guto.boasVindas` | texto ≤ 600 | frase do UTAC140 | frase de boas-vindas do GUTO. `{produto}` e `{apuracao}` são substituídos (ex.: «30/11 às 20h») |

O GUTO anuncia a especial **em curso ou por abrir que termina primeiro**. O Início, o Menor Lance Único e Meus
Ativos escolhem a especial pela regra `escolherEspecial` (a que ainda não acabou; senão a última, até 24 h
depois do fim). Na BD, a RLS e a RPC `get_ranking_especial(p_edicao_id)` aceitam qualquer `ESPECIAL-*`
(migração `20261119_utac140b_ranking_especial_dinamico.sql`).

⚠️ Mesmo que a configuração o permita, o GUTO nunca revela valores antes do fim. O sigilo está no prompt e nas
guardas `especialAindaSecreta` do `chatbot.mjs`, não num campo da edição.

Para escrever: `netlify blobs:get edicoes-metadata <ID>` → editar o JSON → `netlify blobs:set edicoes-metadata <ID> --input <ficheiro> --force`
(o padrão está em `scripts/utac140-abrir-especial.mjs`).

## Regra do Passe na Edição Especial (UTAC142.1)

- O lance gasta **só pontos de lance**: o valor do lance em pontos. Nunca exige Passe.
- Quem tem Passe Relâmpago gasta **1 a cada 3 lances** na especial (no 3.º, 6.º, 9.º…). O Passe só se gasta depois de o lance
  estar gravado; por isso nunca há Passe a devolver.
- Quem **não tem Passe continua a poder dar lance**, só com pontos. Nessa altura não se gasta nada e o lance passa.
- O bónus de **+100 pontos** de lance continua a ser dado **na compra** do Passe Relâmpago (Regulamento v6.1, Art. 7º).
- **Substituição registada:** o spec original do UTAC142 pedia «1 Passe por participação» (R18-142-C, implementada como
  «1 Passe por lance» com a flag `passePorLance`). O operador substituiu-a no UTAC142.1 (R18-142.1-A/B) por esta regra. A flag
  `passePorLance` **já não existe no código**.
- **Config por edição:** `passeACadaLances` no Blob `edicoes-metadata` (inteiro 0..100; omissão `3`; `0` desliga o consumo).
- **Onde vive:** `netlify/functions/_lib/passe-a-cada-lances.mjs` (contador por edição e endereço, Blob `especial-lances-passe`,
  escrita condicional por ETag), chamado por `lance-relampago.mjs`. Em produção desde `9646895`; o commit actual de produção
  é `b6365e7`.
