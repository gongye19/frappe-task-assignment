FROM frappe/erpnext:v16.31.1

USER root

COPY --chown=frappe:frappe . /home/frappe/frappe-bench/apps/task_assignment

USER frappe

RUN ./env/bin/pip install --no-cache-dir -e apps/task_assignment && \
    ls -1 apps > sites/apps.txt && \
    cp assets/assets.json /tmp/frappe-assets.json && \
    bench build --app task_assignment && \
    cp /tmp/frappe-assets.json sites/assets/assets.json && \
    cp -a sites/assets/. assets/ && \
    chmod +x apps/task_assignment/deploy/start-railway.sh

# Railway mounts a fresh persistent volume as root. The entrypoint fixes only
# that volume's ownership, then immediately drops back to the frappe user.
USER root

CMD ["bash", "apps/task_assignment/deploy/start-railway.sh"]
