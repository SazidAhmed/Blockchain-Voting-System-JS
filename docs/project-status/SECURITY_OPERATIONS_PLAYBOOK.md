# 🚨 Security Operations Playbook

**Version:** 1.0  
**Date:** November 16, 2025  
**Status:** Ready for Operations

---

## Quick Reference Card

### Most Common Operations

**Check System Health:**
```bash
docker-compose ps
./docker-health-check.sh
```

**View Real-Time Logs:**
```bash
./docker-logs.sh
docker-compose logs -f blockchain-node-1
```

**Handle Quarantine Alert:**
1. Check which node quarantined: `docker-compose logs security-monitor | grep "quarantine"`
2. Review violations: `curl http://localhost:3000/forensics/top-violators`
3. Verify isolation: `docker-compose ps` (look for isolation network)
4. Manual review before release

**Trigger Recovery:**
```bash
curl -X POST http://localhost:3000/recovery/initiate
docker-compose logs -f blockchain-node-1 | grep -i recovery
```

---

## Part 1: Daily Operations

### 1.1 Morning Startup Checklist (5 minutes)

**Step 1: System Health** (1 minute)
```bash
docker-compose ps
# Expected: All containers running
# All containers in "Up" state
```

**Step 2: Blockchain Network Status** (1 minute)
```bash
curl http://localhost:3000/status
# Expected output:
# {
#   "nodeStatus": "healthy",
#   "consensus": "active",
#   "peers": 4,
#   "blockHeight": <number>,
#   "electionActive": true
# }
```

**Step 3: Security Monitor Status** (1 minute)
```bash
curl http://localhost:3000/security/status
# Expected: All sensors operational
# No active quarantines
# Violation count low
```

**Step 4: Backup Verification** (1 minute)
```bash
ls -lah data/backups/
# Expected: Daily backup present
# Size: ~50-100MB
# Timestamp: Recent
```

**Step 5: Alert Review** (1 minute)
```bash
docker-compose logs --since 24h | grep -i "warning\|error\|critical"
# Expected: No critical errors
# Some warnings normal
```

**Action Items:**
- ✅ All systems green: Continue normal operations
- ⚠️ Some warnings: Investigate non-critical
- ❌ Critical errors: Follow Section 2 (Incident Response)

### 1.2 Hourly Monitoring (2 minutes)

**Every Hour, Run:**
```bash
# Quick health check
docker-compose exec blockchain-node-1 node -e "console.log('Node alive')"

# Check network sync
curl http://localhost:3000/blockchain/height

# Check for new quarantines
curl http://localhost:3000/security/quarantine-status
```

**Alert Triggers:**
- Node not responding: Follow Section 2.3
- Network out of sync: Follow Section 2.4
- New quarantine: Follow Section 2.5

### 1.3 Shift Handoff (5 minutes)

**Outgoing Operator Documents:**
1. System health status (green/yellow/red)
2. Active alerts (if any)
3. Recent incidents (if any)
4. Pending maintenance tasks
5. Last backup timestamp

**Template:**
```
SHIFT HANDOFF - [DATE] [TIME]
Operator: [Name]

SYSTEM STATUS: [GREEN/YELLOW/RED]
  - Node 1: [Status]
  - Node 2: [Status]
  - Node 3: [Status]
  - Node 4: [Status]
  - Node 5: [Status]

ACTIVE ALERTS: [None/List alerts]

RECENT INCIDENTS: [None/List]

PENDING TASKS: [List]

LAST BACKUP: [Timestamp]

NOTES: [Any additional info]
```

---

## Part 2: Incident Response

### 2.1 Incident Classification

**CRITICAL (Respond immediately)**
- All nodes down
- Consensus lost
- Network partitioned
- Double-voting detected
- Data corruption

**HIGH (Respond within 5 minutes)**
- Single node down
- Byzantine node detected
- Unusual violations
- Backup failed
- Network latency high

**MEDIUM (Respond within 30 minutes)**
- Minor violations
- Non-critical alerts
- Slow performance
- Low disk space

**LOW (Track and resolve)**
- Individual error messages
- Non-critical logs
- Performance degradation
- Information alerts

### 2.2 General Response Procedure

**Step 1: Alert Receipt** (Immediate)
```
Operator receives alert through:
- Console output
- Log files
- Health check
- Monitoring system
```

**Step 2: Classification** (1 minute)
```bash
# Determine severity
curl http://localhost:3000/security/recent-violations | head -20
docker-compose ps  # Check which containers are running
docker-compose logs --tail=50 | grep ERROR  # Look for errors
```

