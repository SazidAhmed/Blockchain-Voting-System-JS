# Database Schema

## Overview

MySQL 8.0 database backing the voting system. Stores off-chain metadata, user profiles, and audit trails. Vote content stored encrypted on blockchain — database holds supporting data and cryptographic proofs.

**Database name:** `voting_db` (configurable via `DB_NAME` env var)

## Security Principles

1. **Minimal PII** — encrypted where stored
2. **Pseudonymous on-chain identity** — `pseudonym_id` separate from `institution_id`
3. **Encrypted sensitive data** — `encrypted_profile_blob` (AES-256-GCM)
4. **Tamper-evident audit trail** — hash-chained `audit_logs`
5. **No plaintext ballots** — encrypted ballots and nullifier hashes only

## Tables

### `users`

Registered voters and administrators.

| Column                   | Type         | Constraints                 | Description                                                        |
| ------------------------ | ------------ | --------------------------- | ------------------------------------------------------------------ |
| `id`                     | INT          | PK, AUTO_INCREMENT          |                                                                    |
| `institution_id`         | VARCHAR(50)  | UNIQUE, NOT NULL            | University student/employee ID                                     |
| `username`               | VARCHAR(100) | NOT NULL                    | Login username                                                     |
| `password`               | VARCHAR(60)  | NOT NULL                    | Bcrypt hash                                                        |
| `role`                   | ENUM         | NOT NULL                    | student, teacher, staff, board_member, admin                       |
| `email`                  | VARCHAR(100) | UNIQUE, NOT NULL            |                                                                    |
| `public_key`             | TEXT         |                             | ECDSA P-256 public key for signing votes                           |
| `pseudonym_id`           | VARCHAR(64)  | UNIQUE, NOT NULL            | SHA-256 hash for on-chain identity                                 |
| `encrypted_profile_blob` | TEXT         |                             | AES-256-GCM encrypted PII                                          |
| `encryption_public_key`  | TEXT         | NULL                        | RSA-OAEP public key for ballot encryption (added in migration 002) |
| `registration_status`    | ENUM         | DEFAULT 'pending'           | pending, verified, active, suspended                               |
| `mfa_enabled`            | BOOLEAN      | DEFAULT FALSE               |                                                                    |
| `mfa_secret`             | VARCHAR(64)  |                             | Encrypted TOTP secret                                              |
| `created_at`             | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP   |                                                                    |
| `updated_at`             | TIMESTAMP    | ON UPDATE CURRENT_TIMESTAMP |                                                                    |
| `last_login`             | TIMESTAMP    | NULL                        |                                                                    |

**Indexes:** (none redundant — UNIQUE indexes cover `institution_id`, `email`, `pseudonym_id`; standalone `idx_role` and `idx_registration_status` removed in migration 005 as low-cardinality)

### `elections`

Election configurations and threshold encryption parameters.

| Column                | Type         | Constraints                 | Description                                     |
| --------------------- | ------------ | --------------------------- | ----------------------------------------------- |
| `id`                  | INT          | PK, AUTO_INCREMENT          |                                                 |
| `title`               | VARCHAR(255) | NOT NULL                    |                                                 |
| `description`         | TEXT         |                             |                                                 |
| `start_date`          | DATETIME     | NOT NULL                    | Voting window start                             |
| `end_date`            | DATETIME     | NOT NULL                    | Voting window end                               |
| `status`              | ENUM         | DEFAULT 'pending'           | pending, active, completed, cancelled, tallying |
| `public_key`          | TEXT         | NOT NULL                    | Threshold encryption public key (ElGamal)       |
| `threshold_params`    | JSON         |                             | {t, n, shares}                                  |
| `eligible_roles`      | JSON         |                             | Array of allowed roles                          |
| `created_by`          | INT          | FK → users.id, NOT NULL     | Admin who created                               |
| `created_at`          | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP   |                                                 |
| `updated_at`          | TIMESTAMP    | ON UPDATE CURRENT_TIMESTAMP |                                                 |
| `tally_completed_at`  | TIMESTAMP    | NULL                        |                                                 |
| `results_hash`        | VARCHAR(64)  |                             | SHA-256 of final tally                          |
| `is_locked`           | BOOLEAN      | DEFAULT FALSE               | Locked for editing                              |
| `locked_at`           | TIMESTAMP    | NULL                        |                                                 |
| `locked_by`           | INT          | FK → users.id, NULL         |                                                 |
| `tally_key`           | TEXT         | NULL                        | AES-256-GCM key for encrypting vote tallies     |
| `results_released`    | BOOLEAN      | DEFAULT FALSE               | Whether plaintext results are publicly visible  |
| `results_released_at` | TIMESTAMP    | NULL                        | When results were released                      |

