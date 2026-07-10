/**
 * Prometheus Metrics Module for Blockchain Node
 * Exposes metrics at /metrics endpoint compatible with Prometheus scraping
 */

const EventEmitter = require('events');

class PrometheusMetrics extends EventEmitter {
    constructor(nodeId, nodeType) {
        super();
        this.nodeId = nodeId;
        this.nodeType = nodeType;
        
        // Counters
        this.blocksCreated = 0;
        this.blocksReceived = 0;
        this.transactionsProcessed = 0;
        this.votesProcessed = 0;
        this.byzantineAttacksDetected = 0;
        this.invalidTransactionsRejected = 0;
        this.peersConnected = 0;
        this.peersDisconnected = 0;
        
        // Gauges
        this.chainHeight = 1;
        this.transactionPoolSize = 0;
        this.connectedPeers = 0;
        this.healthyPeers = 0;
        this.unhealthyPeers = 0;
        this.cpuUsage = 0;
        this.memoryUsage = 0;
        
        // Histograms
        this.blockProductionTime = [];
        this.transactionLatency = [];
        this.peerLatency = {};
        
        // Timestamps
        this.startTime = Date.now();
        this.lastMetricsUpdate = Date.now();
    }
    
    /**
     * Record block creation
     */
    recordBlockCreated(blockData) {
        this.blocksCreated++;
        this.chainHeight = (blockData?.blockNumber || this.chainHeight) + 1;
        this.emit('block_created', { nodeId: this.nodeId, block: blockData });
    }
    
    /**
     * Record block received
     */
    recordBlockReceived(blockData) {
        this.blocksReceived++;
        this.chainHeight = Math.max(this.chainHeight, (blockData?.blockNumber || 0) + 1);
        this.emit('block_received', { nodeId: this.nodeId, block: blockData });
    }
    
    /**
     * Record transaction processed
     */
    recordTransactionProcessed(latency = 0) {
        this.transactionsProcessed++;
        if (latency > 0) {
            this.transactionLatency.push(latency);
        }
        this.emit('transaction_processed', { nodeId: this.nodeId, latency });
    }
    
    /**
     * Record vote processed
     */
    recordVoteProcessed(voteData) {
        this.votesProcessed++;
        this.emit('vote_processed', { nodeId: this.nodeId, vote: voteData });
    }
    
    /**
     * Record Byzantine attack detection
     */
    recordByzantineAttack(attackType) {
        this.byzantineAttacksDetected++;
        this.emit('byzantine_attack_detected', { 
            nodeId: this.nodeId, 
            attackType: attackType,
            timestamp: Date.now()
        });
    }
    
    /**
     * Record invalid transaction rejection
     */
    recordInvalidTransaction(reason) {
        this.invalidTransactionsRejected++;
        this.emit('invalid_transaction_rejected', {
            nodeId: this.nodeId,
            reason: reason,
            timestamp: Date.now()
        });
    }
    
    /**
     * Update peer metrics
     */
    updatePeerMetrics(peers, healthyCount, unhealthyCount) {
        this.connectedPeers = peers.length;
        this.healthyPeers = healthyCount;
        this.unhealthyPeers = unhealthyCount;
        this.emit('peer_metrics_updated', {
            nodeId: this.nodeId,
            totalPeers: peers.length,
            healthyPeers: healthyCount,
            unhealthyPeers: unhealthyCount
        });
    }
    
    /**
     * Update transaction pool
     */
    updateTransactionPool(poolSize) {
        this.transactionPoolSize = poolSize;
    }
    
    /**
     * Record peer latency
     */
    recordPeerLatency(peerId, latency) {
        if (!this.peerLatency[peerId]) {
            this.peerLatency[peerId] = [];
        }
        this.peerLatency[peerId].push(latency);
        // Keep only last 100 samples
        if (this.peerLatency[peerId].length > 100) {
            this.peerLatency[peerId].shift();
        }
    }
    
    /**
     * Calculate average latency for peer
     */
    getAverageLatency(peerId) {
        if (!this.peerLatency[peerId] || this.peerLatency[peerId].length === 0) {
            return 0;
        }
        const sum = this.peerLatency[peerId].reduce((a, b) => a + b, 0);
        return Math.round(sum / this.peerLatency[peerId].length);
    }
    
    /**
     * Get uptime in seconds
     */
    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
    
