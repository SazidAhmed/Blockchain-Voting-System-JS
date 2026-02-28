# SecurityMonitor Integration Guide

**Purpose:** Instructions for integrating the SecurityMonitor module into the blockchain node application  
**Target:** `blockchain-node/index.js`  
**Status:** Ready for integration

---

## 📋 Integration Overview

The SecurityMonitor module provides real-time malicious behavior detection, quarantine management, and forensic evidence collection. This guide shows how to integrate it into the main blockchain node application.

---

## 🔧 Integration Steps

### Step 1: Import the Module

Add to the top of `blockchain-node/index.js`:

```javascript
const SecurityMonitor = require('./securityMonitor');
```

### Step 2: Initialize Security Monitor

Add after creating the Express app (around the initialization section):

```javascript
// Initialize security monitoring
const securityMonitor = new SecurityMonitor();

// Optional: Configure monitoring
securityMonitor.setMaxViolations(5);
securityMonitor.setViolationResetInterval(3600000); // 1 hour
```

### Step 3: Hook into Message Events

Add listeners for peer messages and blockchain events:

```javascript
// Monitor incoming messages from peers
peerManager.on('message', (peerId, message) => {
  const severity = calculateSeverity(message);
  if (severity > 0) {
    securityMonitor.trackPeerBehavior(peerId, message.type, severity);
  }
});

// Monitor block reception
blockManager.on('block', (block) => {
  const anomalies = securityMonitor.analyzeBlock(block);
  if (anomalies.length > 0) {
    console.warn(`[SECURITY] Block anomalies detected:`, anomalies);
  }
});

// Monitor vote reception
voteManager.on('vote', (vote) => {
  const anomalies = securityMonitor.analyzeVote(vote);
  if (anomalies.length > 0) {
    console.warn(`[SECURITY] Vote anomalies detected:`, anomalies);
  }
});

// Monitor quarantine events
securityMonitor.on('peerQuarantined', (peerId, reason) => {
  console.log(`[SECURITY] Peer quarantined: ${peerId} - ${reason}`);
  peerManager.disconnectPeer(peerId);
});

securityMonitor.on('peerReleased', (peerId) => {
  console.log(`[SECURITY] Peer released from quarantine: ${peerId}`);
});
```

### Step 4: Add Security Endpoints

Add these Express routes to your node application:

```javascript
// Security status endpoint
app.get('/security/status', (req, res) => {
  res.json({
    monitoring: true,
    totalPeers: peerManager.getAllPeers().length,
    quarantinedPeers: securityMonitor.getQuarantinedPeers().length,
    totalViolations: securityMonitor.getTotalViolations(),
    timestamp: new Date().toISOString()
  });
});

// Security report endpoint
app.get('/security/report', (req, res) => {
  res.json(securityMonitor.generateSecurityReport());
});

// Quarantine status endpoint
app.get('/security/quarantine', (req, res) => {
  res.json({
    quarantined: Array.from(securityMonitor.getQuarantinedPeers()),
    count: securityMonitor.getQuarantinedPeers().size,
    timestamp: new Date().toISOString()
  });
});

// Behavioral metrics endpoint
app.get('/security/metrics', (req, res) => {
  const peers = peerManager.getAllPeers();
  const metrics = {};
  peers.forEach(peer => {
    metrics[peer] = securityMonitor.getBehavioralMetrics(peer);
  });
  res.json(metrics);
});

// Violation history endpoint
app.get('/security/violations', (req, res) => {
  res.json(securityMonitor.getViolationHistory());
});

// Peer-specific violations
app.get('/security/violations/:peerId', (req, res) => {
  res.json(securityMonitor.getViolationHistory(req.params.peerId));
});

// Top violators endpoint
app.get('/security/violators', (req, res) => {
  const report = securityMonitor.generateSecurityReport();
  res.json(report.topViolators);
});

// Peer status endpoint
app.get('/security/peer/:peerId', (req, res) => {
  res.json({
    peerId: req.params.peerId,
    quarantined: securityMonitor.isQuarantined(req.params.peerId),
    violations: securityMonitor.getViolationCount(req.params.peerId),
    history: securityMonitor.getViolationHistory(req.params.peerId),
    metrics: securityMonitor.getBehavioralMetrics(req.params.peerId)
  });
});

// Quarantine peer endpoint
app.post('/security/quarantine', (req, res) => {
  const { peerId } = req.body;
  securityMonitor.quarantinePeer(peerId, 'Manual quarantine');
  peerManager.disconnectPeer(peerId);
  res.json({ success: true, message: `Peer ${peerId} quarantined` });
});

// Release from quarantine endpoint
app.post('/security/release', (req, res) => {
  const { peerId } = req.body;
  securityMonitor.releasePeerFromQuarantine(peerId);
  res.json({ success: true, message: `Peer ${peerId} released` });
});

// Evidence export endpoint
app.get('/security/export', (req, res) => {
  const report = securityMonitor.generateSecurityReport();
  res.json({
    exportedAt: new Date().toISOString(),
    report: report,
    evidenceCount: securityMonitor.getViolationHistory().length
  });
});
```

