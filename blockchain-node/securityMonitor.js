/**
 * Security Monitor Module
 * 
 * Detects malicious node behavior through behavioral analysis
 * Tracks suspicious patterns and quarantines bad actors
 * 
 * Features:
 * - Real-time behavior monitoring
 * - Anomaly detection
 * - Peer reputation tracking
 * - Automatic quarantine mechanism
 * - Evidence collection for forensics
 */

const EventEmitter = require('events');

class SecurityMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.nodeId = options.nodeId || 'UNKNOWN';
        this.maxViolations = options.maxViolations || 5;
        this.violationResetTime = options.violationResetTime || 3600000; // 1 hour
        this.reputationThreshold = options.reputationThreshold || -5;
        
        // Track peer behavior
        this.peerBehavior = new Map();
        
        // Quarantine list
        this.quarantinedPeers = new Set();
        
        // Violation history (for evidence)
        this.violationHistory = [];
        
        // Behavioral metrics
        this.behavioralMetrics = {
            invalidBlocks: 0,
            invalidVotes: 0,
            duplicateBlocks: 0,
            invalidSignatures: 0,
            networkAttacks: 0,
            eclipseAttempts: 0,
            sybilAttempts: 0,
            doubleSpendsDetected: 0
        };
        
        // Initialize monitoring
        this.startMonitoring();
    }
    
    /**
     * Initialize monitoring system
     */
    startMonitoring() {
        // Reset violations periodically
        this.violationResetInterval = setInterval(() => {
            this.resetViolations();
        }, this.violationResetTime);
    }
    
    /**
     * Track peer behavior
     */
    trackPeerBehavior(peerId, behavior, severity = 'low') {
        if (!this.peerBehavior.has(peerId)) {
            this.peerBehavior.set(peerId, {
                violations: 0,
                behaviors: [],
                reputation: 0,
                lastSeen: Date.now(),
                isQuarantined: false
            });
        }
        
        const peer = this.peerBehavior.get(peerId);
        
        // Record behavior
        peer.behaviors.push({
            type: behavior,
            severity: severity,
            timestamp: Date.now()
        });
        
        // Update violation count based on severity
        const violationWeight = {
            'critical': 3,
            'high': 2,
            'medium': 1,
            'low': 0.5
        };
        
        peer.violations += violationWeight[severity] || 1;
        peer.reputation -= violationWeight[severity] || 1;
        peer.lastSeen = Date.now();
        
        // Record evidence
        this.recordEvidence(peerId, behavior, severity);
        
        // Emit behavior detected event
        this.emit('behavior_detected', {
            peerId,
            behavior,
            severity,
            violations: peer.violations,
            reputation: peer.reputation
        });
        
        // Check if should quarantine
        if (peer.violations >= this.maxViolations) {
            this.quarantinePeer(peerId, behavior);
        }
        
        return peer;
    }
    
    /**
     * Record evidence for forensics
     */
    recordEvidence(peerId, behavior, severity) {
        const evidence = {
            timestamp: Date.now(),
            peerId,
            behavior,
            severity,
            nodeId: this.nodeId
        };
        
        this.violationHistory.push(evidence);
        
        // Emit evidence collected event
        this.emit('evidence_collected', evidence);
    }
    
    /**
     * Analyze block for anomalies
     */
    analyzeBlock(block, fromPeerId) {
        const anomalies = [];
        
        // Check block timestamp
        if (block.timestamp > Date.now() + 60000) {
            anomalies.push({
                type: 'FUTURE_TIMESTAMP',
                severity: 'high',
                message: 'Block has timestamp far in the future'
            });
            this.trackPeerBehavior(fromPeerId, 'FUTURE_TIMESTAMP', 'high');
        }
        
        // Check block size
        if (JSON.stringify(block).length > 1000000) {
            anomalies.push({
                type: 'OVERSIZED_BLOCK',
                severity: 'medium',
                message: 'Block exceeds size limit'
            });
            this.trackPeerBehavior(fromPeerId, 'OVERSIZED_BLOCK', 'medium');
        }
        
        // Check for duplicate transactions
        const transactionIds = new Set();
        if (block.data && Array.isArray(block.data)) {
            for (const tx of block.data) {
                const txId = JSON.stringify(tx);
                if (transactionIds.has(txId)) {
                    anomalies.push({
                        type: 'DUPLICATE_TRANSACTIONS',
                        severity: 'high',
                        message: 'Block contains duplicate transactions'
                    });
                    this.trackPeerBehavior(fromPeerId, 'DUPLICATE_TRANSACTIONS', 'high');
                    break;
                }
                transactionIds.add(txId);
            }
        }
        
        // Check hash consistency
        if (!block.hash || block.hash.length < 32) {
            anomalies.push({
                type: 'INVALID_HASH',
                severity: 'critical',
                message: 'Block has invalid hash'
            });
            this.trackPeerBehavior(fromPeerId, 'INVALID_HASH', 'critical');
            this.behavioralMetrics.invalidBlocks++;
        }
        
        // Check previous hash link
        if (!block.previousHash) {
            anomalies.push({
                type: 'INVALID_PREVIOUS_HASH',
                severity: 'critical',
                message: 'Block missing previous hash link'
            });
            this.trackPeerBehavior(fromPeerId, 'INVALID_PREVIOUS_HASH', 'critical');
        }
        
        return anomalies;
    }
    
    /**
     * Analyze vote for anomalies
     */
    analyzeVote(vote, fromPeerId) {
        const anomalies = [];
        
        // Check required fields
        if (!vote.voterId || !vote.candidate) {
            anomalies.push({
                type: 'INCOMPLETE_VOTE',
                severity: 'high',
                message: 'Vote missing required fields'
            });
            this.trackPeerBehavior(fromPeerId, 'INCOMPLETE_VOTE', 'high');
            this.behavioralMetrics.invalidVotes++;
        }
        
        // Check timestamp
        if (!vote.timestamp || vote.timestamp > Date.now() + 30000) {
            anomalies.push({
                type: 'INVALID_VOTE_TIMESTAMP',
                severity: 'medium',
                message: 'Vote has invalid or future timestamp'
            });
            this.trackPeerBehavior(fromPeerId, 'INVALID_VOTE_TIMESTAMP', 'medium');
        }
        
        // Check voter ID format
        if (typeof vote.voterId !== 'string' || vote.voterId.length === 0) {
            anomalies.push({
                type: 'INVALID_VOTER_ID',
                severity: 'medium',
                message: 'Invalid voter ID format'
            });
            this.trackPeerBehavior(fromPeerId, 'INVALID_VOTER_ID', 'medium');
        }
        
        return anomalies;
    }
    
    /**
     * Detect replay attacks
     */
    detectReplayAttack(message, fromPeerId) {
        const messageHash = require('crypto')
            .createHash('sha256')
            .update(JSON.stringify(message))
            .digest('hex');
        
        const peer = this.peerBehavior.get(fromPeerId);
        if (peer && peer.behaviors) {
            const recentMessages = peer.behaviors
                .filter(b => Date.now() - b.timestamp < 60000); // Last 60 seconds
            
            for (const behavior of recentMessages) {
                if (behavior.type === 'REPLAY_MESSAGE' && 
                    behavior.messageHash === messageHash) {
                    
                    this.trackPeerBehavior(fromPeerId, 'REPLAY_ATTACK_DETECTED', 'high');
                    this.emit('replay_attack_detected', {
                        peerId: fromPeerId,
                        messageHash,
                        timestamp: Date.now()
                    });
                    
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Detect Sybil attack patterns
     */
    detectSybilAttack(peerId, otherPeerIds) {
        // If one peer controls multiple IDs, it's a Sybil attack
        let suspiciousConnections = 0;
        
        for (const otherId of otherPeerIds) {
            const otherPeer = this.peerBehavior.get(otherId);
            
            // If other peer has similar violation patterns, might be Sybil
            const peer = this.peerBehavior.get(peerId);
            if (peer && otherPeer && 
                peer.violations > 0 && otherPeer.violations > 0 &&
                Math.abs(peer.violations - otherPeer.violations) < 1) {
                
                suspiciousConnections++;
            }
        }
        
        if (suspiciousConnections >= 3) {
            this.trackPeerBehavior(peerId, 'SYBIL_ATTACK_DETECTED', 'high');
            this.behavioralMetrics.sybilAttempts++;
            
            this.emit('sybil_attack_detected', {
                peerId,
                suspiciousCount: suspiciousConnections,
                timestamp: Date.now()
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Detect eclipse attack patterns
     */
    detectEclipseAttack(peerId, connectedPeers) {
        // If one peer tries to isolate us from others, it's an eclipse attack
        const isolationRisk = connectedPeers.length === 1 || 
                             (connectedPeers.length > 0 && 
                              connectedPeers.filter(p => p === peerId).length === connectedPeers.length);
        
        if (isolationRisk) {
            this.trackPeerBehavior(peerId, 'ECLIPSE_ATTACK_DETECTED', 'high');
            this.behavioralMetrics.eclipseAttempts++;
            
            this.emit('eclipse_attack_detected', {
                peerId,
                connectedPeerCount: connectedPeers.length,
                timestamp: Date.now()
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Quarantine malicious peer
     */
    quarantinePeer(peerId, reason) {
        if (this.quarantinedPeers.has(peerId)) {
            return; // Already quarantined
        }
        
        this.quarantinedPeers.add(peerId);
        
        const peer = this.peerBehavior.get(peerId);
        if (peer) {
            peer.isQuarantined = true;
        }
        
        this.emit('peer_quarantined', {
            peerId,
            reason,
            timestamp: Date.now(),
            violations: peer ? peer.violations : 0
        });
    }
    
    /**
     * Release peer from quarantine
     */
    releasePeerFromQuarantine(peerId) {
        if (!this.quarantinedPeers.has(peerId)) {
            return false;
        }
        
        this.quarantinedPeers.delete(peerId);
        
        const peer = this.peerBehavior.get(peerId);
        if (peer) {
            peer.isQuarantined = false;
            peer.violations = 0;
            peer.reputation = 0;
        }
        
        this.emit('peer_released', {
            peerId,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    /**
     * Get peer status
     */
    getPeerStatus(peerId) {
        const peer = this.peerBehavior.get(peerId);
        
        if (!peer) {
            return null;
        }
        
        return {
            peerId,
            violations: peer.violations,
            reputation: peer.reputation,
            isQuarantined: peer.isQuarantined,
            lastSeen: peer.lastSeen,
            behaviorCount: peer.behaviors.length,
            recentBehaviors: peer.behaviors.slice(-5)
        };
    }
    
    /**
     * Get all quarantined peers
     */
    getQuarantinedPeers() {
        return Array.from(this.quarantinedPeers);
    }
    
    /**
     * Check if peer is quarantined
     */
    isQuarantined(peerId) {
        return this.quarantinedPeers.has(peerId);
    }
    
    /**
     * Get violation history (evidence)
     */
    getViolationHistory(peerId = null) {
        if (peerId) {
            return this.violationHistory.filter(v => v.peerId === peerId);
        }
        return this.violationHistory;
    }
    
    /**
     * Get behavioral metrics
     */
    getBehavioralMetrics() {
        return {
            ...this.behavioralMetrics,
            timestamp: Date.now(),
            quarantinedPeerCount: this.quarantinedPeers.size,
            monitoredPeerCount: this.peerBehavior.size
        };
    }
    
    /**
     * Reset violations (periodic reset)
     */
    resetViolations() {
        for (const [peerId, peer] of this.peerBehavior) {
            // Reduce violations slowly (recovery mechanism)
            peer.violations = Math.max(0, peer.violations - 0.5);
            
            // Remove old behaviors (keep last 100)
            if (peer.behaviors.length > 100) {
                peer.behaviors = peer.behaviors.slice(-100);
            }
        }
        
        this.emit('violations_reset', {
            timestamp: Date.now(),
            peersMonitored: this.peerBehavior.size
        });
    }
    
    /**
     * Generate security report
     */
    generateSecurityReport() {
        const report = {
            timestamp: Date.now(),
            nodeId: this.nodeId,
            summary: {
                totalMonitoredPeers: this.peerBehavior.size,
                quarantinedPeers: this.quarantinedPeers.size,
                totalViolations: Array.from(this.peerBehavior.values())
                    .reduce((sum, peer) => sum + peer.violations, 0),
                totalEvidenceRecords: this.violationHistory.length
            },
            metrics: this.getBehavioralMetrics(),
            quarantinedList: Array.from(this.quarantinedPeers),
            topViolators: this.getTopViolators(5),
            recentIncidents: this.violationHistory.slice(-10)
        };
        
        return report;
    }
    
    /**
     * Get top violators
     */
    getTopViolators(limit = 5) {
        return Array.from(this.peerBehavior.entries())
            .map(([peerId, peer]) => ({
                peerId,
                violations: peer.violations,
                reputation: peer.reputation,
                isQuarantined: peer.isQuarantined,
                lastSeen: peer.lastSeen
            }))
            .sort((a, b) => b.violations - a.violations)
            .slice(0, limit);
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.violationResetInterval) {
            clearInterval(this.violationResetInterval);
        }
        this.removeAllListeners();
    }
}

module.exports = SecurityMonitor;