**Step 3: Initial Investigation** (2-5 minutes)
- Gather relevant logs
- Document issue details
- Determine if operator skill adequate
- Escalate if needed

**Step 4: Mitigation** (5-15 minutes)
- Apply appropriate fix
- Document all actions
- Monitor for resolution
- Verify system recovery

**Step 5: Root Cause Analysis** (Post-incident)
- Identify underlying cause
- Determine if preventable
- Update procedures
- Implement safeguards

### 2.3 Node Down - Response Guide

**Detection:**
```bash
docker-compose ps | grep -i down
# or
curl http://localhost:3000/status
# Error: Connection refused
```

**Immediate Response:**

**Step 1: Verify Node Status** (30 seconds)
```bash
# Check if container exists
docker ps | grep blockchain-node-X

# Check if it's truly down
docker-compose logs blockchain-node-X | tail -20
# Look for: "error", "crash", "terminated"
```

**Step 2: Attempt Restart** (1 minute)
```bash
# Try graceful restart
docker-compose restart blockchain-node-X

# Wait for startup
sleep 5

# Verify recovery
curl http://localhost:3000/status
```

**Step 3: If Restart Fails** (2 minutes)
```bash
# Check logs for errors
docker-compose logs blockchain-node-X | tail -50

# Check disk space
docker exec blockchain-node-X df -h

# Check memory
docker stats --no-stream
```

**Common Issues & Fixes:**

**Issue: Out of disk space**
```bash
# Clean old logs
docker exec blockchain-node-X rm -rf logs/*.old

# Restore from backup if needed
# See Section 3.2
```

**Issue: Database corruption**
```bash
# Reset database (WARNING: Loses state)
docker exec blockchain-node-X npm run migrate

# OR Restore from backup
./docker-restore.sh
```

**Issue: Network connection lost**
```bash
# Check network
docker network ls
docker network inspect voting_blockchain

# Reconnect if needed
docker network connect voting_blockchain blockchain-node-X
```

**Escalation if Not Resolved:**
- Node keeps crashing after restart
- Out of disk space cannot be cleaned
- Database corruption persists
- Network connectivity unreachable
→ Follow Section 3.3 (Disaster Recovery)

### 2.4 Consensus Lost - Response Guide

**Detection:**
```bash
# Check consensus status
curl http://localhost:3000/blockchain/consensus
# Expected: true
# If false: consensus lost

# Verify peers
curl http://localhost:3000/peers
# Expected: 4 peers (5 nodes total)
# If <3: likely network partition
```

**Diagnosis:**

**Check Network Connectivity:**
```bash
# Ping all nodes
for i in {1..5}; do
  echo "=== Node $i ==="
  curl http://localhost:300$i/status 2>/dev/null || echo "NOT RESPONDING"
done
```

**Check Blockchain Height:**
```bash
# Get heights of all nodes
for i in {1..5}; do
  height=$(curl -s http://localhost:300$i/blockchain/height | jq '.height')
  echo "Node $i: Block $height"
done
```

**Response - Case 1: Network Partition**
```
If some nodes have different heights and one group is offline:

1. Identify majority partition (3+ nodes)
2. Verify majority nodes have consensus
3. Wait for minority nodes to reconnect
4. Monitor chain synchronization
5. If one partition doesn't sync, restart those nodes
```

**Response - Case 2: All Nodes Diverged**
```
1. Stop all voting processes (prevent more divergence)
2. Check logs for consensus errors
3. Identify the node with most valid blocks
4. Reset other nodes from that node's blockchain
5. Restart consensus process
```

**Response - Case 3: Byzantine Nodes Detected**
```
1. Run Byzantine detection
2. Identify problematic node
3. Quarantine identified node (automatic)
4. Wait 30 seconds for consensus to recover
5. Verify consensus restored with 4 nodes
```

### 2.5 Quarantine Alert - Response Guide

**Detection:**
```bash
# Monitor shows quarantine
docker-compose logs security-monitor | grep -i quarantine

# Query quarantine status
curl http://localhost:3000/security/quarantine-status
```

**Understanding Quarantine:**
- Automatic trigger: Node violates rules ≥5 times
- Effect: Node isolated from network operations
- Result: 4-node network temporarily (still Byzantine tolerant)
- Duration: Until manual review and release

**Response Steps:**

**Step 1: Review Violations** (2 minutes)
```bash
# Get details on quarantined node
curl http://localhost:3000/forensics/peer-behavior
# Look for node with highest violation count

# Get violation history
curl http://localhost:3000/forensics/violation-history | jq '.[] | select(.peerId == "quarantined-node")'
```

