# Docker Setup Guide - University Blockchain Voting System

This guide will help you set up the entire voting system using Docker containers.

## 📦 What's Included

The Docker setup includes:
- **MySQL 8.0** - Database server
- **phpMyAdmin** - Web-based database management
- **Backend API** - Node.js/Express server (Port 3000)
- **Frontend** - Vue.js application (Port 5173)
- **Blockchain Node** - Custom blockchain (Port 3001)

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- At least 4GB of free RAM
- Ports 3000, 3001, 3306, 5173, and 8080 available

### Step 1: Clone the Repository

```bash
git clone https://github.com/SazidAhmed/Blockchain-Voting-System-JS.git
cd Blockchain-Voting-System-JS
```

### Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the values:

```env
# MySQL Configuration
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=voting_db
MYSQL_USER=voting_user
MYSQL_PASSWORD=your_secure_password

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Keep these as default for local development
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000/api
VITE_BLOCKCHAIN_URL=http://localhost:3001
```

### Step 3: Build and Start All Services

```bash
docker-compose up --build
```

Or run in detached mode:

```bash
docker-compose up --build -d
```

### Step 4: Wait for Services to Start

Initial startup takes 2-3 minutes. Watch the logs:

```bash
docker-compose logs -f
```

You'll know it's ready when you see:
- ✅ MySQL: `ready for connections`
- ✅ Backend: `Server running on port 3000`
- ✅ Blockchain: `Blockchain node server running on port 3001`
- ✅ Frontend: `Local: http://localhost:5173/`

### Step 5: Access the Application

Open your browser and navigate to:

- **Frontend (Voting UI)**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/elections
- **Blockchain Node**: http://localhost:3001/node
- **phpMyAdmin**: http://localhost:8080
  - Server: `mysql`
  - Username: `voting_user` (or value from `.env`)
  - Password: `voting_pass` (or value from `.env`)

## 📋 Docker Commands

### Start Services

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start specific service
docker-compose up backend
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: Deletes all data!)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mysql
docker-compose logs -f blockchain-node
docker-compose logs -f frontend
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild Services

```bash
# Rebuild all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend sh

# MySQL shell
docker-compose exec mysql mysql -u voting_user -p voting_db

# Run migration manually
docker-compose exec backend npm run migrate
```

## 🔧 Service Details

### MySQL Database

- **Port**: 3306
- **Default Database**: `voting_db`
- **Default User**: `voting_user`
- **Data Persistence**: Stored in `mysql_data` Docker volume

#### Connect from Host Machine

```bash
mysql -h 127.0.0.1 -P 3306 -u voting_user -p voting_db
```

### phpMyAdmin

- **URL**: http://localhost:8080
- **Server**: `mysql`
- **Features**:
  - Browse tables
  - Run SQL queries
  - Import/Export data
  - User management

### Backend API

- **URL**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api
- **Features**:
  - User registration and authentication
  - Election management
  - Vote submission
  - Cryptographic verification

### Blockchain Node

- **URL**: http://localhost:3001
- **Data Persistence**: Stored in `blockchain_data` Docker volume
- **Features**:
  - Vote storage
  - Block mining
  - Nullifier tracking
  - Transaction verification

### Frontend

- **URL**: http://localhost:5173
- **Hot Reload**: Enabled (changes reflect immediately)
- **Features**:
  - User registration/login
  - Vote casting
  - Receipt download
  - Key management

## 🗄️ Database Setup

The database is automatically initialized on first run with:
1. Schema creation (from `backend/migrations/*.sql`)
2. Tables for users, elections, votes, etc.

### Manual Database Initialization

If needed, run migrations manually:

```bash
docker-compose exec backend npm run migrate
```

### Seed Data (Optional)

To populate with test data:

```bash
docker-compose exec backend npm run db:seed
```

### Reset Database

**WARNING: This deletes all data!**

```bash
docker-compose down -v
docker-compose up --build
```

## 🔐 Generate Election Keys

After starting the services, generate RSA keys for elections:

