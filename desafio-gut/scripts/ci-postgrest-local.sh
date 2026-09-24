#!/usr/bin/env bash
# scripts/ci-postgrest-local.sh — MC93-E.
#
# PORQUÊ ESTE SCRIPT EXISTE
# O HARD GATE 3 do MC93-E manda testar alterações ao `ci.yml` CORRENDO o CI antes
# do commit, com `act` ou equivalente. Medido no SEG-1: `act` NÃO está instalado
# nesta máquina e instalá-lo não está autorizado. O Docker está de pé, e o
# enunciado admite "ou equivalente" — isto é o equivalente.
#
# O QUE ISTO PROVA, E O QUE NÃO PROVA
# PROVA: que as imagens, os papéis, a migração e o JWT funcionam juntos, e que
#   os testes de NÍVEL 2 deixam de saltar e passam.
# NÃO PROVA: que o runner do GitHub Actions interpreta o YAML como se espera.
#   Essa lacuna fica declarada em L-4. Um `act` cobria-a; não o há.
# ⚠️ E NÃO É IDÊNTICO AO CI — achado A-11 da validação independente, que
#   corrigiu uma afirmação minha exagerada ("o comando exacto do passo"):
#     • o CI corre a suíte toda; este script corre só o ficheiro de contrato;
#     • o CI usa `--network host`; aqui usa-se rede bridge + `-p 3000:3000`,
#       porque o Docker Desktop em Windows não reproduz o host-networking;
#     • o CI aplica a migração por `-v` + `-f`; aqui por `docker exec -i < ficheiro`.
#   O que é garantidamente igual — e há um teste que o exige — são as IMAGENS,
#   os PAPÉIS e a MIGRAÇÃO.
#
# Usar:  bash scripts/ci-postgrest-local.sh
#        bash scripts/ci-postgrest-local.sh --parar    (só derruba)
set -euo pipefail

REDE=mc93e-net
PG=mc93e-pg
PRST=mc93e-postgrest
# ⚠️ As MESMAS imagens e versões que o ci.yml declara. Se divergirem, este script
# deixa de ser o equivalente do CI e passa a ser teatro.
IMG_PG=postgres:17-alpine
IMG_PRST=postgrest/postgrest:v12.2.3
# Segredo DESCARTÁVEL, só para assinar o JWT deste contentor efémero. Não é uma
# credencial de lado nenhum e nunca sai desta máquina (R4/R5).
SEGREDO_JWT=mc93e-segredo-de-teste-apenas-32-chars-min
PORTA=3000

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRACAO="$RAIZ/frontend/supabase/migrations/20260923_mc93b_pontuacoes.sql"
FUNCOES="$RAIZ/frontend/netlify/functions"

derrubar() {
  docker rm -f "$PRST" "$PG" >/dev/null 2>&1 || true
  docker network rm "$REDE" >/dev/null 2>&1 || true
}

if [ "${1:-}" = "--parar" ]; then derrubar; echo "derrubado."; exit 0; fi

trap derrubar EXIT
derrubar

echo "── 1/6 · rede e Postgres ($IMG_PG)"
docker network create "$REDE" >/dev/null
docker run -d --name "$PG" --network "$REDE" \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres \
  "$IMG_PG" >/dev/null

echo "── 2/6 · à espera do Postgres"
for _ in $(seq 1 60); do
  if docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$PG" pg_isready -U postgres

echo "── 3/6 · papéis que a migração pressupõe"
# ⚠️ A migração faz GRANT a `service_role` e REVOKE a `anon`/`authenticated`.
# O Supabase cria estes papéis; um Postgres nu não. Sem isto a migração rebenta
# — e foi exactamente por não existir um sítio onde ela corresse que a migração
# do MC93-B viveu com cobertura ZERO até ao MC93-D.
docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
GRANT anon, authenticated, service_role TO authenticator;
SQL

echo "── 4/6 · migração do MC93-B"
docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$MIGRACAO"

echo "── 5/6 · PostgREST ($IMG_PRST)"
docker run -d --name "$PRST" --network "$REDE" -p "$PORTA:3000" \
  -e PGRST_DB_URI="postgres://authenticator:postgres@$PG:5432/postgres" \
  -e PGRST_DB_SCHEMAS=public \
  -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="$SEGREDO_JWT" \
  "$IMG_PRST" >/dev/null

for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:$PORTA/" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://localhost:$PORTA/" >/dev/null && echo "   PostgREST responde."

echo "── 6/6 · JWT de service_role + suíte de contrato"
cd "$FUNCOES"
TOKEN="$(SEGREDO="$SEGREDO_JWT" node -e '
import("jose").then(async ({ SignJWT }) => {
  const s = new TextEncoder().encode(process.env.SEGREDO);
  const t = await new SignJWT({ role: "service_role" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime("1h").sign(s);
  process.stdout.write(t);
});')"

export SUPABASE_CONTRATO_URL="http://localhost:$PORTA"
export SUPABASE_CONTRATO_KEY="$TOKEN"

echo
node --test --experimental-test-module-mocks "_tests/mc93d-contrato-postgrest.test.mjs"

echo
echo "── guarda · o NIVEL 2 nao pode ter saltado (a mesma do ci.yml)"
# --test-reporter=tap fixado: o repórter por defeito escreve "i skipped N" e o
# parse devolveria vazio, deixando a guarda vermelha para sempre. Medido.
saida=$(node --test --test-reporter=tap --experimental-test-module-mocks   "_tests/mc93d-contrato-postgrest.test.mjs" 2>&1) || true
saltados=$(echo "$saida" | grep -oE '^# skipped [0-9]+' | tail -1 | tr -dc '0-9')
echo "   saltados=${saltados:-?}"
if [ "${saltados:-1}" = "0" ]; then
  echo "   OK — os testes de servidor CORRERAM."
else
  echo "   FALHA — voltaram a saltar."; exit 1
fi