**Step 2: Analyze Root Cause** (5 minutes)
```bash
# Get violation details
curl http://localhost:3000/security/violations | tail -20

# Check node logs
docker-compose logs blockchain-node-X | tail -100 | grep -i "invalid\|error\|failed"
```

**Likely Causes:**

**Cause 1: Node Software Bug**
- Symptom: Invalid blocks/votes repeatedly
- Action: Restart node and monitor
- If persists: Check for software updates

**Cause 2: Network Issue**
- Symptom: Replay attacks / duplicate detection
- Action: Check network connectivity
- If ok: Restart node

**Cause 3: Byzantine Behavior**
- Symptom: Multiple different violation types
- Action: Do NOT release - escalate
- Keep quarantined and investigate

**Step 3: Release Decision** (5 minutes)
```bash
# IF cause is identified and benign:

# Option 1: Release node
curl -X POST http://localhost:3000/security/release-quarantine -d '{"nodeId": "X"}'

# Option 2: Keep quarantined (if malicious)
# Continue monitoring

# Verify decision
curl http://localhost:3000/security/quarantine-status
```

**Step 4: Monitor Post-Release** (Continuous)
```bash
# Watch for new violations
while true; do
  curl http://localhost:3000/security/violations | tail -1
  sleep 10
done

# If violations resume: Re-quarantine
```

---

## Part 3: Recovery Procedures

### 3.1 Backup and Restore

**Backup Schedule:**
- Automatic: Every 6 hours
- Manual: On demand before changes
- Retention: 30 days rolling
- Location: `data/backups/`

**Manual Backup:**
```bash
# Create backup
./docker-backup.sh

# Verify backup
ls -lah data/backups/
tail -20 data/backups/latest-backup.log
```

**Restore from Backup:**
```bash
# List available backups
ls -la data/backups/*.tar.gz

# Restore latest
./docker-restore.sh

# Restore specific backup
./docker-restore.sh data/backups/backup-2025-11-16-12-00.tar.gz
```

**Restore Process:**
1. Stop current blockchain nodes
2. Extract backup files
3. Restore database
4. Restart nodes
5. Verify consensus
6. Verify vote integrity

**Estimated Time:** 5-10 minutes

### 3.2 Single Node Recovery

**Scenario:** One node crashed, needs recovery

**Option 1: Restart and Sync** (Preferred, <2 minutes)
```bash
# Restart node
docker-compose restart blockchain-node-X

# Wait for sync (5-30 seconds)
sleep 10

# Verify consensus restored
curl http://localhost:3000/status
```

**Option 2: Reset and Sync** (If restart fails)
```bash
# Reset node database
docker-compose exec blockchain-node-X npm run migrate

# Restart
docker-compose restart blockchain-node-X

# Monitor sync progress
docker-compose logs -f blockchain-node-X | grep -i "sync\|height"
```

**Option 3: Restore from Backup** (If still fails)
```bash
# Stop node
docker-compose stop blockchain-node-X

# Restore backup
./docker-restore.sh

# Restart all nodes
docker-compose restart

# Verify
curl http://localhost:3000/status
```

### 3.3 Disaster Recovery - Complete System

**Scenario:** Multiple nodes down or corrupted, need full recovery

**Recovery Steps:**

**Step 1: Stop All Services** (1 minute)
```bash
docker-compose down
```

**Step 2: Verify Backup Integrity** (2 minutes)
```bash
# Check backup exists and is valid
ls -la data/backups/latest.tar.gz

# Test extract (don't apply)
tar -tzf data/backups/latest.tar.gz | head -20

# Check for corruption
md5sum data/backups/latest.tar.gz > /tmp/backup.md5
```

**Step 3: Restore Data** (3 minutes)
```bash
# Backup current (corrupted) state
mv data data.backup.corrupted

# Extract backup
tar -xzf data/backups/latest.tar.gz

# Verify restored data
ls -la data/
du -sh data/
```

**Step 4: Start System** (2 minutes)
```bash
# Start fresh containers
docker-compose up -d

# Wait for startup
sleep 10

# Verify health
docker-compose ps
curl http://localhost:3000/status
```

**Step 5: Verify Data Integrity** (3 minutes)
```bash
# Check blockchain
curl http://localhost:3000/blockchain/height
curl http://localhost:3000/blockchain/latest-block | jq

# Check votes
curl http://localhost:3000/elections/latest | jq

# Check consensus
curl http://localhost:3000/blockchain/consensus
```

