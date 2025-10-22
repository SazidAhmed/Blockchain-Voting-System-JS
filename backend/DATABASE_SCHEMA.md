# Database Schema Documentation

## Overview

The University Blockchain Voting System uses MySQL as its relational database for storing off-chain metadata, user profiles, and audit trails. **Critical vote data is stored encrypted and on the blockchain**, while this database holds supporting information.

## Security Principles

1. **Minimal PII Storage**: Only essential personal information is stored, encrypted where possible
2. **Pseudonymous On-Chain Identity**: Users have a `pseudonym_id` used on-chain, separate from `institution_id`
3. **Encrypted Sensitive Data**: PII stored in `encrypted_profile_blob`
4. **Tamper-Evident Logging**: `audit_logs` table uses hash chaining
5. **No Plaintext Ballots**: Only encrypted ballots and nullifiers stored

## Database Schema (v1.0)

### Core Tables

#### `users`
Stores registered voters and administrators.

**Key Fields:**
- `institution_id` - University student/employee ID (unique)
- `pseudonym_id` - SHA256 hash used for on-chain identity (unlinkable to institution_id)
- `public_key` - User's public key for signing votes
- `encrypted_profile_blob` - AES-256 encrypted PII
- `mfa_secret` - Encrypted TOTP secret for 2FA
- `registration_status` - Account verification status

**Indexes:**
- `institution_id`, `email`, `pseudonym_id`, `role`, `registration_status`

#### `elections`
Election configurations and cryptographic parameters.

**Key Fields:**
- `title`, `description` - Election metadata
- `start_date`, `end_date` - Voting window
- `status` - pending | active | completed | cancelled | tallying
- `public_key` - Threshold encryption public key (ElGamal)
- `threshold_params` - JSON: {t, n, shares} for threshold decryption
- `eligible_roles` - JSON array of roles allowed to vote
- `results_hash` - SHA256 of final tally for verification

#### `candidates`
Candidates for each election.

**Key Fields:**
- `election_id` - Foreign key to elections
- `name`, `description` - Candidate information
- `metadata` - JSON for additional data
- `display_order` - Sort order for UI

#### `blind_tokens`
Blind-signed eligibility tokens (privacy-preserving).

**Key Fields:**
- `token_id_hash` - SHA256 of token (not the actual token)
- `pseudonym_id` - Links to user's pseudonymous ID
- `election_id` - Token valid for this election
- `blind_signature` - Signed blinded token
- `revoked` - Revocation status

**Privacy Note:** The server never sees the unblinded token, ensuring voter anonymity.

#### `voter_registrations`
Tracks voter registration status.

**Key Fields:**
- `user_id`, `election_id` - Unique constraint
- `status` - registered | voted | revoked
- `registration_token` - Legacy token (prefer blind_tokens)
- `voted_at` - Timestamp when vote was cast

#### `votes_meta`
On-chain vote metadata and nullifiers (no ballot content).

**Key Fields:**
- `tx_hash` - Blockchain transaction hash (unique)
- `block_index` - Block number where included
- `election_id` - Election reference
- `nullifier_hash` - SHA256 of nullifier (prevents double voting)
- `encrypted_ballot` - Threshold-encrypted ballot data
- `merkle_root`, `merkle_proof` - For verification

**Privacy Note:** Nullifier prevents double voting without revealing voter identity.

#### `vote_receipts`
Cryptographic receipts issued to voters.

**Key Fields:**
- `election_id` - Election reference
- `nullifier_hash` - Allows voter to verify their vote
- `transaction_hash`, `block_height`, `block_hash` - Blockchain proof
- `merkle_proof` - JSON merkle inclusion proof
- `validator_signatures` - JSON array of validator signatures

**Usage:** Voters can use their nullifier and this receipt to verify their vote was counted.

### Blockchain Network Tables

#### `nodes`
Validator and observer nodes in the permissioned network.

**Key Fields:**
- `node_id` - Unique node identifier
- `pubkey` - Node public key for validation
- `endpoint` - API endpoint (host:port)
- `node_type` - validator | observer | seed
- `status` - active | inactive | quarantined | removed
- `last_seen` - Health monitoring timestamp
- `misbehavior_count`, `evidence` - Governance tracking

