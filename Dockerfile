FROM frappe/erpnext:v16.31.1

USER root

COPY --chown=frappe:frappe . /home/frappe/frappe-bench/apps/task_assignment

USER frappe

RUN ./env/bin/pip install --no-cache-dir -e apps/task_assignment && \
    ls -1 apps > sites/apps.txt && \
    bench build --app task_assignment && \
    cp -a sites/assets/. assets/ && \
    chmod +x apps/task_assignment/deploy/start-railway.sh

CMD ["bash", "apps/task_assignment/deploy/start-railway.sh"]
