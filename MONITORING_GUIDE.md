# 📊 Monitoring Setup for Voting System

Complete monitoring solution using Prometheus, Grafana, cAdvisor, and Node Exporter.

## 🚀 Quick Start

### Start Monitoring Stack
```bash
# Linux/Mac
./docker-monitoring-start.sh

# Windows
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Access Monitoring Tools
- **Grafana**: http://localhost:3030 (admin/admin)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8081

## 📦 Components

### 1. Prometheus (Port 9090)
- **Purpose**: Metrics collection and storage
- **Data Retention**: 30 days
- **Scrape Interval**: 15 seconds
- **Config**: `monitoring/prometheus.yml`

**Metrics Collected:**
- Service uptime and health
- Container CPU, memory, network usage
- MySQL database metrics
- System-level metrics
- Custom application metrics

### 2. Grafana (Port 3030)
- **Purpose**: Visualization and dashboards
- **Default Login**: admin/admin
- **Pre-configured Dashboards**: 
  - Voting System Overview
  - Container Metrics
  - MySQL Performance
  - System Resources

**Dashboard Location**: `monitoring/grafana/dashboards/`

### 3. cAdvisor (Port 8081)
- **Purpose**: Container-level resource usage
- **Metrics**: CPU, memory, network, disk I/O per container
- **Update Interval**: 10 seconds

### 4. Node Exporter (Port 9100)
- **Purpose**: Host system metrics
- **Metrics**: CPU, memory, disk, network at OS level

### 5. MySQL Exporter (Port 9104)
- **Purpose**: MySQL-specific metrics
- **Metrics**: Connections, queries, slow queries, locks, etc.

## 📈 Available Metrics

### Service Health
```promql
# Check if service is up
up{job="backend-api"}

# Service uptime
up{job="backend-api"} * 100
```

### Container Resources
```promql
# CPU usage by container
rate(container_cpu_usage_seconds_total{container_label_com_docker_compose_project="voting"}[5m]) * 100

# Memory usage
container_memory_usage_bytes{container_label_com_docker_compose_project="voting"}

# Network I/O
rate(container_network_receive_bytes_total[5m])
```

### MySQL Metrics
```promql
# Active connections
mysql_global_status_threads_connected

# Queries per second
rate(mysql_global_status_queries[5m])

# Slow queries
rate(mysql_global_status_slow_queries[5m])
```

### System Metrics
```promql
# CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Disk usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100
```

## 🚨 Alerting

### Configured Alerts
Located in `monitoring/alerts/voting-system-alerts.yml`

#### Critical Alerts
- **ServiceDown**: Any service is unavailable for >1 minute
- **BackendAPIDown**: Backend API not responding
- **BlockchainNodeDown**: Blockchain node not responding
- **MySQLDown**: Database not responding

#### Warning Alerts
- **HighCPUUsage**: Container using >80% CPU for 5 minutes
- **HighMemoryUsage**: Container using >85% memory for 5 minutes
- **DiskSpaceLow**: Disk space <10%
- **ContainerRestarting**: Container restarting frequently
- **MySQLConnectionsHigh**: >100 active MySQL connections
- **MySQLSlowQueries**: High rate of slow queries

### Testing Alerts
```bash
# Trigger a test alert by stopping a service
docker-compose stop backend

# Check alert status in Prometheus
# Navigate to: http://localhost:9090/alerts
```

## 📊 Grafana Dashboards

### Pre-configured Dashboards

#### 1. Voting System Overview
- Service status (UP/DOWN)
- CPU usage by container
- Memory usage by container
- Network I/O
- MySQL connections
- Disk usage
- Container restart count

#### 2. Container Metrics (Optional - Create Custom)
- Detailed per-container metrics
- Historical trends
- Resource limits vs usage

#### 3. MySQL Performance (Optional - Create Custom)
- Query performance
- Connection pool usage
- Table lock time
- InnoDB metrics

### Creating Custom Dashboards

1. Access Grafana: http://localhost:3030
2. Login with admin/admin
3. Click "+" → "Dashboard"
4. Add panels with PromQL queries
5. Save to "Voting System" folder

**Example Panel Queries:**
```promql
# Average response time (if instrumented)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

## 🔧 Configuration

### Prometheus Configuration
Edit `monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s  # Change collection frequency
  
scrape_configs:
  - job_name: 'my-custom-service'
    static_configs:
      - targets: ['my-service:port']
```

### Add Custom Alerts
Create new file in `monitoring/alerts/`:
```yaml
groups:
  - name: custom_alerts
    rules:
      - alert: MyCustomAlert
        expr: my_metric > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Custom alert triggered"
```

### Grafana Provisioning
- **Datasources**: `monitoring/grafana/provisioning/datasources/`
- **Dashboards**: `monitoring/grafana/provisioning/dashboards/`

## 🛠️ Maintenance

### View Logs
```bash
# All monitoring services
docker-compose -f docker-compose.monitoring.yml logs -f

# Specific service
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### Restart Services
```bash
# Restart all monitoring
docker-compose -f docker-compose.monitoring.yml restart

# Restart specific service
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Stop Monitoring
```bash
# Stop but keep data
docker-compose -f docker-compose.monitoring.yml down

# Stop and remove data
docker-compose -f docker-compose.monitoring.yml down -v
```

### Backup Grafana Dashboards
```bash
# Export dashboards from Grafana UI or backup volume
docker run --rm -v voting_grafana_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/grafana-backup.tar.gz /data
```

### Restore Grafana Dashboards
```bash
docker run --rm -v voting_grafana_data:/data -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/grafana-backup.tar.gz --strip 1"
```

## 📱 Alerting Integrations (Future)

### Alertmanager Setup
To receive alerts via email/Slack/etc., set up Alertmanager:

```yaml
# docker-compose.monitoring.yml
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
```

### Example Alertmanager Config
```yaml
# monitoring/alertmanager.yml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  receiver: 'slack-notifications'
  
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        text: 'Alert: {{ .CommonAnnotations.summary }}'
```

## 🔍 Troubleshooting

### Issue: Prometheus not scraping targets
**Solution:**
1. Check network connectivity: `docker-compose -f docker-compose.monitoring.yml ps`
2. Verify targets in Prometheus: http://localhost:9090/targets
3. Check service endpoints are exposed

### Issue: Grafana dashboards not loading
**Solution:**
1. Check datasource connection: Configuration → Data Sources
2. Verify Prometheus is running: http://localhost:9090
3. Check Grafana logs: `docker-compose -f docker-compose.monitoring.yml logs grafana`

### Issue: cAdvisor not collecting metrics
**Solution:**
1. Ensure Docker socket is mounted: Check volumes in docker-compose.monitoring.yml
2. Run with privileged mode (required for cAdvisor)
3. On Windows: May need Docker Desktop integration

### Issue: High resource usage
**Solution:**
1. Adjust Prometheus retention: `--storage.tsdb.retention.time=15d`
2. Increase scrape interval: Change `scrape_interval: 30s`
3. Reduce metric cardinality with `metric_relabel_configs`

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Gallery](https://grafana.com/grafana/dashboards/)

## 🎯 Performance Tips

1. **Optimize Queries**: Use recording rules for frequently used queries
2. **Limit Cardinality**: Avoid high-cardinality labels
3. **Adjust Retention**: Balance storage vs historical data needs
4. **Use Recording Rules**: Pre-calculate expensive queries
5. **Index Metrics**: Properly label metrics for efficient queries

---

**Need Help?** Check the main `DOCKER_SETUP.md` for more information or consult the monitoring logs.