**Governance:** Nodes can be quarantined or removed based on evidence and quorum votes.

#### `threshold_key_shares`
Metadata about distributed key shares (actual shares in HSM/Vault).

**Key Fields:**
- `election_id` - Election this key is for
- `node_id` - Node holding this share
- `share_index` - Index (1 to n)
- `ceremony_id` - DKG ceremony identifier
- `vault_path` - Path to encrypted share in Vault/HSM

**Security Note:** Actual key shares are NEVER stored in this database. Only metadata.

#### `tally_partial_decryptions`
Partial decryptions from validators during tallying.

**Key Fields:**
- `election_id`, `vote_meta_id` - Vote reference
- `node_id` - Validator providing decryption
- `partial_decryption` - Base64 encoded partial decryption
- `proof_of_correctness` - ZK proof
- `signature` - Validator signature

**Process:** Threshold decryption requires t-of-n validators to provide partial decryptions.

### Audit and Configuration Tables

#### `audit_logs`
Tamper-evident audit trail using hash chaining.

**Key Fields:**
- `event_type` - e.g., USER_REGISTERED, VOTE_CAST
- `event_category` - auth | vote | election | node | admin | security
- `user_id`, `ip_address`, `user_agent` - Actor information
- `details` - JSON event details
- `previous_hash` - Hash of previous log entry (tamper-evident chain)
- `log_hash` - Hash of this entry

**Tamper Evidence:** Each log entry includes the hash of the previous entry, creating a chain.

#### `system_config`
Global system configuration.

**Key Fields:**
- `config_key` - Configuration parameter name
- `config_value` - Value (potentially encrypted)
- `config_type` - string | number | boolean | json
- `is_encrypted` - Whether value is encrypted

**Examples:**
- `consensus_type`: pbft | tendermint | raft
- `min_validators`: Minimum validator count
- `threshold_t`, `threshold_n`: Threshold parameters

#### `schema_migrations`
Tracks applied database migrations.

**Key Fields:**
- `migration_name` - Migration file name
- `applied_at` - Timestamp
- `checksum` - SHA256 of migration file

## Views

### `v_active_elections`
Convenient view for active/pending elections with counts.

**Columns:**
- Basic election info
- `candidate_count` - Number of candidates
- `registered_voters` - Number of registered voters
- `votes_cast` - Number of votes received

### `v_node_health`
Node health monitoring view.

**Columns:**
- Node identification and status
- `minutes_since_last_seen` - Time since last heartbeat
- `health_status` - healthy | degraded | offline | quarantined | removed

## Data Flow Examples

### 1. User Registration Flow

```sql
-- 1. Create user
INSERT INTO users (institution_id, username, password, role, email, 
                   pseudonym_id, public_key, registration_status)
VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');

-- 2. After IdP verification
UPDATE users SET registration_status = 'verified' WHERE id = ?;

-- 3. Issue blind token
INSERT INTO blind_tokens (token_id_hash, pseudonym_id, election_id, blind_signature)
VALUES (?, ?, ?, ?);
```

### 2. Vote Casting Flow

```sql
-- 1. Check if user is registered for election
SELECT * FROM voter_registrations 
WHERE user_id = ? AND election_id = ? AND status = 'registered';

-- 2. Check nullifier hasn't been used
SELECT * FROM votes_meta WHERE nullifier_hash = ?;

-- 3. Store vote metadata (after blockchain inclusion)
INSERT INTO votes_meta (tx_hash, block_index, election_id, nullifier_hash, 
                        encrypted_ballot, merkle_proof)
VALUES (?, ?, ?, ?, ?, ?);

-- 4. Update registration status
UPDATE voter_registrations SET status = 'voted', voted_at = NOW()
WHERE user_id = ? AND election_id = ?;

-- 5. Issue receipt
INSERT INTO vote_receipts (election_id, nullifier_hash, transaction_hash, 
                           block_height, merkle_proof, validator_signatures)
VALUES (?, ?, ?, ?, ?, ?);

-- 6. Log event
INSERT INTO audit_logs (event_type, event_category, user_id, target_type, 
                        target_id, details, previous_hash, log_hash)
VALUES ('VOTE_CAST', 'vote', ?, 'election', ?, ?, ?, ?);
```

