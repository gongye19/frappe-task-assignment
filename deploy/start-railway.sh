#!/usr/bin/env bash
set -Eeuo pipefail

cd /home/frappe/frappe-bench

SITE_NAME="${SITE_NAME:-task-assignment.local}"
PORT="${PORT:-8080}"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-1}"
GUNICORN_THREADS="${GUNICORN_THREADS:-4}"

required_variables=(
  MYSQLHOST
  MYSQLPORT
  MYSQLDATABASE
  MYSQLUSER
  MYSQLPASSWORD
  REDIS_URL
  ADMIN_PASSWORD
  TASK_ASSIGNMENT_TEACHER_PASSWORD
  TASK_ASSIGNMENT_STUDENT_PASSWORD
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing required environment variable: ${variable_name}" >&2
    exit 1
  fi
done

mkdir -p sites
ls -1 apps > sites/apps.txt

bench set-config -g db_host "${MYSQLHOST}"
bench set-config -gp db_port "${MYSQLPORT}"
bench set-config -g redis_cache "${REDIS_URL}"
bench set-config -g redis_queue "${REDIS_URL}"
bench set-config -g redis_socketio "${REDIS_URL}"
bench set-config -gp socketio_port 9000

if [[ ! -f "sites/${SITE_NAME}/site_config.json" ]]; then
  bench new-site "${SITE_NAME}" \
    --db-type mariadb \
    --db-host "${MYSQLHOST}" \
    --db-port "${MYSQLPORT}" \
    --db-name "${MYSQLDATABASE}" \
    --db-user "${MYSQLUSER}" \
    --db-password "${MYSQLPASSWORD}" \
    --no-setup-db \
    --admin-password "${ADMIN_PASSWORD}" \
    --install-app task_assignment \
    --set-default
else
  bench --site "${SITE_NAME}" migrate
  bench use "${SITE_NAME}"
fi

if [[ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]]; then
  bench --site "${SITE_NAME}" set-config host_name "https://${RAILWAY_PUBLIC_DOMAIN}"
fi

export SITE_NAME PORT GUNICORN_WORKERS GUNICORN_THREADS
envsubst '${SITE_NAME} ${PORT}' \
  < apps/task_assignment/deploy/nginx.conf.template \
  > /etc/nginx/conf.d/frappe.conf

pids=()

terminate() {
  trap - TERM INT EXIT
  if ((${#pids[@]})); then
    kill "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi
}
trap terminate TERM INT EXIT

./env/bin/gunicorn \
  --chdir=/home/frappe/frappe-bench/sites \
  --bind=127.0.0.1:8000 \
  --threads="${GUNICORN_THREADS}" \
  --workers="${GUNICORN_WORKERS}" \
  --worker-class=gthread \
  --worker-tmp-dir=/dev/shm \
  --timeout=120 \
  --preload \
  frappe.app:application &
pids+=("$!")

node apps/frappe/socketio.js &
pids+=("$!")

bench worker --queue short,default,long &
pids+=("$!")

bench schedule &
pids+=("$!")

nginx -g 'daemon off;' &
pids+=("$!")

wait -n "${pids[@]}"
