/**
 * Node Monitor Module
 * Monitors node health, blockchain synchronization, and network statistics
 */

const EventEmitter = require('events');

class NodeMonitor extends EventEmitter {
    constructor(nodeId, nodeType = 'validator') {
        super();
        this.nodeId = nodeId;
        this.nodeType = nodeType;
        this.startTime = Date.now();
        this.stats = {
            blocksProduced: 0,
            votesProcessed: 0,
            transactionsProcessed: 0,
            lastBlockTime: null,
            chainHeight: 0,
            networkLatency: {}
        };
        this.blockTimes = [];
        this.maxBlockTimes = 100;
    }

    /**
     * Update chain height
     */
    updateChainHeight(height) {
        this.stats.chainHeight = height;
        this.emit('chain_height_updated', { nodeId: this.nodeId, height });
    }

    /**
     * Record block production
     */
    recordBlockProduced(block) {
        this.stats.blocksProduced++;
        const now = Date.now();
        this.stats.lastBlockTime = now;
        
        // Track block production times
        if (this.blockTimes.length >= this.maxBlockTimes) {
            this.blockTimes.shift();
        }
        this.blockTimes.push({
            timestamp: now,
            index: block.index,
            transactionCount: block.data ? block.data.length : 0
        });

        this.emit('block_produced', {
            nodeId: this.nodeId,
            blockIndex: block.index,
            transactionCount: block.data ? block.data.length : 0
        });
    }

    /**
     * Record vote processed
     */
    recordVoteProcessed() {
        this.stats.votesProcessed++;
        this.emit('vote_processed', { nodeId: this.nodeId });
    }

    /**
     * Record transaction processed
     */
    recordTransactionProcessed() {
        this.stats.transactionsProcessed++;
        this.emit('transaction_processed', { nodeId: this.nodeId });
    }

    /**
     * Record network latency to peer
     */
    recordLatency(peerId, latency) {
        this.stats.networkLatency[peerId] = latency;
        this.emit('latency_recorded', { nodeId: this.nodeId, peerId, latency });
    }

    /**
     * Get node status
     */
    getNodeStatus() {
        const uptime = Date.now() - this.startTime;
        const averageBlockTime = this.blockTimes.length > 0
            ? this.blockTimes.reduce((sum, bt) => sum + (bt.timestamp - (this.blockTimes[0]?.timestamp || 0)), 0) / this.blockTimes.length
            : 0;

        return {
            nodeId: this.nodeId,
            nodeType: this.nodeType,
            status: 'healthy',
            chainHeight: this.stats.chainHeight,
            blocksProduced: this.stats.blocksProduced,
            votesProcessed: this.stats.votesProcessed,
            transactionsProcessed: this.stats.transactionsProcessed,
            lastBlockTime: this.stats.lastBlockTime,
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            averageBlockTime: Math.round(averageBlockTime),
            networkLatency: this.stats.networkLatency,
            averageNetworkLatency: this.calculateAverageLatency(),
            timestamp: Date.now()
        };
    }

    /**
     * Get network status (requires peerManager)
     */
    getNetworkStatus(peerManager, blockchain) {
        const peerStats = peerManager.getStats();
        const chainHeight = blockchain ? blockchain.chain.length : 0;
        const blockTimes = this.blockTimes.slice(-10); // Last 10 blocks
        const averageBlockTime = blockTimes.length > 0
            ? blockTimes.reduce((sum, i) => sum + (blockTimes[i]?.timestamp - (blockTimes[i - 1]?.timestamp || 0)), 0) / blockTimes.length
            : 0;

        return {
            nodeId: this.nodeId,
            totalNodes: peerStats.totalPeers + 1, // Including this node
            healthyNodes: peerStats.healthyPeers + 1,
            unhealthyNodes: peerStats.unhealthyPeers,
            consensusStatus: this.determineConsensusStatus(peerStats.healthyPeers),
            chainHeight: chainHeight,
            blocksProduced: this.stats.blocksProduced,
            votesProcessed: this.stats.votesProcessed,
            averageBlockTime: Math.round(averageBlockTime),
            totalTransactions: this.stats.transactionsProcessed,
            networkLatency: this.calculateAverageLatency(),
            peers: peerStats.peers,
            timestamp: Date.now()
        };
    }

    /**
     * Determine consensus status
     */
    determineConsensusStatus(healthyPeers) {
        // With 5 nodes total, need 3 for consensus
        const consensusThreshold = Math.floor(6 / 2); // Majority
        const healthyWithSelf = healthyPeers + 1;

        if (healthyWithSelf >= consensusThreshold) {
            return 'active';
        } else if (healthyWithSelf >= 1) {
            return 'degraded';
        } else {
            return 'offline';
        }
    }

    /**
     * Calculate average network latency
     */
    calculateAverageLatency() {
        const latencies = Object.values(this.stats.networkLatency);
        if (latencies.length === 0) return 0;
        return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    }

    /**
     * Format uptime
     */
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Get block production metrics
     */
    getBlockProductionMetrics() {
        if (this.blockTimes.length === 0) {
            return {
                totalBlocksProduced: 0,
                blockTimes: [],
                averageBlockTime: 0,
                lastBlockTime: this.stats.lastBlockTime
            };
        }

        const blockTimes = [];
        for (let i = 1; i < this.blockTimes.length; i++) {
            blockTimes.push(this.blockTimes[i].timestamp - this.blockTimes[i - 1].timestamp);
        }

        const averageBlockTime = blockTimes.length > 0
            ? blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length
            : 0;

        return {
            totalBlocksProduced: this.stats.blocksProduced,
            blockIntervals: blockTimes.slice(-10), // Last 10 intervals
            averageBlockTime: Math.round(averageBlockTime),
            minBlockTime: blockTimes.length > 0 ? Math.min(...blockTimes) : 0,
            maxBlockTime: blockTimes.length > 0 ? Math.max(...blockTimes) : 0,
            lastBlockTime: this.stats.lastBlockTime
        };
    }

    /**
     * Get transaction metrics
     */
    getTransactionMetrics() {
        return {
            totalTransactionsProcessed: this.stats.transactionsProcessed,
            totalVotesProcessed: this.stats.votesProcessed,
            transactionPercentage: this.stats.transactionsProcessed > 0
                ? Math.round((this.stats.votesProcessed / this.stats.transactionsProcessed) * 100)
                : 0,
            uptime: Date.now() - this.startTime
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            blocksProduced: 0,
            votesProcessed: 0,
            transactionsProcessed: 0,
            lastBlockTime: null,
            chainHeight: 0,
            networkLatency: {}
        };
        this.blockTimes = [];
        this.startTime = Date.now();
    }
}

module.exports = NodeMonitor;
