#!/usr/bin/env bash
# Apply the schema (and optionally seed) before starting the server.
set -e

echo "[probator] aplicando schema (drizzle-kit push)..."
pnpm drizzle-kit push --force || pnpm drizzle-kit push

if [ "${SEED:-0}" = "1" ]; then
	echo "[probator] sembrando problemas de ejemplo..."
	pnpm db:seed || echo "[probator] seed falló o ya estaba (continuo)"
fi

echo "[probator] iniciando servidor en :${PORT:-3000}"
exec node build
