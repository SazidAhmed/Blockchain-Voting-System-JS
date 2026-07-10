/**
 * Peer Manager Module
 * Handles P2P node communication, peer discovery, and connection management
 */

const io = require('socket.io-client');
const EventEmitter = require('events');

// Message types for P2P communication
const MessageTypes = {
    NODE_JOIN: 'NODE_JOIN',
    NODE_LEAVE: 'NODE_LEAVE',
    CHAIN_REQUEST: 'CHAIN_REQUEST',
    CHAIN_RESPONSE: 'CHAIN_RESPONSE',
    BLOCK_BROADCAST: 'BLOCK_BROADCAST',
    VOTE_BROADCAST: 'VOTE_BROADCAST',
    HEARTBEAT: 'HEARTBEAT',
    HEARTBEAT_RESPONSE: 'HEARTBEAT_RESPONSE'
};

class PeerManager extends EventEmitter {
    constructor(nodeId, nodeType = 'validator') {
        super();
        this.nodeId = nodeId;
        this.nodeType = nodeType;
        this.peers = new Map(); // nodeId -> { socket, info, lastHeartbeat, status }
        this.peerHealth = new Map(); // nodeId -> { lastHeartbeat, responseTime, status }
        this.connectionAttempts = new Map(); // nodeId -> attemptCount
        this.maxRetries = 5;
        this.heartbeatInterval = 30000; // 30 seconds
        this.heartbeatTimeout = 10000; // 10 seconds
        this.reconnectDelay = 5000; // 5 seconds
        this.startHeartbeatMonitor();
    }

    /**
     * Add a peer connection
     */
    addPeer(nodeId, socket, peerInfo = {}) {
        if (this.peers.has(nodeId)) {
            console.warn(`Peer ${nodeId} already exists. Updating connection.`);
            const existing = this.peers.get(nodeId);
            if (existing.socket) {
                existing.socket.disconnect();
            }
        }

        this.peers.set(nodeId, {
            socket,
            info: {
                nodeId,
                nodeType: peerInfo.nodeType || 'unknown',
                port: peerInfo.port || 'unknown',
                chainHeight: peerInfo.chainHeight || 0,
                ...peerInfo
            },
            lastHeartbeat: Date.now(),
            status: 'connected',
            messageCount: 0
        });

        this.peerHealth.set(nodeId, {
            lastHeartbeat: Date.now(),
            responseTime: 0,
            status: 'healthy'
        });

        // Reset connection attempts on successful connection
        this.connectionAttempts.set(nodeId, 0);

        this.emit('peer_connected', { nodeId, peerInfo: this.peers.get(nodeId).info });
        console.log(`✓ Peer added: ${nodeId} (${peerInfo.nodeType || 'unknown'})`);
    }

    /**
     * Remove a peer
     */
    removePeer(nodeId) {
        const peer = this.peers.get(nodeId);
        if (peer && peer.socket) {
            peer.socket.disconnect();
        }
        this.peers.delete(nodeId);
        this.peerHealth.delete(nodeId);
        this.emit('peer_disconnected', { nodeId });
        console.log(`✗ Peer removed: ${nodeId}`);
    }

