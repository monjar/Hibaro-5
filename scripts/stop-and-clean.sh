#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
USE_SUDO_DOCKER=false
STOP_DOCKER=false

usage() {
  cat <<'EOF'
Usage: ./scripts/stop-and-clean.sh [options]

Stops local Hibaro-5 development processes that were left running.

Options:
  --docker         Also stop Postgres and Redis with docker compose down
  --sudo-docker    Run Docker commands through sudo
  --help           Show this help text
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --docker)
      STOP_DOCKER=true
      ;;
    --sudo-docker)
      USE_SUDO_DOCKER=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

docker_cmd() {
  if [[ "$USE_SUDO_DOCKER" == true ]]; then
    sudo docker "$@"
    return
  fi

  docker "$@"
}

collect_port_pids() {
  local port="$1"

  ss -ltnp "( sport = :${port} )" 2>/dev/null \
    | grep -o 'pid=[0-9]\+' \
    | cut -d= -f2 \
    | sort -u \
    || true
}

collect_matching_pids() {
  local pattern="$1"
  pgrep -f "$pattern" || true
}

describe_pid() {
  local pid="$1"
  ps -p "$pid" -o pid=,command=
}

wait_for_termination() {
  local pids=("$@")
  local remaining=()

  for _ in {1..25}; do
    remaining=()
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" >/dev/null 2>&1; then
        remaining+=("$pid")
      fi
    done

    if [[ ${#remaining[@]} -eq 0 ]]; then
      return 0
    fi

    sleep 0.2
  done

  if [[ ${#remaining[@]} -gt 0 ]]; then
    kill -9 "${remaining[@]}" >/dev/null 2>&1 || true
  fi
}

print_port_status() {
  local ports=("$@")
  local entries=()

  for port in "${ports[@]}"; do
    while IFS= read -r pid; do
      [[ -z "$pid" ]] && continue
      entries+=("$port:$pid")
    done < <(collect_port_pids "$port")
  done

  if [[ ${#entries[@]} -eq 0 ]]; then
    echo "No listeners remain on application ports"
    return
  fi

  echo "Listeners still present on application ports:"
  for entry in "${entries[@]}"; do
    local port="${entry%%:*}"
    local pid="${entry##*:}"
    echo "  Port ${port}: $(describe_pid "$pid")"
  done
}

require_command ss
require_command ps
require_command pgrep

if [[ "$STOP_DOCKER" == true || "$USE_SUDO_DOCKER" == true ]]; then
  require_command docker
fi

if [[ "$USE_SUDO_DOCKER" == true ]]; then
  require_command sudo
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

API_PORT="${PORT:-3000}"
WEB_PORT=3001
ADMIN_PORT=3002

declare -A pids_to_kill=()

for port in "$API_PORT" "$WEB_PORT" "$ADMIN_PORT"; do
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    pids_to_kill["$pid"]="port ${port}"
  done < <(collect_port_pids "$port")
done

for pattern in \
  "$ROOT_DIR/apps/api/dist/apps/api/src/main" \
  'npm run dev --workspace=apps/api' \
  'nest start --watch'; do
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    pids_to_kill["$pid"]="api"
  done < <(collect_matching_pids "$pattern")
done

for pattern in \
  "$ROOT_DIR/apps/worker/src/main.ts" \
  "$ROOT_DIR/apps/worker/dist/main.js" \
  'npm run dev --workspace=apps/worker' \
  'ts-node src/main.ts'; do
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    pids_to_kill["$pid"]="worker"
  done < <(collect_matching_pids "$pattern")
done

if [[ ${#pids_to_kill[@]} -eq 0 ]]; then
  echo "No Hibaro-5 development processes found"
else
  echo "Stopping Hibaro-5 development processes:"
  for pid in "${!pids_to_kill[@]}"; do
    echo "  [$pid] ${pids_to_kill[$pid]} :: $(describe_pid "$pid")"
  done

  kill "${!pids_to_kill[@]}" >/dev/null 2>&1 || true
  wait_for_termination "${!pids_to_kill[@]}"
fi

print_port_status "$API_PORT" "$WEB_PORT" "$ADMIN_PORT"

if [[ "$STOP_DOCKER" == true ]]; then
  echo "Stopping Docker services"
  docker_cmd compose down
fi