**Step 6: Resume Operations** (Immediate)
```bash
# Elections resume automatically
# Monitor for issues
./docker-health-check.sh

# Notify stakeholders
echo "System recovered at $(date)" | tee recovery.log
```

**Total Recovery Time:** 15-20 minutes

---

## Part 4: Performance & Monitoring

### 4.1 Key Performance Indicators

**System Health Score:**
```bash
# Calculate current health
curl http://localhost:3000/status | jq '{
  nodeHealth: .nodeStatus,
  consensus: .consensus,
  peers: .peers,
  blockHeight: .blockHeight,
  byzantineTolerance: "1 max faulty"
}'
```

**Expected Metrics:**
| Metric | Expected | Alert Threshold |
|--------|----------|-----------------|
| Consensus | Active | Inactive |
| Peers | 4 | <3 |
| Block latency | <5s | >10s |
| Vote latency | <1s | >5s |
| Byzantine nodes | 0 | >1 |
| Violations/hour | <10 | >20 |

### 4.2 Performance Tuning

**Node Performance - Check Resource Usage:**
```bash
docker stats --no-stream | grep blockchain-node
```

**If CPU High (>80%):**
- Check for consensus loops
- Verify no duplicate processing
- Look for Byzantine behavior

**If Memory High (>500MB):**
- Check log file sizes
- Verify backup wasn't interrupted
- Check database growth

**If Network Latency High (>1000ms):**
- Check network connectivity
- Verify no packet loss
- Check for DDoS patterns

### 4.3 Monitoring Dashboard

**Create Simple Dashboard:**
```bash
#!/bin/bash
while true; do
  clear
  echo "=== Blockchain Voting System - Real-Time Status ==="
  echo "Time: $(date)"
  echo ""
  
  echo "=== Node Status ==="
  docker-compose ps | tail -5
  
  echo ""
  echo "=== Blockchain Status ==="
  curl -s http://localhost:3000/status | jq '.nodeStatus, .consensus, .blockHeight'
  
  echo ""
  echo "=== Security Status ==="
  curl -s http://localhost:3000/security/status | jq '.violations, .quarantined'
  
  echo ""
  echo "=== Resource Usage ==="
  docker stats --no-stream | awk 'NR==1 || /blockchain-node/{printf "%s  CPU: %s  MEM: %s\n", $1, $3, $4}'
  
  sleep 5
done
```

---

## Part 5: Troubleshooting Guide

### 5.1 Common Issues

**Issue: "Connection Refused" when accessing http://localhost:3000**
```
Cause: API service not responding
Fix:
  1. Check if container running: docker-compose ps
  2. Check logs: docker-compose logs blockchain-node-1 | tail -50
  3. Restart: docker-compose restart blockchain-node-1
  4. If persistent: Check port: netstat -tlnp | grep 3000
```

**Issue: "Consensus not achieved"**
```
Cause: Byzantine node or network partition
Fix:
  1. Check all nodes: docker-compose ps
  2. Verify network: curl http://localhost:300X/status (for each X)
  3. Check for quarantined: curl http://localhost:3000/security/quarantine-status
  4. If partition: Check logs for Byzantine behavior
  5. Solution: Restart Byzantine node or wait for healing
```

**Issue: "Block height not increasing"**
```
Cause: Consensus stalled or votes not processing
Fix:
  1. Check consensus: curl http://localhost:3000/blockchain/consensus
  2. Submit test vote: curl -X POST http://localhost:3000/vote -d '{...}'
  3. Wait 5 seconds
  4. Check height: curl http://localhost:3000/blockchain/height
  5. If still stuck: Check for Byzantine nodes (see above)
```

**Issue: "Disk space full"**
```
Cause: Large log files or corrupted backup
Fix:
  1. Check usage: docker exec blockchain-node-X df -h
  2. Clean logs: docker exec blockchain-node-X rm logs/*.old
  3. Clean containers: docker system prune
  4. Archive backups: tar -czf backups.archive.tar.gz data/backups/
  5. Delete old backups: rm data/backups/*.gz (keep latest 3)
```

### 5.2 Advanced Troubleshooting

**Enable Debug Logging:**
```bash
# In docker-compose.yml, add:
environment:
  - DEBUG=* 

# Restart
docker-compose up -d
```

**Inspect Node State:**
```bash
# Connect to running node
docker-compose exec blockchain-node-1 /bin/bash

# Inside container:
node -e "console.log(process.env)"
sqlite3 data/voting.db ".tables"
```

