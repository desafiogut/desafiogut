# UTAC110b — SEG2 · VERIFICAÇÃO

Instrumento ad-hoc (fora do repo, corrido **depois** das correcções pós-validador): extrai todas as referências
`ficheiro.ext:linha[-linha]` dos 3 documentos do UTAC, resolve-as contra `git ls-files` (o prefixo `fn/` =
`desafio-gut/frontend/netlify/functions/`) e confirma que a(s) linha(s) existem. **Controlo positivo:** uma
referência falsa (`fn/_lib/rag.mjs:99999`) tem de falhar. Confirma também que só há ficheiros do UTAC alterados.

## Saída real
```
refs OK: 74 | falhas: 0
controlo positivo morde: true
ficheiros do UTAC: 4  M _logs/UTAC110b-guto-diagnostico.md |  M _logs/UTAC110b-plano-melhoria.md |  M _logs/UTAC110b_SEG-1_MEDICAO.md | ?? _logs/UTAC110b_SEG3_VALIDADOR.md
alteracoes fora do UTAC (devem ser 0): 0 
diff de codigo (src/netlify/scripts): VAZIO
```

## Limites do instrumento (declarados)
- Prova que a linha **existe**, não que o **conteúdo** citado está lá. O conteúdo foi confirmado à mão nas linhas-chave
  e pelo validador (SEG3); 4 números de linha errados foram corrigidos (E8 + correcções do SEG2 anterior).
- 1.ª versão do instrumento indexava o **disco** e achou um 2.º `chatbot.mjs` **não versionado** → passou a usar
  `git ls-files`. Um `\n` num heredoc virou quebra de linha real (armadilha já conhecida) → corrigido.

## Checklist SEG2
| item | resultado |
|---|---|
| só `_logs/UTAC110b*` (+ CLAUDE.md no fecho) alterados | ✅ (0 alterações fora do UTAC) |
| zero alterações em código | ✅ `git diff --name-only -- desafio-gut scripts` = VAZIO |
| zero alterações em env vars / índice / deploy | ✅ (só `env:list` por nomes, `blobs:list/get`, 1 POST) |
| cada ficheiro:linha válido OU lacuna | ✅ (lacunas L-1 declarada; L-2 fechada pelo validador) |
| chamada ao GUTO com output bruto | ✅ diagnóstico §1 |
| leituras de RAM | ✅ 9 leituras (3+3+3) no SEG-1 |
| plano com 3 níveis, tabela de decisão, custo/risco/critério por acção | ✅ |
