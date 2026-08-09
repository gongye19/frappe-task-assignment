#!/usr/bin/env bash
set -Eeuo pipefail

cd /home/frappe/frappe-bench

if [[ "$(id -u)" == "0" ]]; then
  chown -R frappe:frappe sites
  exec setpriv --reuid=frappe --regid=frappe --init-groups "$0" "$@"
fi

SITE_NAME="${SITE_NAME:-task-assignment.local}"
PORT="${PORT:-8080}"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-1}"
GUNICORN_THREADS="${GUNICORN_THREADS:-4}"

if [[ ! "${SITE_NAME}" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]]; then
  echo "SITE_NAME must be a hostname, got: ${SITE_NAME}" >&2
  exit 1
fi

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
if [[ ! -f sites/common_site_config.json ]]; then
  echo '{}' > sites/common_site_config.json
fi

bench set-config -g db_host "${MYSQLHOST}"
bench set-config -gp db_port "${MYSQLPORT}"
bench set-config -g redis_cache "${REDIS_URL}"
bench set-config -g redis_queue "${REDIS_URL}"
bench set-config -g redis_socketio "${REDIS_URL}"
bench set-config -gp socketio_port 9000

site_path="sites/${SITE_NAME}"
install_marker="${site_path}/.task_assignment_installed"

# A failed first install can leave a partial site on the persistent volume.
# Only retry cleanup before the successful-install marker has ever been written.
if [[ -f "${site_path}/site_config.json" && ! -f "${install_marker}" ]]; then
  echo "Removing incomplete first-install state for ${SITE_NAME}..."
  rm -rf -- "${site_path}"
fi

if [[ ! -f "${site_path}/site_config.json" ]]; then
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
  touch "${install_marker}"
else
  bench --site "${SITE_NAME}" migrate
  bench use "${SITE_NAME}"
fi

# Asset bundle names are cached in the shared Redis service. Refresh the
# mapping after every image rollout so Frappe serves the baked UI assets.
bench --site "${SITE_NAME}" clear-cache

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

# During a rolling deploy the retiring instance can briefly repopulate the
# shared asset cache. Refresh once more after Railway has switched traffic.
(
  sleep 20
  bench --site "${SITE_NAME}" clear-cache
) &

wait -n "${pids[@]}"
