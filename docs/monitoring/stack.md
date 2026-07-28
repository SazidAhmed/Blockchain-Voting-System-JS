# Monitoring Stack

## Architecture

Four services for metrics + log aggregation:

| Service    | Port | Role                               |
| ---------- | ---- | ---------------------------------- |
| Prometheus | 9090 | Metrics collection, time-series DB |
| Grafana    | 3030 | Visualization, dashboards          |
| Loki       | 3100 | Log aggregation                    |
| Promtail   | —    | Log shipper (Docker → Loki)        |

## Docker Compose

```bash
docker compose -f infra/docker/docker-compose.monitoring.yml up -d
```

Stack defined in `infra/docker/docker-compose.monitoring.yml`. Connects to `voting-network` for service discovery.

## Prometheus

Config: `infra/monitoring/prometheus/prometheus.yml`

- Scrape interval: 15s
- Retention: 30d
- Alert rules: `infra/alerts/*.yml` (loaded via `rule_files`)
- Scrapes: prometheus itself, node-exporter, cAdvisor, MySQL exporter, backend API, blockchain nodes (5), Docker daemon

Blockchain node targets (container names):

```text
voting-blockchain-node-{1..5}:300{1..5}
```

Custom app metrics at `/metrics` endpoint on each node (requires `prometheusMetrics.js` integration).

## Grafana

Config: `infra/monitoring/grafana/provisioning/`

- Default login: `admin` / `admin`
- Sign-up disabled
- Pie chart panel plugin pre-installed
- Data source provisioning: `infra/monitoring/grafana/provisioning/datasources/prometheus.yml` — auto-configures Prometheus at `http://prometheus:9090`
- Dashboard provisioning: `infra/monitoring/grafana/provisioning/dashboards/voting-system.yml` — loads JSON dashboards from `infra/monitoring/grafana/dashboards/`
- Loki data source not auto-provisioned — add manually in Grafana Settings → Data Sources → Loki at `http://loki:3100`

## Loki

Config: `infra/monitoring/loki/loki-config.yml`

- Auth disabled
- Chunk encoding: snappy
- Ingest listens on port 3100
- Filesystem storage at `/loki/chunks`
- Retention: disabled by default (configurable via `table_manager.retention_period`)

## Promtail

Config: `infra/monitoring/promtail/promtail-config.yml`

- Discovers containers via Docker socket
- Relabels: `container` (container name), `service` (compose service), `project` (compose project)
- Pushes to Loki at `http://loki:3100/loki/api/v1/push`
- All Docker containers labeled with `com.docker.compose.project=voting` auto-discovered

## Service Logging Label Convention

Add to each service in `docker-compose.yml`:

```yaml
logging:
  driver: "json-file"
  options:
    labels: "service=NAME,project=voting"
    max-size: "10m"
    max-file: "3"
```

Promtail reads these labels and ships to Loki. Query in Grafana with LogQL:

```logql
{service="backend"}
{service="blockchain"}
{service="mysql"}
```

## Access

| Component  | URL                             |
| ---------- | ------------------------------- |
| Prometheus | <http://localhost:9090>         |
| Grafana    | <http://localhost:3030>         |
| Loki       | <http://localhost:3100>         |
| cAdvisor   | <http://localhost:8081>         |
| Node Exp.  | <http://localhost:9100/metrics> |

## Data Persistence

Docker volumes: `voting_prometheus_data`, `voting_grafana_data`, `voting_loki_data`.
