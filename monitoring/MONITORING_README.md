# Blockchain Voting System - Network Monitoring Dashboard
# This dashboard visualizes the Byzantine Fault Tolerant network in real-time

## Prometheus Targets

### Blockchain Nodes (5 nodes on ports 3001-3005)
- node1: http://localhost:3001/metrics
- node2: http://localhost:3002/metrics  
- node3: http://localhost:3003/metrics
- node4: http://localhost:3004/metrics
- node5: http://localhost:3005/metrics

### System Metrics
- cAdvisor (container): http://localhost:8081/metrics
- Node Exporter (host): http://localhost:9100/metrics
- MySQL (database): http://localhost:9104/metrics

## Grafana Dashboards

### 1. Blockchain Network Status
**Panels:**
- Active Nodes: Count of healthy nodes
- Peer Connectivity: Network topology visualization
- Consensus Status: Current consensus round
- Byzantine Nodes: Detected Byzantine behavior

### 2. Byzantine Fault Tolerance
**Panels:**
- Max Byzantine Tolerance: (n-1)/3 = f
- Consensus Threshold: 4/5 nodes (80%)
- Validator Status: node1, node2, node3
- Observer Status: node4, node5

### 3. Transaction Metrics
**Panels:**
- Transactions Per Second (TPS)
- Average Block Time
- Transaction Pool Size
- Elections Active

### 4. Network Health
**Panels:**
- Peer Connections: Per node
- Network Latency: Inter-node
- Chain Height: By node
- Fork Detection: 0 forks

### 5. Attack Detection
**Panels:**
- Byzantine Attacks Detected
- Invalid Transactions Rejected
- Quarantined Nodes
- Forensic Events

### 6. Performance
**Panels:**
- Node CPU Usage
- Memory Usage
- Disk I/O
- Network I/O

## Access URLs

- **Grafana Dashboard:** http://localhost:3030 (admin/admin)
- **Prometheus Queries:** http://localhost:9090
- **cAdvisor Metrics:** http://localhost:8081
- **Node Exporter:** http://localhost:9100