    /**
     * Connect to a peer
     */
    connectToPeer(peerUrl, peerInfo = {}) {
        return new Promise((resolve, reject) => {
            try {
                const socket = io(peerUrl, {
                    reconnection: true,
                    reconnectionDelay: this.reconnectDelay,
                    reconnectionDelayMax: 30000,
                    reconnectionAttempts: this.maxRetries,
                    transports: ['websocket']
                });

                socket.on('connect', () => {
                    console.log(`Connected to peer at ${peerUrl}`);
                    
                    // Send node join message
                    socket.emit('message', {
                        type: MessageTypes.NODE_JOIN,
                        data: {
                            nodeId: this.nodeId,
                            nodeType: this.nodeType,
                            timestamp: Date.now()
                        }
                    });

                    const nodeId = peerInfo.nodeId || `peer_${peerUrl}`;
                    this.addPeer(nodeId, socket, peerInfo);
                    resolve(socket);
                });

                socket.on('message', (message) => {
                    this.handlePeerMessage(peerInfo.nodeId, message);
                });

                socket.on('disconnect', () => {
                    console.log(`Disconnected from peer at ${peerUrl}`);
                    const nodeId = peerInfo.nodeId || `peer_${peerUrl}`;
                    this.removePeer(nodeId);
                });

                socket.on('error', (error) => {
                    console.error(`Connection error to ${peerUrl}:`, error);
                    reject(error);
                });

                socket.on('connect_error', (error) => {
                    console.error(`Connection error to ${peerUrl}:`, error);
                    this.handleConnectionFailure(peerInfo.nodeId || `peer_${peerUrl}`, peerUrl);
                });
            } catch (error) {
                console.error(`Failed to create socket to ${peerUrl}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Handle connection failure with exponential backoff
     */
    handleConnectionFailure(nodeId, peerUrl) {
        const attempts = this.connectionAttempts.get(nodeId) || 0;
        
        if (attempts < this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
            console.log(`Retrying connection to ${nodeId} in ${delay}ms (attempt ${attempts + 1}/${this.maxRetries})`);
            
            setTimeout(() => {
                this.connectToPeer(peerUrl, { nodeId }).catch(err => {
                    this.connectionAttempts.set(nodeId, attempts + 1);
                });
            }, delay);
        } else {
            console.error(`Max connection attempts reached for ${nodeId}`);
            this.emit('peer_connection_failed', { nodeId, attempts });
        }
    }

    /**
     * Handle message from peer
     */
    handlePeerMessage(nodeId, message) {
        if (!message || !message.type) {
            console.warn('Invalid message received from peer');
            return;
        }

        // Update last heartbeat
        if (this.peerHealth.has(nodeId)) {
            this.peerHealth.get(nodeId).lastHeartbeat = Date.now();
        }

        // Update peer message count
        if (this.peers.has(nodeId)) {
            this.peers.get(nodeId).messageCount++;
        }

        this.emit('peer_message', { nodeId, message });
    }

    /**
     * Broadcast message to all peers
     */
    broadcastMessage(message, excludeNodeId = null) {
        let sentCount = 0;

        this.peers.forEach((peer, nodeId) => {
            if (excludeNodeId && nodeId === excludeNodeId) {
                return;
            }

            if (peer.socket && peer.socket.connected) {
                try {
                    peer.socket.emit('message', message);
                    sentCount++;
                } catch (error) {
                    console.error(`Error sending message to ${nodeId}:`, error);
                }
            }
        });

        return sentCount;
    }

    /**
     * Send message to specific peer
     */
    sendToPeer(nodeId, message) {
        const peer = this.peers.get(nodeId);
        
        if (!peer) {
            console.warn(`Peer ${nodeId} not found`);
            return false;
        }

        if (!peer.socket || !peer.socket.connected) {
            console.warn(`Peer ${nodeId} is not connected`);
            return false;
        }

        try {
            peer.socket.emit('message', message);
            return true;
        } catch (error) {
            console.error(`Error sending message to ${nodeId}:`, error);
            return false;
        }
    }

    /**
     * Get healthy peers
     */
    getHealthyPeers() {
        const healthy = [];
        this.peerHealth.forEach((health, nodeId) => {
            if (health.status === 'healthy' && this.peers.has(nodeId)) {
                healthy.push({
                    nodeId,
                    info: this.peers.get(nodeId).info,
                    health
                });
            }
        });
        return healthy;
    }

    /**
     * Get unhealthy peers
     */
    getUnhealthyPeers() {
        const unhealthy = [];
        this.peerHealth.forEach((health, nodeId) => {
            if (health.status === 'unhealthy') {
                unhealthy.push({
                    nodeId,
                    health
                });
            }
        });
        return unhealthy;
    }

    /**
     * Get all peers
     */
    getAllPeers() {
        const allPeers = [];
        this.peers.forEach((peer, nodeId) => {
            const health = this.peerHealth.get(nodeId) || {};
            allPeers.push({
                nodeId,
                info: peer.info,
                health,
                messageCount: peer.messageCount
            });
        });
        return allPeers;
    }

    /**
     * Start heartbeat monitoring
     */
    startHeartbeatMonitor() {
        this.heartbeatTimer = setInterval(() => {
            this.checkPeerHealth();
        }, this.heartbeatInterval);
    }

    /**
     * Check peer health via heartbeat
     */
    checkPeerHealth() {
        const now = Date.now();

        this.peers.forEach((peer, nodeId) => {
            if (!peer.socket || !peer.socket.connected) {
                this.markPeerUnhealthy(nodeId, 'disconnected');
                return;
            }

            const health = this.peerHealth.get(nodeId);
            const timeSinceLastHeartbeat = now - health.lastHeartbeat;

            if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
                // Send heartbeat request
                peer.socket.emit('message', {
                    type: MessageTypes.HEARTBEAT,
                    timestamp: now
                });

                // Check if response comes within timeout
                const responseTimeout = setTimeout(() => {
                    if (this.peers.has(nodeId)) {
                        const currentHealth = this.peerHealth.get(nodeId);
                        if (currentHealth.lastHeartbeat === health.lastHeartbeat) {
                            this.markPeerUnhealthy(nodeId, 'heartbeat_timeout');
                        }
                    }
                }, this.heartbeatTimeout);

                peer.heartbeatTimeoutId = responseTimeout;
            }
        });
    }

    /**
     * Mark peer as unhealthy
     */
    markPeerUnhealthy(nodeId, reason = 'unknown') {
        const health = this.peerHealth.get(nodeId);
        if (health) {
            health.status = 'unhealthy';
            health.unhealthyReason = reason;
            this.emit('peer_unhealthy', { nodeId, reason });
            console.warn(`⚠ Peer ${nodeId} marked unhealthy: ${reason}`);
        }
    }

    /**
     * Mark peer as healthy
     */
    markPeerHealthy(nodeId) {
        const health = this.peerHealth.get(nodeId);
        if (health) {
            health.status = 'healthy';
            this.emit('peer_healthy', { nodeId });
            console.log(`✓ Peer ${nodeId} marked healthy`);
        }
    }

    /**
     * Handle heartbeat response
     */
    handleHeartbeatResponse(nodeId) {
        const peer = this.peers.get(nodeId);
        if (peer && peer.heartbeatTimeoutId) {
            clearTimeout(peer.heartbeatTimeoutId);
            peer.heartbeatTimeoutId = null;
        }

        const health = this.peerHealth.get(nodeId);
        if (health && health.status === 'unhealthy') {
            this.markPeerHealthy(nodeId);
        }
    }

    /**
     * Request blockchain from peer
     */
    requestChainFromPeer(nodeId) {
        return this.sendToPeer(nodeId, {
            type: MessageTypes.CHAIN_REQUEST,
            timestamp: Date.now()
        });
    }

    /**
     * Send blockchain to peer
     */
    sendChainToPeer(nodeId, chain) {
        return this.sendToPeer(nodeId, {
            type: MessageTypes.CHAIN_RESPONSE,
            data: chain,
            timestamp: Date.now()
        });
    }

    /**
     * Broadcast new block
     */
    broadcastBlock(block) {
        return this.broadcastMessage({
            type: MessageTypes.BLOCK_BROADCAST,
            data: block,
            timestamp: Date.now()
        });
    }

    /**
     * Broadcast new vote
     */
    broadcastVote(vote) {
        return this.broadcastMessage({
            type: MessageTypes.VOTE_BROADCAST,
            data: vote,
            timestamp: Date.now()
        });
    }

    /**
     * Get peer statistics
     */
    getStats() {
        const peers = this.getAllPeers();
        const healthy = this.getHealthyPeers().length;
        const unhealthy = this.getUnhealthyPeers().length;

        return {
            totalPeers: this.peers.size,
            healthyPeers: healthy,
            unhealthyPeers: unhealthy,
            peers: peers,
            timestamp: Date.now()
        };
    }

    /**
     * Shutdown peer manager
     */
    shutdown() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.peers.forEach((peer) => {
            if (peer.socket) {
                peer.socket.disconnect();
            }
            if (peer.heartbeatTimeoutId) {
                clearTimeout(peer.heartbeatTimeoutId);
            }
        });

        this.peers.clear();
        this.peerHealth.clear();
        console.log('Peer manager shutdown complete');
    }
}

module.exports = { PeerManager, MessageTypes };
