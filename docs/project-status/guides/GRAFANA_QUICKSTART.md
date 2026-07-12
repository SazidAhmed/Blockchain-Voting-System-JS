# 🎯 Grafana Setup Guide - Next Steps

**Status:** ✅ You're logged into Grafana at <http://localhost:3030>

---

## 🚀 What to Do Now (3 Steps)

### Step 1: Add Prometheus Data Source (1 minute)

1. **In Grafana**, go to: **Settings** (⚙️ gear icon) → **Data Sources**
2. Click **Add new data source**
3. Select **Prometheus**
4. Fill in:
   - **Name:** Prometheus
   - **URL:** <http://prometheus:9090>
   - Click **Save & Test**
5. Should show: ✅ "Data source is working"

### Step 2: Create Your First Dashboard (5 minutes)

1. Click **+ (Create)** → **Dashboard**
2. Click **Add a new panel**
3. Select **Prometheus** as data source
4. Try this query: `up` (shows which services are up)
5. Click **Run query**
6. You should see metrics data

### Step 3: Add Container Metrics (5 minutes)

**Panel 1: CPU Usage**

```text
Query: container_cpu_usage_seconds_total
Title: Container CPU Usage
```

**Panel 2: Memory Usage**

```text
Query: container_memory_usage_bytes
Title: Memory Usage (Bytes)
```

**Panel 3: Network I/O**

```text
Query: rate(container_network_receive_bytes_total[5m])
Title: Network Receive Rate
```

---

## 📊 Example Queries to Try

### System Metrics

```text
# CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100
```

### Container Metrics

```text
# Container CPU
container_cpu_usage_seconds_total

# Container Memory
container_memory_usage_bytes

# Network in/out
container_network_receive_bytes_total
container_network_transmit_bytes_total
```

---

## 🎨 Dashboard Ideas

### Dashboard 1: Infrastructure Overview

- Container CPU usage
- Container Memory usage
- Network I/O
- Container restart count

### Dashboard 2: System Health

- CPU utilization
- Memory utilization
- Disk usage
- Load average

### Dashboard 3: Network Performance

- Bytes received/sent
- Packets received/sent
- Network errors

---

## 💡 Quick Tips

**Save your dashboard:**

- After adding panels, click the **Save** button (top right)
- Give it a name like "Voting System Overview"

**Refresh data:**

- Use the refresh button (top right) or set auto-refresh interval
- Recommended: 5 second refresh for live monitoring

**View specific container:**

- Filter by container name in queries
- Example: `container_cpu_usage_seconds_total{name="voting-blockchain-node-1"}`

**Check available metrics:**

- Go to Prometheus at <http://localhost:9090>
- Type metric name and hit Ctrl+Space for autocomplete

---

## 📋 Available Metrics (Sample)

### From cAdvisor

```text
container_cpu_usage_seconds_total
container_memory_usage_bytes
container_memory_limit_bytes
container_network_receive_bytes_total
container_network_transmit_bytes_total
container_cpu_cfs_periods_total
container_cpu_cfs_throttled_seconds_total
container_fs_usage_bytes
container_fs_limit_bytes
```

### From Node Exporter

```text
node_cpu_seconds_total
node_memory_MemTotal_bytes
node_memory_MemAvailable_bytes
node_memory_MemFree_bytes
node_filesystem_size_bytes
node_filesystem_avail_bytes
node_filesystem_used_bytes
node_disk_reads_total
node_disk_writes_total
node_network_receive_bytes_total
node_network_transmit_bytes_total
```

---

## ✨ Next: Enable Blockchain Metrics (Optional)

To add blockchain-specific metrics to your dashboards:

1. Integrate `prometheusMetrics.js` into `services/blockchain-node/index.js`
2. Add `/metrics` endpoint to expose blockchain metrics
3. Rebuild and restart blockchain nodes
4. Then you can query:
   - `blockchain_blocks_created_total`
   - `blockchain_transactions_processed_total`
   - `blockchain_byzantine_attacks_detected_total`
   - `blockchain_connected_peers`
   - `blockchain_chain_height`

---

## 🎯 Try This Now

**Quick test in Grafana:**

1. Create new dashboard
2. Add a panel
3. Try query: `up`
4. You should see 1 or 0 values for each service
5. This shows what's up or down

---

**Status:** ✅ Ready to create dashboards!

Next step: Add Prometheus data source (if not already done automatically)
