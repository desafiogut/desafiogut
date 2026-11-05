# UTAC129 — SEG6 · verificação ad-hoc e fecho

- Script ad-hoc de nome único (`utac129-adhoc-f7k2.mjs`, no scratchpad, fora do repo). Saída real: `_logs/UTAC129_SEG6_saida.txt`.
- Verifica no HEAD: lance sem `consumirPasse`; `auth-user` credita boas-vindas; convite com `ORIGEM_PRODUCAO` e sem `window.location.origin`; palpite MANTÉM `consumirPasse` (R18-129-3); `versionCode 8`; AAB v8 existe (> 30 MB); 8 logs do UTAC presentes.
- **Controlo positivo:** o mesmo verificador contra `HEAD~2` (antes do UTAC) tem de falhar → **falhou** (4 de 4 verificações do UTAC falsas; a guarda do palpite verdadeira nos dois).
- ⚠️ **Erro do meu instrumento (declarado):** a 1.ª corrida deu VERMELHO porque `semCom` só tirava as linhas de comentário, não os comentários de fim de linha, e o comentário do `PainelIndicacao.jsx` contém o texto `window.location.origin`. Corrigi o instrumento (não o código) e corri de novo: **VERDE**, exit 0. O teste do repo (C2) já tirava esses comentários.
- Suíte: frontend 1301/1301 · backend 1456/1462 (SEG1 + re-corrida do backend depois do SEG4). Disco: 15 GB livres.
- R18 em 3 lugares: `_logs/UTAC129_SEG-1_MEDICAO.md` · `_logs/UTAC129_RELATORIO.md` (= `Desktop/UTAC129-RELATORIO.md`) · `CLAUDE.md` (R14 append).
- O próximo UTAC pode arrancar com a skill (spec + SEG-1); pendências em `_logs/DEBT.md` (DEBT-083..087).
