# CI Security Gates — Branch Protection

## Workflow
`.github/workflows/ci.yml` — 4 estágios sequenciais com fail-fast:
1. `install` — npm ci (frontend + functions)
2. `lint` — ESLint/Prettier check
3. `build` — npm run build (frontend)
4. `audit` — security scan completo

## Habilitar Branch Protection no GitHub

1. Vá em: Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. Marque:
   - ☑ **Require a pull request before merging**
   - ☑ **Require status checks to pass before merging**
   - ☑ **Require branches to be up to date before merging**
4. Search for and select these checks:
   - `ci / install`
   - `ci / lint`
   - `ci / build`
   - `ci / audit`
   - `security-scan / npm-audit-frontend`
   - `security-scan / npm-audit-functions`
   - `security-scan / lockfile-integrity`
   - `security-scan / socket-security`
5. Click **Create** / **Save changes**

## Comportamento esperado
- Todo push/PR para `main` roda ci.yml e security-scan.yml
- Se npm audit encontrar high/critical → build falha → merge bloqueado
- Se lockfile estiver dessincronizado → build falha → merge bloqueado
- Se Socket.dev detectar malware → build falha → merge bloqueado
- Se frontend não compilar → build falha → merge bloqueado