**Indexes:** `status`, `(start_date, end_date)`, `created_by`

**Constraints:** CHECK `(end_date > start_date)`, FK `(locked_by)` → users(id) ON DELETE SET NULL

### `candidates`

Candidates per election.

| Column          | Type         | Constraints                           | Description     |
| --------------- | ------------ | ------------------------------------- | --------------- |
| `id`            | INT          | PK, AUTO_INCREMENT                    |                 |
| `election_id`   | INT          | FK → elections.id (CASCADE), NOT NULL |                 |
| `name`          | VARCHAR(255) | NOT NULL                              |                 |
| `description`   | TEXT         |                                       |                 |
| `metadata`      | JSON         |                                       | Additional data |
| `display_order` | INT          | DEFAULT 0                             | UI sort order   |
| `is_locked`     | BOOLEAN      | DEFAULT FALSE                         |                 |
| `locked_by`     | INT          | FK → users.id (SET NULL), NULL        |                 |
| `locked_at`     | TIMESTAMP    | NULL                                  |                 |
| `updated_at`    | TIMESTAMP    | ON UPDATE CURRENT_TIMESTAMP           |                 |
| `created_at`    | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP             |                 |

**Indexes:** `election_id`, `(election_id, name)`

### `blind_tokens`

Blind-signed eligibility tokens for privacy-preserving voter authentication.

| Column              | Type            | Constraints                           | Description                         |
| ------------------- | --------------- | ------------------------------------- | ----------------------------------- |
| `id`                | BIGINT UNSIGNED | PK, AUTO_INCREMENT                    |                                     |
| `token_id_hash`     | VARCHAR(64)     | UNIQUE, NOT NULL                      | SHA-256 of token (not actual token) |
| `pseudonym_id`      | VARCHAR(64)     | NOT NULL                              | Links to users.pseudonym_id         |
| `election_id`       | INT             | FK → elections.id (CASCADE), NOT NULL | Token valid for this election       |
| `issued_at`         | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP             |                                     |
| `revoked`           | BOOLEAN         | DEFAULT FALSE                         |                                     |
| `revoked_at`        | TIMESTAMP       | NULL                                  |                                     |
| `revocation_reason` | VARCHAR(255)    |                                       |                                     |
| `blind_signature`   | TEXT            |                                       | Signed blinded token (base64)       |

**Indexes:** `token_id_hash`, `pseudonym_id`, `election_id`, `revoked`, `(pseudonym_id, election_id)`  
**Constraints:** FK `(pseudonym_id)` → users(pseudonym_id) ON DELETE CASCADE

**Privacy:** Server never sees the unblinded token.

### `voter_registrations`

Tracks which users are registered for which elections.

| Column               | Type         | Constraints                           | Description                        |
| -------------------- | ------------ | ------------------------------------- | ---------------------------------- |
| `id`                 | INT          | PK, AUTO_INCREMENT                    |                                    |
| `user_id`            | INT          | FK → users.id (CASCADE), NOT NULL     |                                    |
| `election_id`        | INT          | FK → elections.id (CASCADE), NOT NULL |                                    |
| `registration_token` | VARCHAR(255) | UNIQUE                                | Legacy token (prefer blind_tokens) |
| `status`             | ENUM         | DEFAULT 'registered'                  | registered, voted, revoked         |
| `registered_at`      | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP             |                                    |
| `voted_at`           | TIMESTAMP    | NULL                                  |                                    |

**Constraints:** UNIQUE `(user_id, election_id)`
**Indexes:** `user_id`, `election_id`, `status`, `(election_id, status)`

### `votes_meta`

On-chain vote metadata and nullifiers. No ballot content stored here.