```bash
docker-compose exec backend node generate-election-keys.js 1
docker-compose exec backend node generate-election-keys.js 2
docker-compose exec backend node generate-election-keys.js 3
docker-compose exec backend node generate-election-keys.js 4
```

## 🧪 Testing the Setup

### 1. Health Checks

Check all services are healthy:

```bash
docker-compose ps
```

All services should show `(healthy)` status.

### 2. Test Backend

```bash
curl http://localhost:3000/api/elections
```

Should return JSON with elections list.

### 3. Test Blockchain

```bash
curl http://localhost:3001/node
```

Should return node information.

### 4. Test Frontend

Open http://localhost:5173 in browser. You should see the voting system homepage.

### 5. End-to-End Test

1. Register a new user at http://localhost:5173/register
2. Login with the credentials
3. Navigate to elections
4. Cast a vote
5. Verify receipt is generated

## 🐛 Troubleshooting

### Services Won't Start

**Problem**: Docker containers fail to start

**Solutions**:
```bash
# Check logs
docker-compose logs

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v
docker-compose up --build
```

### Port Already in Use

**Problem**: `Error: bind: address already in use`

**Solutions**:
```bash
# Find process using the port (example: port 3000)
# On Linux/Mac:
lsof -i :3000
kill -9 <PID>

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in docker-compose.yml:
ports:
  - "3001:3000"  # Map host 3001 to container 3000
```

### MySQL Connection Error

**Problem**: Backend can't connect to MySQL

**Solutions**:
```bash
# Wait for MySQL to be fully ready
docker-compose logs mysql | grep "ready for connections"

# Check MySQL is healthy
docker-compose ps mysql

# Restart backend after MySQL is ready
docker-compose restart backend
```

### Frontend Not Loading

**Problem**: Frontend shows blank page or errors

**Solutions**:
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend

# Clear browser cache and reload
```

### Database Migration Errors

**Problem**: Tables not created

**Solutions**:
```bash
# Run migrations manually
docker-compose exec backend npm run migrate

# Check migration status
docker-compose exec backend npm run migrate:status

# Connect to MySQL and check tables
docker-compose exec mysql mysql -u voting_user -p voting_db -e "SHOW TABLES;"
```

### Blockchain Data Corruption

**Problem**: Blockchain node crashes or errors

**Solutions**:
```bash
# Stop and remove blockchain data
docker-compose stop blockchain-node
docker volume rm voting_blockchain_data

# Restart blockchain
docker-compose up -d blockchain-node
```

## 🔄 Development Workflow

### Hot Reload

All services support hot reload:
- **Frontend**: Changes to `frontend/` files reload automatically
- **Backend**: Restart required (or use nodemon)
- **Blockchain**: Restart required

### Making Changes

1. Edit files in your local directories (`backend/`, `frontend/`, etc.)
2. Changes are synced to containers via volumes
3. Frontend auto-reloads; backend requires restart

```bash
# Restart backend after changes
docker-compose restart backend
```

### Adding npm Packages

```bash
# Backend
docker-compose exec backend npm install <package-name>

# Frontend
docker-compose exec frontend npm install <package-name>

# Rebuild to persist
docker-compose up --build
```

## 📊 Monitoring

### View Resource Usage

```bash
docker stats
```

### View Network Configuration

```bash
docker network inspect voting_voting-network
```

### View Volumes

```bash
docker volume ls
docker volume inspect voting_mysql_data
```

## 🔒 Production Deployment

### DO NOT use this setup directly in production!

For production, you need:

1. **Use Production Dockerfile**
   - Build optimized static frontend
   - Use production Node.js image
   - Remove development dependencies

2. **Secure Environment Variables**
   - Strong passwords
   - Secure JWT secret (minimum 32 characters)
   - Enable SSL/TLS

3. **Use External Database**
   - Managed MySQL (AWS RDS, Azure Database)
   - Regular backups
   - High availability

4. **Add Reverse Proxy**
   - Nginx or Traefik
   - SSL certificates (Let's Encrypt)
   - Rate limiting

5. **Add Monitoring**
   - Prometheus + Grafana
   - Log aggregation (ELK stack)
   - Alerting

6. **Security Hardening**
   - Run containers as non-root
   - Use secrets management
   - Enable Docker security scanning

## 📝 Common Tasks

### Backup Database

```bash
# Backup to file
docker-compose exec mysql mysqldump -u voting_user -p voting_db > backup.sql

