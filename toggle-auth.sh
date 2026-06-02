#!/usr/bin/env bash
# Toggle the API's AUTH_DISABLED flag by restarting the customer_api.py process.
#
# Usage:
#   ./toggle-auth.sh status   # show whether auth is currently bypassed
#   ./toggle-auth.sh off      # restart with AUTH_DISABLED=true (no login required)
#   ./toggle-auth.sh on       # restart without AUTH_DISABLED (login enforced)
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SCRIPT="$PROJECT_ROOT/services/api/customer_api.py"
API_PORT="${API_PORT:-5001}"
LOG_FILE="${API_LOG_FILE:-/tmp/client-portal-api.log}"
PYTHON_BIN="${PYTHON_BIN:-/usr/bin/python3}"
HEALTH_URL="http://127.0.0.1:${API_PORT}/api/health"
ME_URL="http://127.0.0.1:${API_PORT}/api/me"

usage() {
    echo "Usage: $0 {on|off|status}" >&2
    exit 2
}

[ $# -eq 1 ] || usage
cmd="$1"

stop_api() {
    local pids
    pids="$(lsof -ti:"$API_PORT" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
        echo "Stopping API on port $API_PORT (PIDs: $pids)..."
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

start_api() {
    local auth_value="${1:-false}"
    echo "Starting API with AUTH_DISABLED=$auth_value (log: $LOG_FILE)..."
    AUTH_DISABLED="$auth_value" nohup "$PYTHON_BIN" "$API_SCRIPT" >"$LOG_FILE" 2>&1 &
    disown || true
    # Wait up to 20s for /api/health
    for _ in $(seq 1 20); do
        if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
            echo "API is up."
            return 0
        fi
        sleep 1
    done
    echo "API failed to become healthy — last 20 log lines:" >&2
    tail -20 "$LOG_FILE" >&2 || true
    return 1
}

case "$cmd" in
    status)
        if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
            echo "API is not running on port $API_PORT."
            exit 1
        fi
        body="$(curl -fsS "$ME_URL")"
        if echo "$body" | grep -q '"auth_disabled": *true'; then
            echo "AUTH_DISABLED=true  (login is bypassed; everyone is admin)"
        else
            echo "AUTH_DISABLED=false (login is enforced)"
        fi
        ;;
    off)
        stop_api
        start_api "true"
        echo "Auth bypass ON. The login screen will no longer appear."
        ;;
    on)
        stop_api
        start_api "false"
        echo "Auth bypass OFF. Login is enforced."
        ;;
    *)
        usage
        ;;
esac