| Column             | Type            | Constraints                            | Description                                                    |
| ------------------ | --------------- | -------------------------------------- | -------------------------------------------------------------- |
| `id`               | BIGINT UNSIGNED | PK, AUTO_INCREMENT                     |                                                                |
| `tx_hash`          | VARCHAR(64)     | UNIQUE, NOT NULL                       | Blockchain transaction hash                                    |
| `block_index`      | INT             | NOT NULL                               | Block number                                                   |
| `election_id`      | INT             | FK → elections.id (RESTRICT), NOT NULL |                                                                |
| `nullifier_hash`   | VARCHAR(64)     | UNIQUE, NOT NULL                       | SHA-256 of nullifier (double-vote prevention)                  |
| `cipher_ref`       | TEXT            |                                        | Reference to encrypted ballot                                  |
| `encrypted_ballot` | TEXT            |                                        | Threshold-encrypted ballot data                                |
| `signature`        | TEXT            | NULL                                   | ECDSA signature of vote package (added in migration 002)       |
| `voter_public_key` | TEXT            | NULL                                   | Public key for signature verification (added in migration 002) |
| `merkle_root`      | VARCHAR(64)     |                                        | Merkle root of block                                           |
| `merkle_proof`     | JSON            |                                        | Merkle inclusion proof                                         |
| `timestamp`        | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP              |                                                                |

**Indexes:** `tx_hash`, `election_id`, `nullifier_hash`, `block_index`, `timestamp`, `(election_id, block_index)`

### `vote_receipts`

Cryptographic receipts issued to voters for verification.

| Column                 | Type            | Constraints                            | Description                   |
| ---------------------- | --------------- | -------------------------------------- | ----------------------------- |
| `id`                   | BIGINT UNSIGNED | PK, AUTO_INCREMENT                     |                               |
| `election_id`          | INT             | FK → elections.id (RESTRICT), NOT NULL |                               |
| `nullifier_hash`       | VARCHAR(64)     | NOT NULL                               | Lets voter verify their vote  |
| `transaction_hash`     | VARCHAR(64)     | UNIQUE, NOT NULL                       |                               |
| `block_height`         | INT             |                                        |                               |
| `block_hash`           | VARCHAR(64)     |                                        |                               |
| `merkle_proof`         | JSON            |                                        | Merkle inclusion proof        |
| `validator_signatures` | JSON            |                                        | Array of validator signatures |
| `issued_at`            | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP              |                               |

**Indexes:** `election_id`, `nullifier_hash`, `transaction_hash`, `block_height`

### `nodes`

Validator and observer nodes in the permissioned blockchain network.

| Column                   | Type         | Constraints                 | Description                            |
| ------------------------ | ------------ | --------------------------- | -------------------------------------- |
| `id`                     | INT          | PK, AUTO_INCREMENT          |                                        |
| `node_id`                | VARCHAR(64)  | UNIQUE, NOT NULL            |                                        |
| `pubkey`                 | TEXT         | NOT NULL                    |                                        |
| `endpoint`               | VARCHAR(255) | NOT NULL                    | API endpoint                           |
| `p2p_endpoint`           | VARCHAR(255) |                             |                                        |
| `node_type`              | ENUM         | DEFAULT 'validator'         | validator, observer, seed              |
| `status`                 | ENUM         | DEFAULT 'active'            | active, inactive, quarantined, removed |
| `added_by`               | INT          | FK → users.id (SET NULL)    |                                        |
| `approved_at`            | TIMESTAMP    | NULL                        |                                        |
| `quorum_votes`           | JSON         |                             |                                        |
| `last_seen`              | TIMESTAMP    | NULL                        |                                        |
| `last_block_validated`   | INT          |                             |                                        |
| `blocks_validated_count` | INT          | DEFAULT 0                   |                                        |
| `misbehavior_count`      | INT          | DEFAULT 0                   |                                        |
| `evidence`               | JSON         |                             | Misbehavior evidence                   |
| `quarantined_at`         | TIMESTAMP    | NULL                        |                                        |
| `quarantine_reason`      | VARCHAR(255) |                             |                                        |
| `created_at`             | TIMESTAMP    |                             |                                        |
| `updated_at`             | TIMESTAMP    | ON UPDATE CURRENT_TIMESTAMP |                                        |

