# secrets/ — cofre de chaves e credenciais do DesafioGUT

**Criado:** MC94.4 (2026-09-25) · **Regra:** este cofre guarda **ficheiros** de chaves.
O conteúdo NUNCA é lido, impresso nem registado por agentes (R5 / HARD GATE 4).
Tudo aqui é ignorado pelo git (`secrets/*`), excepto este README.

## Ficheiros neste cofre

| ficheiro | propósito (pelos NOMES das variáveis, não pelos valores) | origem |
|---|---|---|
| `mc33-staging.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — credenciais Supabase de staging | movido de `C:\Users\Moltbot\.mc33-staging.env` (estava solto na raiz do perfil) |

> ⚠️ `SERVICE_ROLE_KEY` é uma chave de **administração total** do Supabase. Foi este tipo
> de chave que o incidente MC89.43 expôs. Estava num ficheiro solto na raiz do perfil do
> utilizador — passou para aqui, onde está ignorada pelo git.

## Chaves que existem FORA deste cofre (registadas, NÃO movidas — com o motivo)

| caminho | propósito | porquê não foi movida |
|---|---|---|
| `DESAFIOGUT/keystore/desafiogut.keystore` | keystore de assinatura da release Android | o `storeFile` do `keystore.properties` aponta para aqui; mover quebraria a assinatura em silêncio |
| `DESAFIOGUT/keystore/credenciais.txt` | senha/alias do keystore (671 B) | idem; vive junto do keystore por desenho |
| `Desktop/GUTO/BACKUP_KEYSTORE NÃO PERDER NUNCA/` | cópia de segurança do keystore + `credenciais.txt` | artefacto de emergência com nome explícito do operador; realocá-lo sem o avisar é um risco em caso de emergência. **Mover é um comando** (`mv`) — decisão do operador (R18) |
| `~/.claude.json` | configuração do Claude Code; contém a chave `comfyui-*` em `mcpServers.comfyui-cloud.headers['X-API-Key']` | é configuração viva de ferramenta, não um ficheiro de chaves; mover quebraria o MCP |

**Chaves que vivem apenas em variáveis de ambiente do Netlify** (não existem em ficheiro
local — é o padrão correcto): ADMIN_TOKEN, BLOBS_TOKEN, ALCHEMY_API_KEY, PRIVY_APP_SECRET,
SUPABASE_SERVICE_ROLE_KEY (produção), entre outras. **Não foram tocadas nem listadas com
valores** (R5).

## ⛔ Achado crítico relacionado com o keystore

`desafio-gut/frontend/android/app/build.gradle:38`:

```groovy
signingConfig keystorePropsFile.exists() ? signingConfigs.release : signingConfigs.debug
```

O ficheiro `keystore.properties` (que o gradle lê para obter `storeFile`, `storePassword`,
`keyAlias`, `keyPassword`) **não existe** no repositório nem no disco, e está no `.gitignore`.
Consequência: **um build de release assina com a chave de DEBUG** — a Play Store rejeita, ou
pior, gera um artefacto com assinatura errada. **Não corrigido neste MC porque a correcção
exige ler a senha do `credenciais.txt` — o que a R5 proíbe.** Acção do operador: recriar
`keystore.properties` com as 4 chaves. Ver `docs/README.md` seção de pendências.