### Step 5: Integrate Block Validation

Modify block validation to check for anomalies:

```javascript
function validateBlock(block) {
  // Existing validation...
  
  // Check for anomalies
  const anomalies = securityMonitor.analyzeBlock(block);
  if (anomalies.length > 0) {
    console.warn('[SECURITY] Block failed anomaly check:', anomalies);
    
    // Track behavior
    if (block.minerPeerId) {
      securityMonitor.trackPeerBehavior(
        block.minerPeerId, 
        'INVALID_BLOCK', 
        'High'
      );
    }
    
    return false;
  }
  
  return true;
}
```

### Step 6: Integrate Vote Validation

Modify vote validation to check for anomalies:

```javascript
function validateVote(vote) {
  // Existing validation...
  
  // Check for anomalies
  const anomalies = securityMonitor.analyzeVote(vote);
  if (anomalies.length > 0) {
    console.warn('[SECURITY] Vote failed anomaly check:', anomalies);
    
    // Track behavior
    if (vote.voterPeerId) {
      securityMonitor.trackPeerBehavior(
        vote.voterPeerId, 
        'INVALID_VOTE', 
        'High'
      );
    }
    
    return false;
  }
  
  return true;
}
```

---

## 🔍 Integration Example

Here's a complete example of integrating SecurityMonitor:

```javascript
const SecurityMonitor = require('./securityMonitor');
const securityMonitor = new SecurityMonitor();

// Initialize with custom settings
securityMonitor.setMaxViolations(5);

// Listen for quarantine events
securityMonitor.on('peerQuarantined', (peerId, reason) => {
  console.log(`[SECURITY] Quarantine: ${peerId} - ${reason}`);
  // Disconnect the peer
  peerManager.disconnectPeer(peerId);
  // Notify other nodes
  broadcastSecurityAlert('QUARANTINE', peerId);
});

// Listen for suspicious behavior
securityMonitor.on('suspiciousBehavior', (peerId, behavior) => {
  console.log(`[SECURITY] Suspicious: ${peerId} - ${behavior}`);
});

// Hook into message processing
peerManager.on('message', (peerId, message) => {
  // Analyze the message
  securityMonitor.trackPeerBehavior(peerId, message.type, 'Low');
  
  // Continue processing if peer not quarantined
  if (!securityMonitor.isQuarantined(peerId)) {
    processMessage(message);
  }
});

// Hook into block validation
function processBlock(block) {
  const anomalies = securityMonitor.analyzeBlock(block);
  if (anomalies.length > 0) {
    console.warn('[SECURITY] Block anomalies:', anomalies);
    return false;
  }
  // Continue with block processing
  return addBlockToChain(block);
}

// Add security endpoints
app.get('/security/status', (req, res) => {
  res.json(securityMonitor.generateSecurityReport());
});
```

---

## 🧪 Testing Integration

### Test Security Endpoints

