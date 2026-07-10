# Logs Analysis - Quick Reference Guide

## 🎯 Access Your Dashboards

### Dashboard 1: Voting System Metrics
**URL**: http://localhost:3030/d/225e6629-faed-466b-ad5d-c6587ca535a8/
- Blockchain nodes status
- Votes processed count
- CPU & Memory gauges

### Dashboard 2: Advanced Metrics + Error Trends
**URL**: http://localhost:3030/d/47b1ff1d-1984-4c43-9734-cdfd65f893fe/
- Error rate trending
- Error logs by service
- All system logs stream

### Dashboard 3: System & Container Metrics ⭐ NEW
**URL**: http://localhost:3030/d/8c41568e-a6cf-46be-843d-3433ba703035/
- Container CPU trends
- Container memory trends
- Network traffic analysis
- Disk I/O monitoring
- Real-time container stats

## 🔑 Login Credentials
```
Grafana: http://localhost:3030
Username: admin
Password: admin
```

## 📊 What You Can Monitor

### Real-Time Container Metrics
```
✅ CPU usage per container (trending)
✅ Memory usage per container (trending)
✅ Network bytes in/out
✅ Disk I/O operations
✅ Container count
✅ System-wide CPU & Memory
```

### Log Types Captured
```
✅ Backend API logs (stdout/stderr)
✅ Blockchain node logs
✅ MySQL database logs
✅ Frontend application logs
✅ System error messages
✅ Container startup/shutdown events
```

## 🚀 Quick Tasks

### View Container Performance During Testing
1. Open Dashboard 3
2. Watch the graphs update in real-time (30s refresh)
3. CPU & Memory graphs show per-container usage
4. Network panel shows overall traffic

### Troubleshoot Issues
1. Open Dashboard 3
2. Look for spikes in:
   - CPU usage → Application bottleneck
   - Memory usage → Memory leak or high load
   - Network traffic → Network congestion
   - Disk I/O → Disk bottleneck

### Monitor Specific Service
1. Open Dashboard 3
2. Click any panel to drill down
3. Use label filters: `name="voting-backend"`
4. View specific container trends

## 📈 Expected Metrics

### At Rest (No Load)
```
CPU: 2-5%
Memory: 1.5-2 GB
Network: <100 KB/s
Disk I/O: <10 ops/sec
```

### During Voting Load
```
CPU: 20-40%
Memory: 2-3 GB
Network: 1-5 MB/s
Disk I/O: 50-200 ops/sec
```

## ⚠️ Alert Thresholds

```
🔴 CRITICAL
- CPU > 90% for >5 min
- Memory > 85%
- Network > 100 MB/s sustained
- Container count < 4

🟡 WARNING
- CPU > 70% for >10 min
- Memory > 70%
- Network > 50 MB/s for >5 min
- Error rate spike (2x baseline)
```

## 🛠️ Docker Commands for Logs

```bash
# View service logs in real-time
docker logs -f voting-backend
docker logs -f voting-blockchain
docker logs -f voting-mysql
docker logs -f voting-frontend

# View last 100 lines
docker logs --tail 100 voting-backend

# View logs from last hour
docker logs --since 1h voting-backend

# Check container stats
docker stats voting-backend --no-stream
```

## 🔍 Prometheus Queries

Use these in Dashboard 3 or Prometheus (http://localhost:9090):

```promql
# CPU usage
rate(container_cpu_usage_seconds_total{name="voting-backend"}[5m])

# Memory usage in MB
container_memory_usage_bytes{name="voting-backend"} / 1024 / 1024

# Network in
rate(container_network_receive_bytes_total{name="voting-backend"}[5m])

# Network out
rate(container_network_transmit_bytes_total{name="voting-backend"}[5m])

# All containers
container_memory_usage_bytes / 1024 / 1024
```

## 📱 Mobile/Remote Access

```
From another machine on network:
http://<your-ip>:3030

Grafana will be accessible from:
- Same network: http://<machine-ip>:3030
- Using SSH tunnel: ssh -L 3030:localhost:3030 user@host
```

## 🔄 Refresh & Time Ranges

**Auto-Refresh**: 30 seconds (configurable)
**Time Range**: Last 6 hours (default)
**Adjust**: Top-right corner of dashboard

## 💾 Export & Backup

```bash
# Export a dashboard
curl http://admin:admin@localhost:3030/api/dashboards/uid/8c41568e-a6cf-46be-843d-3433ba703035 > dashboard-backup.json

# Export all dashboards
curl http://admin:admin@localhost:3030/api/search | jq -r '.[] | .uid' | \
while read uid; do
  curl http://admin:admin@localhost:3030/api/dashboards/uid/$uid > dashboard-$uid.json
done
```

## 🐛 Troubleshooting

### Dashboard Not Loading
```bash
# Check Grafana
docker logs voting-grafana

# Restart Grafana
docker restart voting-grafana

# Verify Prometheus
curl http://localhost:9090/api/v1/targets
```

### No Metrics Appearing
```bash
# Check containers running
docker ps

# Check Node Exporter
curl http://localhost:9100/metrics | head

# Check cAdvisor
curl http://localhost:8081/api/v1/machine
```

### Memory or CPU Spike
1. Open Dashboard 3
2. Look at container trends
3. Identify which container spiked
4. Check its logs: `docker logs voting-<container>`
5. Compare with application code

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `LOGS_ANALYSIS_INTEGRATION_COMPLETE.md` | This overview & next steps |
| `LOGS_AND_METRICS_INTEGRATION.md` | Detailed guide & advanced usage |
| `GRAFANA_LOGS_INTEGRATION.md` | Loki setup & log queries |
| `LOKI_SETUP.md` | Loki configuration reference |

## ✅ What's Working

```
✅ Grafana: Running (3 dashboards)
✅ Prometheus: Running (all targets UP)
✅ Node Exporter: Running (system metrics)
✅ cAdvisor: Running (container metrics)
✅ Container logs: Captured by Docker
✅ Real-time monitoring: Active
✅ Metric retention: 30 days
✅ Auto-refresh: 30 seconds
```

## 🎓 Learning Path

1. **Start**: Open Dashboard 3
2. **Explore**: Click different panels
3. **Learn**: Hover over metrics for info
4. **Drill Down**: Click to filter by container
5. **Query**: Use Prometheus for custom queries
6. **Alert**: Create thresholds for issues

## 🚀 Next Steps

1. ✅ View Dashboard during P1 tests
2. ✅ Monitor vote submissions
3. ✅ Test alerts
4. ✅ Create custom dashboards
5. ✅ Set up email notifications

---

**Dashboard 3 URL**: http://localhost:3030/d/8c41568e-a6cf-46be-843d-3433ba703035/

**All 3 Dashboards Available** - Choose based on your focus:
- **Dashboard 1**: Quick voting metrics overview
- **Dashboard 2**: Error analysis & trends
- **Dashboard 3**: Deep system & container analysis ⭐ Recommended

**Real-time Monitoring**: All dashboards update every 30 seconds
