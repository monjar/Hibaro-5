#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"

FORCE_INSTALL=false
SKIP_INSTALL=false
RUN_WORKER=true
USE_SUDO_DOCKER=false

usage() {
  cat <<'EOF'
Usage: ./scripts/setup-and-run.sh [options]

Sets up the Hibaro-5 local stack and starts all development services.

Options:
  --force-install  Reinstall dependencies even if node_modules already exists
  --skip-install   Skip dependency installation entirely
  --no-worker      Do not start the BullMQ worker
  --sudo-docker    Run Docker commands through sudo
  --help           Show this help text
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-install)
      FORCE_INSTALL=true
      ;;
    --skip-install)
      SKIP_INSTALL=true
      ;;
    --no-worker)
      RUN_WORKER=false
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

tcp_is_open() {
  local host="$1"
  local port="$2"

  node -e '
    const net = require("net");
    const [host, port] = process.argv.slice(1);
    const socket = net.connect({ host, port: Number(port) });
    socket.once("connect", () => {
      socket.end();
      process.exit(0);
    });
    socket.once("error", () => {
      socket.destroy();
      process.exit(1);
    });
  ' "$host" "$port"
}

wait_for_tcp() {
  local label="$1"
  local host="$2"
  local port="$3"
  local timeout_seconds="${4:-60}"

  echo "Waiting for ${label} on ${host}:${port}..."
  if ! node -e '
    const net = require("net");
    const [host, port, timeoutSeconds, label] = process.argv.slice(1);
    const deadline = Date.now() + Number(timeoutSeconds) * 1000;

    const tryConnect = () => {
      const socket = net.connect({ host, port: Number(port) });
      socket.once("connect", () => {
        socket.end();
        console.log(`${label} is ready`);
        process.exit(0);
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          console.error(`Timed out waiting for ${label} on ${host}:${port}`);
          process.exit(1);
        }
        setTimeout(tryConnect, 1000);
      });
    };

    tryConnect();
  ' "$host" "$port" "$timeout_seconds" "$label"; then
    exit 1
  fi
}

read_url_part() {
  local url="$1"
  local part="$2"
  node -e '
    const [value, part] = process.argv.slice(1);
    const parsed = new URL(value);
    if (part === "hostname") {
      process.stdout.write(parsed.hostname || "localhost");
      process.exit(0);
    } else if (part === "port") {
      if (parsed.port) {
        process.stdout.write(parsed.port);
        process.exit(0);
      }
      process.stdout.write(parsed.protocol === "redis:" ? "6379" : "5432");
      process.exit(0);
    }
    process.exit(1);
  ' "$url" "$part"
}

maybe_install_dependencies() {
  if [[ "$SKIP_INSTALL" == true ]]; then
    echo "Skipping dependency installation"
    return
  fi

  if [[ "$FORCE_INSTALL" == true || ! -d "$ROOT_DIR/node_modules" ]]; then
    if [[ -f "$ROOT_DIR/package-lock.json" ]]; then
      echo "Installing dependencies with npm ci"
      npm ci
    else
      echo "Installing dependencies with npm install"
      npm install
    fi
    return
  fi

  echo "Dependencies already installed; use --force-install to reinstall"
}

build_workspace_packages() {
  echo "Building shared workspace packages"
  npm run build:packages
}

ensure_app_ports_available() {
  local ports=("${PORT:-3000}" 3001 3002)
  local occupied=()

  for port in "${ports[@]}"; do
    if tcp_is_open localhost "$port"; then
      occupied+=("$port")
    fi
  done

  if [[ ${#occupied[@]} -gt 0 ]]; then
    cat >&2 <<EOF
Application ports are already in use: ${occupied[*]}

Stop the stale development processes and rerun:
  npm run setup:stop

If you also need to stop Docker-managed Postgres and Redis:
  npm run setup:stop -- --docker${USE_SUDO_DOCKER:+ --sudo-docker}
EOF
    exit 1
  fi
}

ensure_infrastructure() {
  if tcp_is_open "$DATABASE_HOST" "$DATABASE_PORT" && tcp_is_open "$REDIS_HOST" "$REDIS_PORT"; then
    echo "Postgres and Redis are already reachable; skipping Docker Compose startup"
    return
  fi

  if ! docker_cmd info >/dev/null 2>&1; then
    cat >&2 <<EOF
Cannot access the Docker daemon.

The setup script needs Docker to start Postgres and Redis unless both services are already running at:
  Postgres: ${DATABASE_HOST}:${DATABASE_PORT}
  Redis:    ${REDIS_HOST}:${REDIS_PORT}

Fix one of these and rerun:
  - start Docker and ensure this user can access /var/run/docker.sock
  - add this user to the docker group and restart the session
  - rerun this script with --sudo-docker
  - start Postgres and Redis by some other means on the configured ports
EOF
    exit 1
  fi

  echo "Starting Docker services"
  docker_cmd compose up -d

  wait_for_tcp "Postgres" "$DATABASE_HOST" "$DATABASE_PORT"
  wait_for_tcp "Redis" "$REDIS_HOST" "$REDIS_PORT"
}

start_process() {
  local name="$1"
  shift

  (
    "$@" 2>&1 | sed "s/^/[${name}] /"
  ) &
  PIDS+=("$!")
}

cleanup() {
  local exit_code="$?"

  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo
    echo "Stopping development services..."
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

require_command node
require_command npm
require_command docker

if [[ "$USE_SUDO_DOCKER" == true ]]; then
  require_command sudo
fi

if ! docker_cmd compose version >/dev/null 2>&1; then
  echo "Docker Compose is required but 'docker compose' is unavailable" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating .env from .env.example"
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
fi

set -a
source "$ENV_FILE"
set +a

DATABASE_HOST="$(read_url_part "${DATABASE_URL}" hostname)"
DATABASE_PORT="$(read_url_part "${DATABASE_URL}" port)"
REDIS_HOST="$(read_url_part "${REDIS_URL}" hostname)"
REDIS_PORT="$(read_url_part "${REDIS_URL}" port)"

ensure_app_ports_available
maybe_install_dependencies
build_workspace_packages
ensure_infrastructure

echo "Running Prisma migrations"
npm run prisma:migrate

echo "Seeding database"
npm run db:seed

declare -a PIDS=()
trap cleanup EXIT INT TERM

echo "Starting development services"
start_process api npm run dev
start_process web npm run dev:web
start_process admin npm run dev:admin

if [[ "$RUN_WORKER" == true ]]; then
  start_process worker npm run dev --workspace=apps/worker
fi

echo
echo "Hibaro-5 is starting:"
echo "  API:    http://localhost:${PORT:-3000}"
echo "  Web:    http://localhost:3001"
echo "  Admin:  http://localhost:3002"
if [[ "$RUN_WORKER" == true ]]; then
  echo "  Worker: opportunity-resolution queue listener"
fi
echo
echo "Press Ctrl+C to stop all started processes."

wait -n "${PIDS[@]}"