    /**
     * Calculate average transaction latency
     */
    getAverageTransactionLatency() {
        if (this.transactionLatency.length === 0) return 0;
        const sum = this.transactionLatency.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.transactionLatency.length);
    }
    
    /**
     * Generate Prometheus format metrics
     */
    generateMetrics() {
        const timestamp = Date.now();
        let metrics = '';
        
        // HELP and TYPE
        metrics += `# HELP blockchain_node_info Node information\n`;
        metrics += `# TYPE blockchain_node_info gauge\n`;
        metrics += `blockchain_node_info{node_id="${this.nodeId}",node_type="${this.nodeType}",version="1.0.0"} 1\n\n`;
        
        // Counters
        metrics += `# HELP blockchain_blocks_created_total Total blocks created\n`;
        metrics += `# TYPE blockchain_blocks_created_total counter\n`;
        metrics += `blockchain_blocks_created_total{node_id="${this.nodeId}"} ${this.blocksCreated}\n\n`;
        
        metrics += `# HELP blockchain_blocks_received_total Total blocks received\n`;
        metrics += `# TYPE blockchain_blocks_received_total counter\n`;
        metrics += `blockchain_blocks_received_total{node_id="${this.nodeId}"} ${this.blocksReceived}\n\n`;
        
        metrics += `# HELP blockchain_transactions_processed_total Total transactions processed\n`;
        metrics += `# TYPE blockchain_transactions_processed_total counter\n`;
        metrics += `blockchain_transactions_processed_total{node_id="${this.nodeId}"} ${this.transactionsProcessed}\n\n`;
        
        metrics += `# HELP blockchain_votes_processed_total Total votes processed\n`;
        metrics += `# TYPE blockchain_votes_processed_total counter\n`;
        metrics += `blockchain_votes_processed_total{node_id="${this.nodeId}"} ${this.votesProcessed}\n\n`;
        
        metrics += `# HELP blockchain_byzantine_attacks_detected_total Total Byzantine attacks detected\n`;
        metrics += `# TYPE blockchain_byzantine_attacks_detected_total counter\n`;
        metrics += `blockchain_byzantine_attacks_detected_total{node_id="${this.nodeId}"} ${this.byzantineAttacksDetected}\n\n`;
        
        metrics += `# HELP blockchain_invalid_transactions_rejected_total Total invalid transactions rejected\n`;
        metrics += `# TYPE blockchain_invalid_transactions_rejected_total counter\n`;
        metrics += `blockchain_invalid_transactions_rejected_total{node_id="${this.nodeId}"} ${this.invalidTransactionsRejected}\n\n`;
        
        // Gauges
        metrics += `# HELP blockchain_chain_height Current chain height\n`;
        metrics += `# TYPE blockchain_chain_height gauge\n`;
        metrics += `blockchain_chain_height{node_id="${this.nodeId}"} ${this.chainHeight}\n\n`;
        
        metrics += `# HELP blockchain_transaction_pool_size Current transaction pool size\n`;
        metrics += `# TYPE blockchain_transaction_pool_size gauge\n`;
        metrics += `blockchain_transaction_pool_size{node_id="${this.nodeId}"} ${this.transactionPoolSize}\n\n`;
        
        metrics += `# HELP blockchain_connected_peers Current number of connected peers\n`;
        metrics += `# TYPE blockchain_connected_peers gauge\n`;
        metrics += `blockchain_connected_peers{node_id="${this.nodeId}"} ${this.connectedPeers}\n\n`;
        
        metrics += `# HELP blockchain_healthy_peers Current number of healthy peers\n`;
        metrics += `# TYPE blockchain_healthy_peers gauge\n`;
        metrics += `blockchain_healthy_peers{node_id="${this.nodeId}"} ${this.healthyPeers}\n\n`;
        
        metrics += `# HELP blockchain_unhealthy_peers Current number of unhealthy peers\n`;
        metrics += `# TYPE blockchain_unhealthy_peers gauge\n`;
        metrics += `blockchain_unhealthy_peers{node_id="${this.nodeId}"} ${this.unhealthyPeers}\n\n`;
        
        // Latency metrics
        metrics += `# HELP blockchain_transaction_latency_avg Average transaction latency in ms\n`;
        metrics += `# TYPE blockchain_transaction_latency_avg gauge\n`;
        metrics += `blockchain_transaction_latency_avg{node_id="${this.nodeId}"} ${this.getAverageTransactionLatency()}\n\n`;
        
        // Per-peer latency
        Object.keys(this.peerLatency).forEach(peerId => {
            const avgLatency = this.getAverageLatency(peerId);
            metrics += `# HELP blockchain_peer_latency_ms Latency to peer in ms\n`;
            metrics += `# TYPE blockchain_peer_latency_ms gauge\n`;
            metrics += `blockchain_peer_latency_ms{node_id="${this.nodeId}",peer_id="${peerId}"} ${avgLatency}\n`;
        });
        metrics += '\n';
        
        // Uptime
        metrics += `# HELP blockchain_uptime_seconds Node uptime in seconds\n`;
        metrics += `# TYPE blockchain_uptime_seconds gauge\n`;
        metrics += `blockchain_uptime_seconds{node_id="${this.nodeId}"} ${this.getUptime()}\n\n`;
        
        // Timestamp
        metrics += `# HELP blockchain_metrics_timestamp_ms Timestamp of metric collection\n`;
        metrics += `# TYPE blockchain_metrics_timestamp_ms gauge\n`;
        metrics += `blockchain_metrics_timestamp_ms{node_id="${this.nodeId}"} ${timestamp}\n`;
        
        return metrics;
    }
    
    /**
     * Get metrics as JSON
     */
    getMetricsJSON() {
        return {
            nodeId: this.nodeId,
            nodeType: this.nodeType,
            uptime: this.getUptime(),
            chain: {
                height: this.chainHeight,
                blocksCreated: this.blocksCreated,
                blocksReceived: this.blocksReceived,
            },
            transactions: {
                processed: this.transactionsProcessed,
                poolSize: this.transactionPoolSize,
                avgLatency: this.getAverageTransactionLatency(),
            },
            votes: {
                processed: this.votesProcessed,
            },
            security: {
                byzantineAttacksDetected: this.byzantineAttacksDetected,
                invalidTransactionsRejected: this.invalidTransactionsRejected,
            },
            network: {
                connectedPeers: this.connectedPeers,
                healthyPeers: this.healthyPeers,
                unhealthyPeers: this.unhealthyPeers,
                peerLatencies: Object.keys(this.peerLatency).map(peerId => ({
                    peerId: peerId,
                    avgLatency: this.getAverageLatency(peerId),
                })),
            },
            timestamp: Date.now(),
        };
    }
}

module.exports = PrometheusMetrics;