# Restore from file
docker-compose exec -T mysql mysql -u voting_user -p voting_db < backup.sql
```

### View Container IP Addresses

```bash
docker-compose exec backend hostname -i
docker-compose exec mysql hostname -i
```

### Access MySQL from Another Container

```bash
# From backend container
docker-compose exec backend mysql -h mysql -u voting_user -p voting_db
```

### Clean Up Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a --volumes
```

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Check service health: `docker-compose ps`
3. Review this troubleshooting guide
4. Check Docker is running: `docker --version`
5. Open an issue on GitHub

## 🎓 Next Steps

Once your Docker setup is running:

1. ✅ Register a test user
2. ✅ Create a test election (via phpMyAdmin or backend script)
3. ✅ Generate election keys
4. ✅ Test the voting flow
5. ✅ Review the code and make improvements
6. ✅ Run integration tests
7. ✅ Explore the blockchain node API

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Project README](./README.md)
- [API Documentation](./docs/API.md)
- [Crypto Implementation](./Project_Status/CRYPTO_IMPLEMENTATION_SUMMARY.md)

## 🛠️ Helper Scripts

We provide several helper scripts to make Docker management easier:

### Available Scripts

#### 1. `docker-start.sh` / `docker-start.bat`
Interactive menu for common Docker operations:
- Start/stop services
- View logs
- Check status
- Quick restart

**Usage:**
```bash
# Linux/Mac
./docker-start.sh

# Windows
docker-start.bat
```

#### 2. `docker-backup.sh`
Backup MySQL database and blockchain data:
```bash
./docker-backup.sh
```
Creates timestamped backup in `./backups/` directory.

#### 3. `docker-restore.sh`
Restore from backup:
```bash
./docker-restore.sh ./backups/voting_backup_TIMESTAMP.tar.gz
```

#### 4. `docker-logs.sh`
Advanced log viewer with filtering:
```bash
./docker-logs.sh
```
Features:
- Follow all logs or specific service
- Search logs with grep
- View error logs only
- Show last N lines

#### 5. `docker-health-check.sh` / `docker-health-check.bat`
Comprehensive health check for all services:
```bash
./docker-health-check.sh
```
Checks:
- Container status
- Service endpoints (HTTP health checks)
- Database connectivity
- Resource usage

#### 6. `docker-cleanup.sh`
Clean up Docker resources:
```bash
./docker-cleanup.sh
```
Options:
- Remove stopped containers
- Remove unused images
- Remove unused volumes
- Full cleanup (with confirmation)

#### 7. `docker-seed.sh`
Seed database with test data:
```bash
./docker-seed.sh
```

## 📊 Monitoring Setup

Complete monitoring solution with Prometheus, Grafana, cAdvisor, and more.

### Quick Start Monitoring

```bash
# Start monitoring stack
./docker-monitoring-start.sh

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Access Monitoring Tools

- **Grafana**: http://localhost:3030 (admin/admin)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8081

### What's Monitored

- ✅ Service uptime and health
- ✅ Container CPU, memory, network usage
- ✅ MySQL database metrics (connections, queries, slow queries)
- ✅ System-level metrics (disk, CPU, memory)
- ✅ Blockchain node performance
- ✅ Custom application metrics

### Pre-configured Dashboards

1. **Voting System Overview** - All key metrics in one view
2. **Container Metrics** - Detailed resource usage per container
3. **MySQL Performance** - Database-specific metrics

### Alerting

Automatic alerts for:
- Service downtime (>1 minute)
- High CPU usage (>80% for 5 minutes)
- High memory usage (>85%)
- Disk space low (<10%)
- MySQL connection issues
- Container restarts

**See** [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) for complete documentation.

---

**Last Updated**: November 5, 2025  
**Docker Compose Version**: 3.8  
**Maintained By**: Development Team