**Indexes:** `node_id`, `status`, `node_type`, `last_seen`, `idx_added_by`

### `audit_logs`

Tamper-evident audit trail with hash chaining.

| Column           | Type        | Constraints               | Description                                   |
| ---------------- | ----------- | ------------------------- | --------------------------------------------- |
| `id`             | BIGINT      | PK, AUTO_INCREMENT        |                                               |
| `event_type`     | VARCHAR(50) | NOT NULL                  | e.g. USER_REGISTERED, VOTE_CAST               |
| `event_category` | ENUM        | NOT NULL                  | auth, vote, election, node, admin, security   |
| `user_id`        | INT         | FK → users.id (SET NULL)  |                                               |
| `ip_address`     | VARCHAR(45) |                           |                                               |
| `user_agent`     | TEXT        |                           |                                               |
| `target_type`    | VARCHAR(50) |                           | e.g. election, vote, node                     |
| `target_id`      | VARCHAR(64) |                           |                                               |
| `details`        | JSON        |                           | Event details                                 |
| `severity`       | ENUM        | DEFAULT 'info'            | info, warning, error, critical                |
| `previous_hash`  | VARCHAR(64) |                           | Hash of previous entry (tamper-evident chain) |
| `log_hash`       | VARCHAR(64) |                           | Hash of this entry                            |
| `timestamp`      | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP |                                               |

**Indexes:** `event_type`, `event_category`, `user_id`, `timestamp`, `severity`, `log_hash`, `(event_type, timestamp)`

**Tamper evidence:** Each entry includes `previous_hash` of the prior entry, forming a verifiable chain.

### `admin_audit_logs`

Admin panel action tracking.

| Column             | Type            | Constraints                       | Description                         |
| ------------------ | --------------- | --------------------------------- | ----------------------------------- |
| `id`               | BIGINT UNSIGNED | PK, AUTO_INCREMENT                |                                     |
| `admin_id`         | INT             | FK → users.id (CASCADE), NOT NULL |                                     |
| `action_type`      | VARCHAR(50)     | NOT NULL                          | e.g. CREATE_ELECTION, ADD_CANDIDATE |
| `resource_type`    | VARCHAR(50)     | NOT NULL                          |                                     |
| `resource_id`      | INT             |                                   |                                     |
| `changes`          | MEDIUMTEXT      |                                   | JSON diff                           |
| `change_hash`      | VARCHAR(64)     |                                   | SHA-256 of changes                  |
| `action_signature` | VARCHAR(64)     |                                   | ECDSA signature                     |
| `reason`           | VARCHAR(500)    |                                   |                                     |
| `ip_address`       | VARCHAR(45)     |                                   |                                     |
| `user_agent`       | TEXT            |                                   |                                     |
| `metadata`         | JSON            |                                   |                                     |
| `timestamp`        | DATETIME        | NOT NULL                          |                                     |
| `status`           | ENUM            | DEFAULT 'success'                 | success, failed                     |
| `verified`         | BOOLEAN         | DEFAULT FALSE                     |                                     |
| `created_at`       | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP         |                                     |

**Indexes:** `admin_id`, `action_type`, `resource_type`, `timestamp`, `(admin_id, timestamp)`

### `admin_security_logs`

Security-relevant events for admin monitoring.

| Column            | Type            | Constraints                       | Description                            |
| ----------------- | --------------- | --------------------------------- | -------------------------------------- |
| `id`              | BIGINT UNSIGNED | PK, AUTO_INCREMENT                |                                        |
| `admin_id`        | INT             | FK → users.id (CASCADE), NOT NULL |                                        |
| `event_type`      | VARCHAR(50)     | NOT NULL                          | e.g. FAILED_LOGIN, SUSPICIOUS_ACTIVITY |
| `severity`        | ENUM            | DEFAULT 'info'                    | info, warning, error, critical         |
| `description`     | VARCHAR(500)    |                                   |                                        |
| `metadata`        | JSON            |                                   |                                        |
| `timestamp`       | DATETIME        | NOT NULL                          |                                        |
| `acknowledged`    | BOOLEAN         | DEFAULT FALSE                     |                                        |
| `acknowledged_by` | INT             | FK → users.id (SET NULL)          |                                        |
| `acknowledged_at` | DATETIME        |                                   |                                        |
| `created_at`      | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP         |                                        |

