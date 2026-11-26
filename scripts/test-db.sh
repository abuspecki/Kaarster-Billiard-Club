#!/usr/bin/env bash
# Lädt Migration + SQL-Tests in einen temporären lokalen Postgres-Cluster.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUN=()
if [ "$(id -u)" = "0" ]; then chown postgres "$TMP"; RUN=(runuser -u postgres --); fi
cleanup() { "${RUN[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"${RUN[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c wal_level=logical" -l "$TMP/log" -w start >/dev/null
PSQL=("${RUN[@]}" psql -X -q -v ON_ERROR_STOP=1 -h "$TMP" -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_stub_auth.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
for f in "$ROOT"/supabase/tests/1*.sql; do echo "== $(basename "$f")"; "${PSQL[@]}" -o /dev/null -f "$f"; done
echo "DB tests passed"
