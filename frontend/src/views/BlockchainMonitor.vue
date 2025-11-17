<template>
  <div class="blockchain-monitor">
    <header class="monitor-header">
      <h1>🔗 Blockchain Voting System - Network Monitor</h1>
      <div class="status-badge" :class="systemStatus">
        {{ systemStatus === 'healthy' ? '🟢' : '🔴' }} {{ systemStatusText }}
      </div>
    </header>

    <div class="monitor-container">
      <!-- Network Overview -->
      <section class="monitor-section">
        <h2>Network Status</h2>
        <div class="network-grid">
          <div class="metric-card">
            <div class="metric-label">Active Nodes</div>
            <div class="metric-value">{{ activeNodes }}/5</div>
            <div class="metric-bar">
              <div class="bar-fill" :style="{ width: (activeNodes / 5) * 100 + '%' }"></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Consensus Threshold</div>
            <div class="metric-value">{{ consensusThreshold }}/5 (80%)</div>
            <div class="metric-bar">
              <div class="bar-fill" :style="{ width: (consensusThreshold / 5) * 100 + '%' }"></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Byzantine Tolerance</div>
            <div class="metric-value">f=1 (Max 1 Byzantine)</div>
            <div class="metric-info">✅ Tolerating 1 faulty node</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Total Transactions</div>
            <div class="metric-value">{{ totalTransactions }}</div>
            <div class="metric-info">{{ transactionsPerSecond }} TPS</div>
          </div>
        </div>
      </section>

      <!-- Byzantine Nodes Status -->
      <section class="monitor-section">
        <h2>Node Details (Validators & Observers)</h2>
        <div class="nodes-grid">
          <div
            v-for="(node, index) in nodes"
            :key="index"
            class="node-card"
            :class="node.status"
          >
            <div class="node-header">
              <span class="node-id">{{ node.id }}</span>
              <span class="node-badge" :class="node.type">{{ node.type }}</span>
            </div>

            <div class="node-metrics">
              <div class="node-metric">
                <span>Status:</span>
                <strong :style="{ color: node.status === 'healthy' ? '#4CAF50' : '#f44336' }">
                  {{ node.status }}
                </strong>
              </div>
              <div class="node-metric">
                <span>Chain Height:</span>
                <strong>{{ node.chainHeight }}</strong>
              </div>
              <div class="node-metric">
                <span>Peers:</span>
                <strong>{{ node.peers }}/4</strong>
              </div>
              <div class="node-metric">
                <span>Blocks:</span>
                <strong>Created: {{ node.blocksCreated }} | Received: {{ node.blocksReceived }}</strong>
              </div>
            </div>

            <div class="node-peers">
              <div class="peer-item" v-for="peer in node.peersList" :key="peer">
                {{ peer }}: {{ getLatency(node.id, peer) }}ms
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Transaction Metrics -->
      <section class="monitor-section">
        <h2>Transaction Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Avg Block Time</div>
            <div class="metric-value">{{ avgBlockTime }}ms</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Transaction Pool</div>
            <div class="metric-value">{{ transactionPool }}</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Avg Latency</div>
            <div class="metric-value">{{ avgLatency }}ms</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Votes Processed</div>
            <div class="metric-value">{{ totalVotes }}</div>
          </div>
        </div>
      </section>

      <!-- Security & Attack Detection -->
      <section class="monitor-section">
        <h2>Security & Attack Detection</h2>
        <div class="security-grid">
          <div class="security-card">
            <div class="security-title">🛡️ Byzantine Attacks Detected</div>
            <div class="security-value">{{ byzantineAttacks }}</div>
            <div class="security-status" :class="byzantineAttacks === 0 ? 'safe' : 'warning'">
              {{ byzantineAttacks === 0 ? 'No attacks detected' : 'Attacks detected & handled' }}
            </div>
          </div>

          <div class="security-card">
            <div class="security-title">🚫 Invalid Transactions Rejected</div>
            <div class="security-value">{{ rejectedTransactions }}</div>
            <div class="security-status safe">Active defense</div>
          </div>

          <div class="security-card">
            <div class="security-title">⚠️ Unhealthy Peers Quarantined</div>
            <div class="security-value">{{ quarantinedPeers }}</div>
            <div class="security-status" :class="quarantinedPeers === 0 ? 'safe' : 'warning'">
              {{ quarantinedPeers === 0 ? 'All peers healthy' : 'Peers isolated' }}
            </div>
          </div>

          <div class="security-card">
            <div class="security-title">🔗 Chain Forks Detected</div>
            <div class="security-value">0</div>
            <div class="security-status safe">BFT preventing forks</div>
          </div>
        </div>
      </section>

      <!-- Network Performance -->
      <section class="monitor-section">
        <h2>Network Performance</h2>
        <div class="performance-grid">
          <div class="performance-card">
            <div class="perf-label">Node Reconnection</div>
            <div class="perf-value">~3s</div>
            <div class="perf-target">(target: <5s)</div>
            <div class="perf-status good">✅ Excellent</div>
          </div>

          <div class="performance-card">
            <div class="perf-label">Peer Re-establishment</div>
            <div class="perf-value">~8s</div>
            <div class="perf-target">(target: <10s)</div>
            <div class="perf-status good">✅ Good</div>
          </div>

          <div class="performance-card">
            <div class="perf-label">Chain Sync</div>
            <div class="perf-value">~12s</div>
            <div class="perf-target">(target: <15s)</div>
            <div class="perf-status good">✅ Good</div>
          </div>

          <div class="performance-card">
            <div class="perf-label">Full Recovery</div>
            <div class="perf-value">~25s</div>
            <div class="perf-target">(target: <30s)</div>
            <div class="perf-status good">✅ Excellent</div>
          </div>
        </div>
      </section>

      <!-- System Health -->
      <section class="monitor-section">
        <h2>System Health</h2>
        <div class="health-grid">
          <div class="health-indicator">
            <div class="health-label">Consensus</div>
            <div class="health-badge healthy">✅ Active</div>
          </div>
          <div class="health-indicator">
            <div class="health-label">Peer Discovery</div>
            <div class="health-badge healthy">✅ Operational</div>
          </div>
          <div class="health-indicator">
            <div class="health-label">Byzantine FT</div>
            <div class="health-badge healthy">✅ Validated</div>
          </div>
          <div class="health-indicator">
            <div class="health-label">Monitoring</div>
            <div class="health-badge healthy">✅ Active</div>
          </div>
        </div>
      </section>

      <!-- Auto-refresh indicator -->
      <footer class="monitor-footer">
        <span>Last updated: {{ lastUpdate }}</span>
        <span class="refresh-indicator" :class="{ updating: isUpdating }">
          🔄 Auto-refreshing every {{ refreshInterval }}ms
        </span>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BlockchainMonitor',
  data() {
    return {
      refreshInterval: 5000, // 5 seconds
      updateTimer: null,
      isUpdating: false,
      lastUpdate: new Date().toLocaleTimeString(),

      // Network metrics
      activeNodes: 5,
      consensusThreshold: 4,
      totalTransactions: 0,
      transactionsPerSecond: 0,
      totalVotes: 0,
      transactionPool: 0,
      avgBlockTime: 2500,
      avgLatency: 45,

      // Security metrics
      byzantineAttacks: 0,
      rejectedTransactions: 0,
      quarantinedPeers: 0,

      // Node data
      nodes: [
        {
          id: 'node1',
          type: 'validator',
          status: 'healthy',
          chainHeight: 1,
          peers: 4,
          blocksCreated: 0,
          blocksReceived: 0,
          peersList: ['node2', 'node3', 'node4', 'node5'],
        },
        {
          id: 'node2',
          type: 'validator',
          status: 'healthy',
          chainHeight: 1,
          peers: 4,
          blocksCreated: 0,
          blocksReceived: 0,
          peersList: ['node1', 'node3', 'node4', 'node5'],
        },
        {
          id: 'node3',
          type: 'validator',
          status: 'healthy',
          chainHeight: 1,
          peers: 4,
          blocksCreated: 0,
          blocksReceived: 0,
          peersList: ['node1', 'node2', 'node4', 'node5'],
        },
        {
          id: 'node4',
          type: 'observer',
          status: 'healthy',
          chainHeight: 1,
          peers: 4,
          blocksCreated: 0,
          blocksReceived: 0,
          peersList: ['node1', 'node2', 'node3', 'node5'],
        },
        {
          id: 'node5',
          type: 'observer',
          status: 'healthy',
          chainHeight: 1,
          peers: 4,
          blocksCreated: 0,
          blocksReceived: 0,
          peersList: ['node1', 'node2', 'node3', 'node4'],
        },
      ],

      // Latency data (peer-to-peer)
      latencies: {
        node1: { node2: 2, node3: 3, node4: 4, node5: 5 },
        node2: { node1: 2, node3: 2, node4: 4, node5: 5 },
        node3: { node1: 3, node2: 2, node4: 5, node5: 6 },
        node4: { node1: 4, node2: 4, node3: 5, node5: 2 },
        node5: { node1: 5, node2: 5, node3: 6, node4: 2 },
      },
    };
  },

  computed: {
    systemStatus() {
      if (this.activeNodes === 5 && this.consensusThreshold === 4) {
        return 'healthy';
      }
      return 'warning';
    },

    systemStatusText() {
      if (this.systemStatus === 'healthy') {
        return 'System Healthy';
      }
      return 'System Warning';
    },
  },

  methods: {
    getLatency(fromNode, toNode) {
      if (this.latencies[fromNode] && this.latencies[fromNode][toNode]) {
        return this.latencies[fromNode][toNode];
      }
      return '?';
    },

    updateMetrics() {
      this.isUpdating = true;
      this.lastUpdate = new Date().toLocaleTimeString();

      // Simulate real-time updates
      // In production, these would come from actual API calls to the nodes
      setTimeout(() => {
        this.activeNodes = Math.random() > 0.05 ? 5 : 4;
        this.consensusThreshold = this.activeNodes >= 4 ? 4 : 3;
        this.totalTransactions += Math.floor(Math.random() * 10);
        this.transactionsPerSecond = Math.floor(Math.random() * 100) / 10;
        this.totalVotes += Math.floor(Math.random() * 5);

        // Update nodes
        this.nodes.forEach((node) => {
          node.chainHeight = Math.max(...this.nodes.map((n) => n.chainHeight)) + (Math.random() > 0.8 ? 1 : 0);
          node.peers = Math.max(3, 4 - Math.floor(Math.random() * 2));
          node.status = node.peers >= 3 ? 'healthy' : 'warning';
        });

        this.isUpdating = false;
      }, 300);
    },

    startAutoRefresh() {
      this.updateTimer = setInterval(() => {
        this.updateMetrics();
      }, this.refreshInterval);
    },

    stopAutoRefresh() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
      }
    },
  },

  mounted() {
    this.updateMetrics();
    this.startAutoRefresh();
  },

  beforeUnmount() {
    this.stopAutoRefresh();
  },
};
</script>

