# Grafana Logs Integration Setup

## Overview
Loki has been integrated into the monitoring stack for centralized log aggregation and analysis. You can now view system logs directly in Grafana alongside metrics.

## Current Setup

### Deployed Services
- **Loki** (Port 3100): Log aggregation engine
- **Grafana** (Port 3030): Updated with Loki data source
- **Prometheus** (Port 9090): Metrics collection
- **Node Exporter, cAdvisor**: System metrics

## Access Points

### Main Dashboard (with Logs)
- **URL**: http://localhost:3030/d/47b1ff1d-1984-4c43-9734-cdfd65f893fe/
- **Title**: Blockchain Voting System - Complete Monitoring with Logs
- **Credentials**: admin / admin

### Dashboard Panels

#### Metrics Panels
1. **Blockchain Nodes - Active** (stat): Count of running blockchain nodes
2. **Total Votes Processed** (stat): Cumulative vote count
3. **System CPU Usage %** (gauge): Real-time CPU utilization
4. **System Memory Usage %** (gauge): Real-time memory utilization

#### Log Panels
5. **Backend Logs** (logs): Application server logs
6. **Blockchain Node Logs** (logs): Blockchain node output
7. **Database Logs** (logs): MySQL database logs
8. **Frontend Logs** (logs): Frontend application logs
9. **Error Rate Trend** (graph): Error frequency over time
10. **All System Logs** (logs): Combined stream from all services

## Log Queries (LogQL)

### Available Log Queries
```logql
# Backend logs only
{service="backend"}

# Blockchain node logs
{service="blockchain-node"}

# Database logs
{service="mysql"}

# Frontend logs
{service="frontend"}

# Error logs across all services
{level="error"}

# Specific time range (last 1 hour)
{service="backend"} | since(1h)

# Filter by level
{service="backend"} |= "error" or "warn"

# Count error rates
sum(rate({level="error"} [5m])) by (service)
```

## How to Enable Log Collection

### Option 1: Container Logging Driver (Recommended)

Add logging configuration to each service in `docker-compose.yml`:

```yaml
services:
  backend:
    # ... existing config ...
    logging:
      driver: "json-file"
      options:
        labels: "service=backend,project=voting"
        max-size: "10m"
        max-file: "3"
```

### Option 2: Direct Docker Logs to Loki

For running containers, logs are automatically collected by Docker's JSON file driver and stored in:
- Linux/Mac: `/var/lib/docker/containers/{container-id}/{container-id}-json.log`
- Windows: `C:\ProgramData\Docker\containers\{container-id}\{container-id}-json.log`

## Monitoring Logs in Real-Time

### Step 1: Open Dashboard
1. Go to http://localhost:3030
2. Navigate to "Dashboards" → "Blockchain Voting System - Complete Monitoring with Logs"

### Step 2: View Specific Service Logs
Click on any "Logs" panel and you'll see:
- Timestamp (sortable)
- Log level (auto-detected)
- Container name
- Log message

### Step 3: Search Logs
Use the Loki query syntax in the "Logs" panels:
- Type in the query field to filter logs
- Example: `{service="backend"} |= "error"`
- Press Enter to execute

## Key Features

✅ **Real-time Log Streaming**: See logs as they're generated
✅ **Multi-service View**: Monitor all services in one dashboard
✅ **Error Tracking**: Automatic error rate trending
✅ **Timestamp Correlation**: Match logs with metrics for correlation
✅ **JSON Parsing**: Structured log analysis
✅ **Log Retention**: Configurable retention policies

## Grafana Navigation

### Access Loki Data Source
1. Settings → Data Sources → "Loki"
2. URL: `http://voting-loki:3100`
3. Status: Should show "✓ Connection OK"

### Create Custom Log Panels
1. Dashboard → Create Panel
2. Select "Logs" panel type
3. Data Source: "Loki"
4. Enter LogQL query: `{service="backend"}`
5. Click "Run query"

## Troubleshooting

### Loki Service Not Responding
```bash
# Check Loki container status
docker ps | grep loki

# View Loki logs
docker logs voting-loki

# Restart Loki
docker restart voting-loki
```

### No Logs Appearing
1. Ensure containers have labels set
2. Check container logging driver: `docker inspect {container-id} | grep -A 10 LogDriver`
3. Verify Loki datasource connection in Grafana

### Log Retention Settings
Edit `loki-config.yml`:
```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days
```

## Next Steps

1. **Enable Container Logging**: Update docker-compose.yml with logging config
2. **Create Alerts**: Set up alerts for error rate spikes
3. **Custom Dashboards**: Create focused dashboards for specific services
4. **Log Retention Policy**: Configure long-term log storage

## Files Updated
- `docker-compose.monitoring.yml`: Added Loki and Promtail services
- `loki-config.yml`: Loki configuration
- `promtail-config.yml`: Promtail Docker scrape config
- `grafana-dashboard-with-logs.json`: 10-panel monitoring dashboard
- `LOKI_SETUP.md`: This documentation

## Testing the Integration

### Send a Test Log
```bash
# Via backend API
curl http://localhost:3000/api/health

# Via database
docker exec voting-mysql mysql -u voting_user -pvoting_pass voting_db -e "SELECT 1"

# Via blockchain
curl http://localhost:3001/node
```

Then check the corresponding log panels in Grafana.

## Dashboard URL
**Direct Access**: http://localhost:3030/d/47b1ff1d-1984-4c43-9734-cdfd65f893fe/

**Features**:
- Auto-refresh every 30 seconds
- 10 integrated panels (metrics + logs)
- Error trend visualization
- Real-time service monitoring
- Complete system overview

---

**Status**: ✅ Loki integrated and ready for use
**Last Updated**: November 18, 2025