**Network Diagnosis:**
```bash
# Test connectivity between nodes
docker-compose exec blockchain-node-1 ping blockchain-node-2
docker-compose exec blockchain-node-1 curl http://blockchain-node-2:3000/status
```

---

## Part 6: Maintenance Procedures

### 6.1 Regular Maintenance

**Weekly (Every Monday 2 AM):**
```bash
# 1. Verify backups (5 min)
ls -lah data/backups/ | tail -10
du -sh data/backups/

# 2. Clean old logs (5 min)
find logs -name "*.log" -mtime +7 -delete

# 3. Review violations (5 min)
curl http://localhost:3000/forensics/top-violators

# 4. Run health check (5 min)
./docker-health-check.sh
```

**Monthly (1st of month 3 AM):**
```bash
# 1. Full system audit (30 min)
# Verify all procedures work
# Run disaster recovery drill

# 2. Update software (if updates available)
docker pull blockchain-voting:latest
docker-compose up -d

# 3. Backup verification
# Restore test backup to verify integrity

# 4. Documentation review
# Update procedures if needed
```

### 6.2 Security Updates

**When Security Update Available:**
```
1. Read release notes carefully
2. Schedule maintenance window
3. Backup current system
4. Update containers
5. Run health check
6. Verify no regressions
7. Update documentation
```

### 6.3 Capacity Planning

**Monitor Growth Metrics:**
```bash
# Database size
du -sh data/voting.db

# Log growth
du -sh logs/

# Backup size
du -sh data/backups/

# Trend analysis (weekly)
date >> capacity.log
du -sh data >> capacity.log
```

**When to Scale:**
- Database > 1GB: Archive old elections
- Logs > 500MB: Implement log rotation
- Backups > 10GB: Implement older backup cleanup

---

## Part 7: Emergency Contacts & Escalation

### 7.1 Escalation Procedure

**Level 1: Operator (You)**
- Handle routine operations
- Follow incident response guide
- Resolve common issues
- Document all actions

**Level 2: Senior Operator** (Escalate if)
- Issue not resolved in 15 minutes
- Requires data analysis
- Requires database manipulation

**Level 3: Engineering** (Escalate if)
- Bug suspected
- Code needs modification
- Unplanned behavior observed

**Level 4: Executive** (Escalate if)
- System down >30 minutes
- Data corruption suspected
- Election affected

### 7.2 Communication Template

When escalating:
```
ESCALATION REPORT - [TIMESTAMP]

ISSUE SUMMARY: [1 sentence description]

SEVERITY: [CRITICAL/HIGH/MEDIUM/LOW]

TIME TO ESCALATION: [X minutes]

ACTIONS TAKEN:
  - [Action 1]
  - [Action 2]
  - [Action 3]

CURRENT STATUS: [Description]

REQUIRED LEVEL: [1/2/3/4]

EVIDENCE:
  - Log snippet
  - Error message
  - Timestamp

NEXT STEPS: [What's needed]
```

---

## Part 8: Quick Reference Cards

### Card 1: Startup Checklist
```
☐ docker-compose ps (verify all up)
☐ curl http://localhost:3000/status (check health)
☐ curl http://localhost:3000/blockchain/consensus (verify consensus)
☐ ls data/backups/ (verify backup created)
☐ Review overnight logs
```

### Card 2: Incident Response
```
1. IDENTIFY: What is the problem?
2. CLASSIFY: How serious is it?
3. INVESTIGATE: What caused it?
4. MITIGATE: What's the immediate fix?
5. RESOLVE: Apply the fix
6. VERIFY: Is it working?
7. DOCUMENT: Record what happened
```

### Card 3: Node Down Response
```
docker-compose ps                    # Check status
docker-compose restart blockchain-node-X  # Restart
sleep 5
curl http://localhost:3000/status    # Verify
```

### Card 4: Quarantine Response
```
curl http://localhost:3000/forensics/peer-behavior  # Get details
# Analyze violations
curl http://localhost:3000/security/violations      # Review
# Decide if release or keep isolated
curl -X POST http://localhost:3000/security/release-quarantine -d '{"nodeId":"X"}'
```

### Card 5: Full Restore
```
docker-compose down
./docker-restore.sh
docker-compose up -d
sleep 10
curl http://localhost:3000/status
```

---

**END OF SECURITY OPERATIONS PLAYBOOK**

---

**Approval:** APPROVED FOR OPERATIONS  
**Effective Date:** November 16, 2025  
**Review Date:** November 23, 2025