### 3. Tally Process

```sql
-- 1. Get all votes for election
SELECT * FROM votes_meta WHERE election_id = ?;

-- 2. Collect partial decryptions from validators
INSERT INTO tally_partial_decryptions 
  (election_id, vote_meta_id, node_id, partial_decryption, proof_of_correctness)
VALUES (?, ?, ?, ?, ?);

-- 3. After combining t-of-n shares, update election
UPDATE elections 
SET status = 'completed', 
    tally_completed_at = NOW(), 
    results_hash = ?
WHERE id = ?;
```

## Indexes and Performance

### Critical Indexes
- `votes_meta.nullifier_hash` - Fast double-vote prevention
- `votes_meta.tx_hash` - Receipt verification
- `votes_meta.election_id` - Tallying queries
- `audit_logs.timestamp` - Audit queries
- `nodes.last_seen` - Health monitoring

### Composite Indexes
- `voter_registrations(user_id, election_id)` - Unique constraint
- `threshold_key_shares(election_id, node_id, share_index)` - Unique constraint

## Security Considerations

### Encryption
- User passwords: bcrypt (hash only)
- `encrypted_profile_blob`: AES-256-GCM
- `mfa_secret`: AES-256-GCM
- Key shares: Stored in HSM/Vault, NOT in database

### Access Control
- Application uses connection pool with limited privileges
- No direct database access for users
- Prepared statements prevent SQL injection
- Audit logs track all data access

### Privacy Protection
1. **Pseudonymity**: `pseudonym_id` used on-chain, unlinkable to `institution_id`
2. **Blind Tokens**: Server never sees unblinded tokens
3. **Nullifiers**: Prevent double voting without revealing identity
4. **Encrypted Ballots**: Only threshold decryption reveals vote content

## Backup and Recovery

### Backup Strategy
- Daily full backups of entire database
- Transaction log backups every hour
- Backup retention: 90 days
- Encrypted backups stored in multiple regions

### Critical Tables (Priority 1)
- `votes_meta` - Vote records
- `vote_receipts` - Voter receipts
- `audit_logs` - Audit trail
- `elections` - Election config

### Recoverable Tables (Priority 2)
- `users` - Can be recreated from IdP
- `candidates` - Can be recreated from admin input

## Migration Management

### Running Migrations

```bash
# Run all pending migrations
node backend/migrate.js run

# Check migration status
node backend/migrate.js status

# Rollback last migration (when implemented)
node backend/migrate.js rollback
```

### Creating New Migrations

1. Create file: `backend/migrations/00X_description.sql`
2. Use sequential numbering: 001, 002, 003...
3. Include idempotent statements (CREATE TABLE IF NOT EXISTS)
4. Test migration on staging database first

## Monitoring Queries

### Check vote counts by election
```sql
SELECT 
    e.id, e.title, e.status,
    COUNT(vm.id) as vote_count
FROM elections e
LEFT JOIN votes_meta vm ON e.id = vm.election_id
GROUP BY e.id, e.title, e.status;
```

### Check validator health
```sql
SELECT * FROM v_node_health WHERE health_status != 'healthy';
```

### Recent audit events
```sql
SELECT event_type, event_category, user_id, timestamp, details
FROM audit_logs
WHERE severity IN ('error', 'critical')
ORDER BY timestamp DESC
LIMIT 50;
```

### Detect potential double voting attempts
```sql
SELECT nullifier_hash, COUNT(*) as attempts
FROM audit_logs
WHERE event_type = 'VOTE_ATTEMPT_FAILED'
  AND details->>'$.reason' = 'nullifier_already_used'
GROUP BY nullifier_hash
HAVING attempts > 1;
```

## Future Enhancements

- [ ] Database sharding for horizontal scaling
- [ ] Read replicas for query performance
- [ ] Automated backup verification
- [ ] Migration rollback support
- [ ] Database encryption at rest
- [ ] Connection pooling optimization
- [ ] Query performance monitoring
- [ ] Automated index optimization

---

**Last Updated:** 2025-10-20  
**Schema Version:** 1.0  
**Migration File:** 001_initial_schema.sql