```bash
# Check security status
curl http://localhost:3001/security/status | jq

# Get security report
curl http://localhost:3001/security/report | jq

# Check quarantine status
curl http://localhost:3001/security/quarantine | jq

# Get metrics
curl http://localhost:3001/security/metrics | jq

# Quarantine a peer
curl -X POST http://localhost:3001/security/quarantine \
  -H "Content-Type: application/json" \
  -d '{"peerId":"peer1"}'

# Release from quarantine
curl -X POST http://localhost:3001/security/release \
  -H "Content-Type: application/json" \
  -d '{"peerId":"peer1"}'
```

### Test Detection

```javascript
// Test block anomaly detection
const anomalousBlock = {
  timestamp: Date.now() + 1000000, // Future timestamp
  hash: 'invalid',
  data: { /* large data */ },
  previousHash: 'abc123'
};

const anomalies = securityMonitor.analyzeBlock(anomalousBlock);
console.log('Detected anomalies:', anomalies);
// Output: ['Future timestamp', 'Invalid hash format']
```

---

## 📊 Configuration Options

### SecurityMonitor Configuration

```javascript
// Create instance
const monitor = new SecurityMonitor();

// Set violation threshold (default: 5)
monitor.setMaxViolations(5);

// Set violation reset interval (default: 1 hour)
monitor.setViolationResetInterval(3600000);

// Set quarantine duration (optional)
monitor.setQuarantineDuration(900000); // 15 minutes

// Enable/disable specific detections
monitor.enableDetection('replay', true);
monitor.enableDetection('sybil', true);
monitor.enableDetection('eclipse', true);
```

---

## 🔍 Monitoring & Debugging

### View Security Logs

```bash
# Docker logs for security events
docker logs voting-node1 | grep SECURITY

# Monitor security status in real-time
while true; do
  curl -s http://localhost:3001/security/status | jq .
  sleep 5
done
```

### Export Evidence

```bash
# Export security report
curl http://localhost:3001/security/export > security_report.json

# View specific peer violations
curl http://localhost:3001/security/violations/peer1 | jq
```

---

## ⚠️ Important Notes

### Thread Safety
- SecurityMonitor uses non-blocking operations
- Safe for concurrent access
- Event-driven architecture

### Performance
- Detection latency: <50ms per message
- Minimal memory overhead
- Scales to larger networks

### Persistence
- Quarantine status maintained in memory
- Consider adding database persistence for production
- Evidence collection stored in memory arrays

### Recovery
- Quarantined peers can be released via API
- Violation counters reset hourly
- Safe recovery mechanism implemented

---

## 📚 API Reference

### Key Methods

```javascript
// Detection
analyzeBlock(block) → anomalies[]
analyzeVote(vote) → anomalies[]
detectReplayAttack(message) → boolean
detectSybilAttack(peerId) → boolean
detectEclipseAttack(peerId) → boolean

// Behavior Tracking
trackPeerBehavior(peerId, behavior, severity)
getViolationCount(peerId) → number
getBehavioralMetrics(peerId) → object

// Quarantine Management
quarantinePeer(peerId, reason)
releasePeerFromQuarantine(peerId)
isQuarantined(peerId) → boolean
getQuarantinedPeers() → Set

// Evidence & Reporting
getViolationHistory(peerId?) → array
generateSecurityReport() → object
getTotalViolations() → number
```

---

## 🚀 Next Steps

After integration:

1. **Run tests:** `bash test-phase4-all.sh`
2. **Verify endpoints:** Check all security endpoints respond
3. **Monitor:** Watch security logs for events
4. **Validate:** Test with Phase 3 attack scenarios
5. **Tune:** Adjust thresholds as needed

---

## 📞 Support

- See `Project_Status/PHASE_4_COMPLETE.md` for full documentation
- See `PHASE4_QUICKSTART.md` for quick reference
- Tests provide integration examples in `test-phase4-*.sh` files

---

**Integration Guide Ready for Implementation**  
**Date:** November 16, 2025
