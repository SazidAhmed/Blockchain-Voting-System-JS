# Database Quick Reference

## Common Queries

### List active elections

```sql
SELECT id, title, status, start_date, end_date
FROM elections
WHERE status IN ('pending', 'active')
ORDER BY start_date;
```

### Get vote count by election

```sql
SELECT
    e.title,
    COUNT(vr.id) AS registered,
    SUM(CASE WHEN vr.status = 'voted' THEN 1 ELSE 0 END) AS voted
FROM elections e
LEFT JOIN voter_registrations vr ON e.id = vr.election_id
GROUP BY e.id, e.title;
```

### Check if user exists

```sql
SELECT id, institution_id, username, role, registration_status
FROM users
WHERE email = ? OR institution_id = ?;
```

### Verify nullifier not used (double-vote check)

```sql
SELECT id FROM votes_meta WHERE nullifier_hash = ?;
```

### Recent audit events

```sql
SELECT event_type, event_category, user_id, timestamp, severity
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 20;
```

### Check node health

```sql
SELECT node_id, status, node_type, last_seen, health_status
FROM v_node_health
ORDER BY health_status;
```

### Detect potential double-vote attempts

```sql
SELECT nullifier_hash, COUNT(*) AS attempts
FROM audit_logs
WHERE event_type = 'VOTE_ATTEMPT_FAILED'
  AND details->>'$.reason' = 'nullifier_already_used'
GROUP BY nullifier_hash
HAVING attempts > 1;
```

### Check vote receipts for an election

```sql
SELECT vr.nullifier_hash, vr.transaction_hash, vr.block_height, vr.issued_at
FROM vote_receipts vr
WHERE vr.election_id = ?
ORDER BY vr.issued_at;
```

### Table sizes

```sql
SELECT
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'voting_db'
ORDER BY (data_length + index_length) DESC;
```

## Active Connections

```sql
SHOW PROCESSLIST;
```

## ERD Notes

- **users** → **voter_registrations** (1-to-many) — one user can register for many elections
- **elections** → **candidates** (1-to-many) — cascade delete
- **elections** → **votes_meta** (1-to-many) — restrict delete (preserve vote records)
- **votes_meta** → **tally_partial_decryptions** (1-to-many) — cascade delete
- **audit_logs** — self-referencing hash chain via `previous_hash`
- **voter_registrations** — unique constraint on `(user_id, election_id)` prevents duplicate registration

## Index Strategy

| Table                       | Index                                          | Purpose                                       |
| --------------------------- | ---------------------------------------------- | --------------------------------------------- |
| `votes_meta`                | `nullifier_hash` (UNIQUE)                      | O(1) double-vote prevention                   |
| `votes_meta`                | `tx_hash` (UNIQUE)                             | Fast receipt lookup                           |
| `votes_meta`                | `election_id`                                  | Tally aggregation                             |
| `audit_logs`                | `timestamp`                                    | Time-range audit queries                      |
| `nodes`                     | `last_seen`                                    | Health monitoring scan                        |
| `voter_registrations`       | `(user_id, election_id)` (UNIQUE)              | Registration constraint + lookup              |
| `threshold_key_shares`      | `(election_id, node_id, share_index)` (UNIQUE) | Key share uniqueness                          |
| `tally_partial_decryptions` | `(vote_meta_id, node_id)` (UNIQUE)             | One partial decryption per validator per vote |

## Check Scripts

Located in `services/backend/scripts/check/`:

```bash
node scripts/check/check-schema.js      # Verify crypto columns exist
node scripts/check/check-users.js       # List all users
node scripts/check/check-elections.js   # Recent elections + voters with keys
node scripts/check/check-vote.js        # Vote records in database
```

## CLI Access

```bash
# Direct MySQL (when running locally)
mysql -u root -p voting_db

# Via Docker
docker compose -f infra/docker/docker-compose.yml exec mysql mysql -u root -p voting_db

# phpMyAdmin UI
# Open http://localhost:8080 in browser
```

## See Also

- [Schema Reference](./schema.md)
- [Setup Guide](./setup.md)
