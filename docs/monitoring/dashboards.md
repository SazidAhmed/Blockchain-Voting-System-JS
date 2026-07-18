# Dashboards & Alerting

## Grafana Dashboards

Three pre-built dashboards in `infra/monitoring/grafana/dashboards/`. Auto-loaded via provisioning — appear in "Voting System" folder on startup.

### Voting System Overview

File: `infra/monitoring/grafana/dashboards/voting-system-overview.json`

Service-level view. Refresh: 10s.

| Panel              | Type        | Query                                                        |
| ------------------ | ----------- | ------------------------------------------------------------ |
| Service Status     | Stat        | `up{job=~"backend-api\|blockchain-node\|mysql\|prometheus"}` |
| Container CPU      | Time series | Per-container CPU usage                                      |
| Container Memory   | Time series | Per-container memory usage                                   |
| Network I/O        | Time series | Container network bytes                                      |
| MySQL Connections  | Stat        | `mysql_global_status_threads_connected`                      |
| Disk Usage         | Gauge       | Filesystem usage %                                           |
| Container Restarts | Stat        | Container restart count                                      |

### Blockchain Monitoring

File: `infra/monitoring/grafana/dashboards/grafana-dashboard-blockchain.json`

Blockchain-focused. Refresh: 30s. Requires app metrics from `prometheusMetrics.js`.

| Panel             | Query                                                       |
| ----------------- | ----------------------------------------------------------- |
| Active Nodes      | `count(up{job="blockchain-node"})`                          |
| Chain Height      | `blockchain_chain_height`                                   |
| Mempool Size      | `blockchain_transaction_pool_size`                          |
| Connected Peers   | `blockchain_connected_peers`                                |
| Vote Rate         | `rate(blockchain_votes_processed_total[1m])`                |
| Byzantine Attacks | `increase(blockchain_byzantine_attacks_detected_total[5m])` |
| Invalid TX        | `rate(blockchain_invalid_transactions_rejected_total[5m])`  |
| Peer Latency      | `blockchain_peer_latency_ms`                                |
| Node Uptime       | `blockchain_uptime_seconds`                                 |

### Blockchain Voting System - Unified Monitoring

File: `infra/monitoring/grafana/dashboards/grafana-dashboard-unified.json`

Combined system + blockchain. Refresh: 30s.

| Panel                  | Query                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| System CPU             | `100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100`                 |
| System Memory          | `(node_memory_MemTotal - node_memory_MemAvailable) / node_memory_MemTotal * 100` |
| Container CPU Trend    | Per-container line graph                                                         |
| Container Memory Trend | Per-container line graph                                                         |
| Network Traffic        | `rate(container_network_receive_bytes_total[5m])`                                |
| Chain Height           | `blockchain_chain_height`                                                        |
| Vote Rate              | `rate(blockchain_votes_processed_total[1m])`                                     |
| Active Nodes           | `count(up{job="blockchain-node"})`                                               |
| Error Rate             | `rate(http_requests_total{status=~"5.."}[5m])`                                   |

## Prometheus Alert Rules

File: `infra/alerts/voting-system-alerts.yml`. Evaluation interval: 30s.

### Critical

| Alert              | Expression                       | For |
| ------------------ | -------------------------------- | --- |
| ServiceDown        | `up == 0`                        | 1m  |
| BackendAPIDown     | `up{job="backend-api"} == 0`     | 1m  |
| BlockchainNodeDown | `up{job="blockchain-node"} == 0` | 1m  |
| MySQLDown          | `up{job="mysql"} == 0`           | 1m  |

### Warning

| Alert                | Expression                          | For |
| -------------------- | ----------------------------------- | --- |
| HighCPUUsage         | `container_cpu > 0.8`               | 5m  |
| HighMemoryUsage      | `container_memory > 0.85`           | 5m  |
| DiskSpaceLow         | `avail_bytes < 0.1`                 | 5m  |
| ContainerRestarting  | `rate(container_last_seen[5m]) > 2` | 5m  |
| MySQLConnectionsHigh | `threads_connected > 100`           | 5m  |
| MySQLSlowQueries     | `rate(slow_queries[5m]) > 0.05`     | 5m  |
| HighErrorRate        | `5xx rate > 0.05`                   | 5m  |

Alerts evaluated in Prometheus at `http://localhost:9090/alerts`. No Alertmanager configured — alerts visible in Prometheus UI only. To enable notifications, add Alertmanager to `infra/docker/docker-compose.monitoring.yml`.

## Log Queries (Grafana + Loki)

Loki data source must be added manually: Settings → Data Sources → Loki → `http://loki:3100`.

### Service-Specific

```logql
{service="backend"}
{service="blockchain"}
{service="mysql"}
{service="frontend"}
```

### Filtered

```logql
{service="backend"} |= "error"
{service="backend"} |= "warn" or "error"
{service="mysql"} |= "slow query"
```

### Error Aggregation

```logql
sum(rate({level="error"}[5m])) by (service)
```

### Container Name

```logql
{container="voting-backend"}
```

## Key Metrics Reference

| Metric                                           | Type    | Description              |
| ------------------------------------------------ | ------- | ------------------------ |
| `blockchain_chain_height`                        | Gauge   | Current chain length     |
| `blockchain_transaction_pool_size`               | Gauge   | Pending transactions     |
| `blockchain_connected_peers`                     | Gauge   | Active peer connections  |
| `blockchain_blocks_created_total`                | Counter | Blocks mined by node     |
| `blockchain_votes_processed_total`               | Counter | Total votes recorded     |
| `blockchain_byzantine_attacks_detected_total`    | Counter | Byz. attacks found       |
| `blockchain_invalid_transactions_rejected_total` | Counter | Rejected invalid TX      |
| `blockchain_peer_latency_ms`                     | Gauge   | Per-peer latency         |
| `blockchain_uptime_seconds`                      | Gauge   | Node process uptime      |
| `blockchain_node_info`                           | Gauge   | Node metadata (id, type) |

All blockchain metrics require `prometheusMetrics.js` integrated into `services/blockchain-node/index.js`.