**Indexes:** `admin_id`, `event_type`, `severity`, `timestamp`, `idx_acknowledged_by`

### `threshold_key_shares`

Metadata about distributed key shares (actual shares in HSM/Vault, never stored here).

| Column                    | Type         | Constraints                            | Description                          |
| ------------------------- | ------------ | -------------------------------------- | ------------------------------------ |
| `id`                      | INT          | PK, AUTO_INCREMENT                     |                                      |
| `election_id`             | INT          | FK → elections.id (RESTRICT), NOT NULL |                                      |
| `node_id`                 | VARCHAR(64)  | NOT NULL                               |                                      |
| `share_index`             | INT          | NOT NULL                               | 1 to n                               |
| `public_verification_key` | TEXT         |                                        |                                      |
| `ceremony_id`             | VARCHAR(64)  |                                        | DKG ceremony ID                      |
| `ceremony_completed_at`   | TIMESTAMP    | NULL                                   |                                      |
| `status`                  | ENUM         | DEFAULT 'pending'                      | pending, active, revoked, rotated    |
| `vault_path`              | VARCHAR(255) |                                        | Path to encrypted share in Vault/HSM |
| `created_at`              | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP              |                                      |

**Constraints:** UNIQUE `(election_id, node_id, share_index)`
**Indexes:** `election_id`, `node_id`, `status`  
**Constraints:** FK `(node_id)` → nodes(node_id) ON DELETE RESTRICT

### `tally_partial_decryptions`

Partial decryptions from validators during the tally process.

| Column                 | Type            | Constraints                            | Description         |
| ---------------------- | --------------- | -------------------------------------- | ------------------- |
| `id`                   | BIGINT UNSIGNED | PK, AUTO_INCREMENT                     |                     |
| `election_id`          | INT             | FK → elections.id (RESTRICT), NOT NULL |                     |
| `vote_meta_id`         | INT             | FK → votes_meta.id (CASCADE), NOT NULL |                     |
| `node_id`              | VARCHAR(64)     | NOT NULL                               |                     |
| `partial_decryption`   | TEXT            | NOT NULL                               | Base64 encoded      |
| `proof_of_correctness` | TEXT            |                                        | ZK proof            |
| `signature`            | TEXT            |                                        | Validator signature |
| `created_at`           | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP              |                     |

**Constraints:** UNIQUE `(vote_meta_id, node_id)`
**Indexes:** `election_id`, `vote_meta_id`, `node_id`

### `system_config`

Global system configuration key-value store.

| Column         | Type         | Constraints                 | Description                   |
| -------------- | ------------ | --------------------------- | ----------------------------- |
| `id`           | INT          | PK, AUTO_INCREMENT          |                               |
| `config_key`   | VARCHAR(100) | UNIQUE, NOT NULL            |                               |
| `config_value` | TEXT         |                             |                               |
| `config_type`  | ENUM         | DEFAULT 'string'            | string, number, boolean, json |
| `description`  | TEXT         |                             |                               |
| `is_encrypted` | BOOLEAN      | DEFAULT FALSE               |                               |
| `updated_at`   | TIMESTAMP    | ON UPDATE CURRENT_TIMESTAMP |                               |
| `updated_by`   | INT          | FK → users.id (SET NULL)    |                               |

**Default configs:** consensus_type (pbft), min_validators (3), block_time_ms (500), votes_per_block (1000), mfa_required (true), threshold_t (2), threshold_n (3)  
**Indexes:** `config_key`, `idx_updated_by`

### `schema_migrations`

Tracks applied migrations.

| Column           | Type         | Constraints               | Description               |
| ---------------- | ------------ | ------------------------- | ------------------------- |
| `id`             | INT          | PK, AUTO_INCREMENT        |                           |
| `migration_name` | VARCHAR(255) | UNIQUE, NOT NULL          |                           |
| `applied_at`     | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP |                           |
| `checksum`       | VARCHAR(64)  |                           | SHA-256 of migration file |

## Views

### `v_active_elections`

