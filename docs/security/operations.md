# Security Operations Playbook

## Incident Response

### Classification

| Severity | Response Time | Examples                                                              |
| -------- | ------------- | --------------------------------------------------------------------- |
| CRITICAL | Immediate     | All nodes down, consensus lost, double-vote detected, data corruption |
| HIGH     | 5 minutes     | Single node down, Byzantine node, backup failure, unusual violations  |
| MEDIUM   | 30 minutes    | Minor violations, slow performance, low disk space                    |
| LOW      | Track         | Info-level errors, performance degradation                            |

### Response Procedure

1. **Alert Receipt**: Console, log files, health check, or monitoring system.
2. **Classification**: Check severity via `/security/recent-violations`, `docker compose ps`.
3. **Investigation**: Gather logs, document details, escalate if needed.
4. **Mitigation**: Apply fix, document actions, monitor resolution.
5. **Root Cause Analysis**: Identify underlying cause, update procedures.

### Node Down

```bash
docker compose ps | grep -i down
docker compose restart blockchain-node-X
sleep 5
curl http://localhost:3000/status
```

If restart fails: check logs (`docker compose logs blockchain-node-X --tail=50`), check disk/memory, restore from backup.

### Consensus Lost

```bash
for i in {1..5}; do
  height=$(curl -s http://localhost:300$i/blockchain/height | jq '.height')
  echo "Node $i: Block $height"
done
```

- Network partition: identify majority partition (3+ nodes), wait for minority reconnection.
- All diverged: stop voting, identify node with most valid blocks, reset others from it.
- Byzantine: quarantine detected node, wait for consensus recovery with 4 nodes.

### Quarantine Alert

```bash
curl http://localhost:3000/security/quarantine-status
curl http://localhost:3000/forensics/violation-history | jq '.[] | select(.peerId == "quarantined-node")'
```

Review violations, analyze root cause (software bug, network issue, Byzantine behavior). Release only if benign:

```bash
curl -X POST http://localhost:3000/security/release-quarantine -d '{"nodeId":"X"}'
```

### Disaster Recovery

```bash
docker compose down
tar -xzf data/backups/latest.tar.gz
docker compose up -d
curl http://localhost:3000/status
```

Estimated RTO: 15-20 minutes.

## Key Rotation

### JWT Secret

Generate new secret and update `.env`:

```bash
openssl rand -hex 64
```

Update `JWT_SECRET` in `.env` at project root, restart backend. Existing tokens invalidated.

### Voter Signing Keys

Keys generated client-side via Web Crypto API per session. No server-side key storage. Rotation handled by browser on re-authentication.

### Database Credentials

Update `DB_USER`/`DB_PASSWORD` in `.env`, update MySQL user, restart backend.

## Rate Limiting Configuration

| Endpoint        | Limit        | Window     |
| --------------- | ------------ | ---------- |
| Registration    | 5 requests   | 15 minutes |
| Login           | 10 requests  | 15 minutes |
| Vote submission | 10 requests  | 1 hour     |
| General API     | 100 requests | 15 minutes |

Rate limiter uses in-memory store. For production, configure Redis backend.

```javascript
// Configure in services/backend/index.js
rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests" },
});
```

## Monitoring Alerts

### Health Checks

Run `bash infra/scripts/docker-health-check.sh` or query manually:

```bash
curl http://localhost:3000/status
# Expected: { nodeStatus: "healthy", consensus: "active", peers: 4 }
```

### Alert Conditions

| Condition            | Action                                     |
| -------------------- | ------------------------------------------ |
| Node not responding  | Follow node down procedure                 |
| Peers < 3            | Check network, check for quarantine        |
| Violations/hour > 20 | Investigate source, review security logs   |
| Block latency > 10s  | Check consensus, check for Byzantine node  |
| Vote latency > 5s    | Check network, database load               |
| Disk space > 80%     | Clean logs, archive backups                |
| Quarantine active    | Review violations, decide release/escalate |

### Log Analysis

```bash
# Security events
docker compose logs --since 24h | grep -i "warning\|error\|critical"

# Quarantine events
docker compose logs security-monitor | grep -i quarantine

# Audit integrity failures
curl http://localhost:3000/api/admin/audit-logs?filter=failed
curl http://localhost:3000/api/admin/verify-audit-integrity/:logId
```

## Daily Operations

### Morning Checklist

1. `docker compose ps` — all containers up
2. `curl http://localhost:3000/status` — node healthy, consensus active
3. `curl http://localhost:3000/security/status` — no active quarantines
4. `ls -lah data/backups/` — daily backup present
5. Review overnight logs for warnings/errors

### Weekly Maintenance

- Review `admin_audit_logs` for unauthorized attempts
- Check `admin_security_logs` for HIGH/CRITICAL events
- Verify audit hash integrity
- Run full health check
- Clean logs older than 7 days

### Monthly Maintenance

- Full disaster recovery drill
- Software updates (if available)
- Backup integrity verification
- Capacity planning review (DB size, log growth, backup size)

## Backup and Restore

### Schedule

- Automatic: every 6 hours
- Manual: on demand before changes
- Retention: 30 days rolling
- Location: `data/backups/`

### Commands

```bash
# Manual backup
./docker-backup.sh

# Restore
./docker-restore.sh
# or specify backup:
./docker-restore.sh data/backups/backup-YYYY-MM-DD-HH-MM.tar.gz
```

### Recovery Time

| Scenario                        | Estimated Time |
| ------------------------------- | -------------- |
| Single node restart + sync      | <2 minutes     |
| Single node restore from backup | 5-10 minutes   |
| Full system disaster recovery   | 15-20 minutes  |

## Credential Management

- Secrets stored in `.env` files (gitignored).
- `JWT_SECRET`, `DB_PASSWORD`, encryption keys never committed.
- Production secrets managed via Docker secrets or environment variables.
- Default credentials in `.env.example` for local dev only — rotate for production.

## Escalation

| Level | Role            | Escalate When                                           |
| ----- | --------------- | ------------------------------------------------------- |
| 1     | Operator        | Routine ops, resolve common issues                      |
| 2     | Senior Operator | Issue not resolved in 15 min, needs data analysis       |
| 3     | Engineering     | Bug suspected, code modification needed                 |
| 4     | Executive       | System down >30 min, data corruption, election affected |
