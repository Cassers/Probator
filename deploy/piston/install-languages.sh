#!/usr/bin/env bash
# Install the language runtimes Probator uses into a running Piston instance.
# Versions must match src/lib/judge/languages.ts.
set -euo pipefail

PISTON="${PISTON_URL:-http://127.0.0.1:2000}"

install() {
	echo "installing $1 $2 ..."
	curl -s -X POST "$PISTON/api/v2/packages" \
		-H 'Content-Type: application/json' \
		-d "{\"language\":\"$1\",\"version\":\"$2\"}"
	echo
}

install python 3.12.0
install gcc 10.2.0 # provides c and c++
install java 15.0.2

echo "--- installed runtimes ---"
curl -s "$PISTON/api/v2/runtimes"
echo