Active/pending elections with counts. Joins `elections`, `candidates`, `voter_registrations`, `votes_meta`.

Columns: `id`, `title`, `description`, `start_date`, `end_date`, `status`, `candidate_count`, `registered_voters`, `votes_cast`

### `v_node_health`

Validator node health monitoring. Calculates `minutes_since_last_seen` and derives `health_status` (healthy, degraded, offline, quarantined, removed).

### `admin_activity_summary`

Admin action counts grouped by admin user. Tracks elections created/activated/deactivated, candidates added/deleted, failed actions, last action timestamp.

## Relationships

```text
users ──< elections (created_by)
users ──< voter_registrations (user_id)
users ──< audit_logs (user_id)
users ──< admin_audit_logs (admin_id)
users ──< admin_security_logs (admin_id, acknowledged_by)
users ──< nodes (added_by)
users ──< system_config (updated_by)
elections ──< candidates (election_id, CASCADE)
elections ──< blind_tokens (election_id, CASCADE)
elections ──< voter_registrations (election_id, CASCADE)
elections ──< votes_meta (election_id, RESTRICT)
elections ──< vote_receipts (election_id, RESTRICT)
elections ──< threshold_key_shares (election_id, RESTRICT)
elections ──< tally_partial_decryptions (election_id, RESTRICT)
votes_meta ──< tally_partial_decryptions (vote_meta_id, CASCADE)
```

## Index Strategy

| Table                       | Key Indexes                                    | Purpose                                       |
| --------------------------- | ---------------------------------------------- | --------------------------------------------- |
| `votes_meta`                | `nullifier_hash` (UNIQUE)                      | Double-vote prevention                        |
| `votes_meta`                | `tx_hash` (UNIQUE)                             | Receipt verification                          |
| `votes_meta`                | `election_id`                                  | Tally queries                                 |
| `votes_meta`                | `(election_id, block_index)`                   | Tally ordering per election (migration 005)   |
| `audit_logs`                | `timestamp`                                    | Audit queries                                 |
| `audit_logs`                | `(event_type, timestamp)`                      | Time-range-per-type queries (migration 005)   |
| `nodes`                     | `last_seen`                                    | Health monitoring                             |
| `nodes`                     | `idx_added_by`                                 | FK index on added_by (migration 005)          |
| `candidates`                | `(election_id, name)`                          | ORDER BY name in results (migration 005)      |
| `voter_registrations`       | `(user_id, election_id)` (UNIQUE)              | Registration integrity                        |
| `voter_registrations`       | `(election_id, status)`                        | COUNT aggregates (migration 005)              |
| `blind_tokens`              | `(pseudonym_id, election_id)`                  | Token validity lookups (migration 005)        |
| `admin_audit_logs`          | `(admin_id, timestamp)`                        | Paginated admin audit (migration 005)         |
| `threshold_key_shares`      | `(election_id, node_id, share_index)` (UNIQUE) | Key share uniqueness                          |
| `tally_partial_decryptions` | `(vote_meta_id, node_id)` (UNIQUE)             | One partial decryption per validator per vote |

## Migrations

| Migration | File                                                       | Changes                                                                                                                                                             |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001       | `services/backend/migrations/001_initial_schema.sql`       | All 13 tables, 3 views, default config, schema_migrations tracking                                                                                                  |
| 002       | `services/backend/migrations/002_add_crypto_fields.sql`    | Adds `encryption_public_key` to users, `signature` and `voter_public_key` to votes_meta, index on signature                                                         |
| 003       | `services/backend/migrations/003_add_tally_encryption.sql` | Adds `tally_key`, `results_released`, `results_released_at` to elections for encrypted result tallying                                                              |
| 004       | `services/backend/migrations/004_fix_tally_key_column.sql` | Fixes `tally_key` from VARCHAR(64) to TEXT (RSA keys need ~1700 chars)                                                                                              |
| 005       | `services/backend/migrations/005_fix_schema_issues.sql`    | Adds missing FK constraints and indexes, composite indexes, BIGINT PKs on high-growth tables, VARCHAR sizing, UNIQUE on vote_receipts, collation, view GROUP BY fix |

## See Also

- [Setup Guide](./setup.md)
- [Quick Reference](./reference.md)