<style scoped>
.blockchain-monitor {
  background: linear-gradient(135deg, #1e1e2e 0%, #16213e 100%);
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 100vh;
  padding: 20px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.monitor-header h1 {
  margin: 0;
  font-size: 28px;
  color: #fff;
}

.status-badge {
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
}

.status-badge.healthy {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
  border: 1px solid #4CAF50;
}

.status-badge.warning {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
  border: 1px solid #FF9800;
}

.monitor-container {
  max-width: 1600px;
  margin: 0 auto;
}

.monitor-section {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border-top: 3px solid #00BCD4;
}

.monitor-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #00BCD4;
  font-size: 20px;
}

/* Grid Layouts */
.network-grid,
.metrics-grid,
.security-grid,
.performance-grid,
.health-grid,
.nodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.nodes-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

/* Metric Cards */
.metric-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  border-left: 3px solid #4CAF50;
}

.metric-label {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.metric-info {
  font-size: 12px;
  color: #4CAF50;
}

.metric-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #00BCD4);
  transition: width 0.3s ease;
}

/* Node Cards */
.node-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  border-left: 3px solid #4CAF50;
}

.node-card.warning {
  border-left-color: #FF9800;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.node-id {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.node-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: bold;
}

.node-badge.validator {
  background: rgba(33, 150, 243, 0.3);
  color: #2196F3;
}

.node-badge.observer {
  background: rgba(156, 39, 176, 0.3);
  color: #9C27B0;
}

.node-metrics {
  margin-bottom: 10px;
}

.node-metric {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  color: #ccc;
}

.node-metric strong {
  color: #fff;
}

.node-peers {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
}

.peer-item {
  color: #999;
  margin-bottom: 4px;
}

/* Security Cards */
.security-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.security-title {
  font-size: 14px;
  color: #ccc;
  margin-bottom: 10px;
}

.security-value {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.security-status {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 4px;
  text-transform: uppercase;
}

.security-status.safe {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.security-status.warning {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
}

/* Performance Cards */
.performance-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.perf-label {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.perf-value {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.perf-target {
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
}

.perf-status {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 4px;
}

.perf-status.good {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

/* Health Indicators */
.health-indicator {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.health-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.health-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.health-badge.healthy {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

/* Footer */
.monitor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: #999;
}

.refresh-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-indicator.updating {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: 15px;
  }

  .monitor-header h1 {
    font-size: 20px;
  }

  .nodes-grid,
  .network-grid {
    grid-template-columns: 1fr;
  }
}
</style>
