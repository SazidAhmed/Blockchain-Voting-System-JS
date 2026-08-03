# Database Setup

## Prerequisites

- MySQL 8.0+
- Node.js 16+
- Docker (optional, for containerized stack)

## Database

- **Engine:** MySQL 8.0
- **Database name:** `voting_db` (default; set via `DB_NAME` env var)
- **Connection config:** `services/backend/config/db.js`
- **phpMyAdmin:** `http://localhost:8080` (when Docker stack is running)

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up --build -d
```

Backend auto-runs migrations on boot. Database is created if it doesn't exist.

## Manual Setup

### 1. Install dependencies

```bash
cd services/backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=voting_db
```

### 3. Run migrations

```bash
npm run migrate
```

This creates the database if missing and applies all pending migrations from `services/backend/migrations/`.

### 4. Seed Admin data

```bash
bash infra/scripts/docker-bootstrap.sh
```

Or directly inside the container:

```bash
docker compose -f infra/docker/docker-compose.yml exec -T backend node scripts/seed.js
```

### 5. Verify

```bash
npm run migrate:status
```

Expected: 13 tables, 3 views.

## Migration Management

```bash
npm run migrate              # Run all pending migrations
npm run migrate:status       # Check which migrations have been applied
```

Migration files live in `services/backend/migrations/` with sequential numbering:

```text
001_initial_schema.sql
```

New migrations run automatically on Docker boot. The `schema_migrations` table tracks which have been applied with checksums for integrity.

## Seed Data

`bash infra/scripts/docker-bootstrap.sh` populates:

- 7 users (admin, students, teacher, staff, board member)
- 3 elections (active, pending, completed)
- 8 candidates
- 4 validator nodes
- Voter registrations
- System configuration

**Test credentials:**

| Role  | Institution ID | Password |
| ----- | -------------- | -------- |
| Admin | ADMIN001       | admin123 |

## Scripts

| Command                  | Action                         |
| ------------------------ | ------------------------------ |
| `npm run migrate`        | Apply all pending migrations   |
| `npm run migrate:status` | Check migration status         |
| `npm run dev`            | Start backend with auto-reload |
| `npm start`              | Start production server        |

Check scripts in `services/backend/scripts/check/`:

| Script               | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `check-schema.js`    | Verify crypto columns exist                |
| `check-users.js`     | List all users                             |
| `check-elections.js` | List recent elections and voters with keys |
| `check-vote.js`      | Check vote records in database             |

## Connection Config

`services/backend/config/db.js`:

```js
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "voting_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

## Common Operations

### Reset database (development only)

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS voting_db; CREATE DATABASE voting_db;"
npm run migrate
npm run db:seed   # optional
```

### Backup

```bash
mysqldump -u root -p voting_db > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
mysql -u root -p voting_db < backup_file.sql
```

## See Also

- [Schema Reference](./schema.md)
- [Quick Reference](./reference.md)
