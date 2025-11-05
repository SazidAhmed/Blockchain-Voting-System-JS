# 🚀 Docker Helper Scripts - Quick Reference

## 📋 Main Operations

### Start/Stop Services
```bash
./docker-start.sh           # Interactive menu (Linux/Mac)
docker-start.bat            # Interactive menu (Windows)
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose restart      # Restart all services
```

## 💾 Backup & Restore

### Backup Everything
```bash
./docker-backup.sh
# Creates: ./backups/voting_backup_TIMESTAMP.tar.gz
```

**What's Backed Up:**
- ✅ MySQL database (SQL dump)
- ✅ Blockchain data
- ✅ Environment configuration
- ✅ Metadata (timestamps, versions)

### Restore from Backup
```bash
./docker-restore.sh ./backups/voting_backup_TIMESTAMP.tar.gz
```

**⚠️ Warning:** This will overwrite current data!

### List Available Backups
```bash
ls -lh ./backups/*.tar.gz
```

## 📊 Monitoring

### Start Monitoring Stack
```bash
./docker-monitoring-start.sh
```

**Access:**
- 📈 Grafana: http://localhost:3030 (admin/admin)
- 📊 Prometheus: http://localhost:9090
- 🐳 cAdvisor: http://localhost:8081

### Stop Monitoring
```bash
docker-compose -f docker-compose.monitoring.yml down
```

### View Monitoring Logs
```bash
docker-compose -f docker-compose.monitoring.yml logs -f
```

## 📝 Logs

### Interactive Log Viewer
```bash
./docker-logs.sh
```

**Options:**
1. View all logs (follow)
2. View backend logs
3. View frontend logs
4. View blockchain logs
5. View MySQL logs
6. View phpMyAdmin logs
7. View last 50 lines
8. Search logs (grep)
9. View error logs only

### Quick Log Commands
```bash
docker-compose logs -f              # Follow all logs
docker-compose logs -f backend      # Follow specific service
docker-compose logs --tail=50       # Last 50 lines
docker-compose logs | grep error    # Search for errors
```

## 🏥 Health Checks

### Run Complete Health Check
```bash
./docker-health-check.sh            # Linux/Mac
docker-health-check.bat             # Windows
```

**Checks:**
- ✅ Docker daemon status
- ✅ Container status
- ✅ HTTP endpoints (Backend, Frontend, Blockchain, phpMyAdmin)
- ✅ Database connectivity
- ✅ Resource usage (CPU, Memory)

### Quick Health Check
```bash
docker-compose ps                   # Container status
curl http://localhost:3000/api/elections  # Backend API
curl http://localhost:3001/node     # Blockchain node
curl http://localhost:5173          # Frontend
```

## 🧹 Cleanup

### Interactive Cleanup Menu
```bash
./docker-cleanup.sh
```

**Options:**
1. Remove stopped containers
2. Remove dangling images
3. Remove unused volumes
4. Remove unused networks
5. Remove build cache
6. Quick cleanup (containers + images + networks)
7. Full cleanup (⚠️ removes ALL unused resources)

### Manual Cleanup Commands
```bash
docker container prune -f           # Remove stopped containers
docker image prune -f               # Remove dangling images
docker volume prune -f              # Remove unused volumes
docker system prune -a --volumes -f # Full cleanup (⚠️ CAUTION!)
```

### Check Disk Usage
```bash
docker system df                    # Show Docker disk usage
```

## 🌱 Seeding

### Seed Database with Test Data
```bash
./docker-seed.sh
```

**What's Created:**
- Sample users
- Test elections
- Candidate data
- Voter registrations

**Test Credentials:**
- Email: test@university.edu
- Password: Test123!

## 🔍 Debugging

### View Container Details
```bash
docker-compose ps                   # List containers
docker inspect voting-backend       # Detailed container info
docker stats                        # Real-time resource usage
```

### Execute Commands in Container
```bash
docker-compose exec backend sh      # Shell into backend
docker-compose exec mysql bash      # Shell into MySQL
docker-compose exec backend npm run migrate  # Run migrations
```

### View MySQL Database
```bash
# Using MySQL CLI
docker-compose exec mysql mysql -u voting_user -p voting_db

# Using phpMyAdmin
# Open: http://localhost:8080
```

### Check Environment Variables
```bash
docker-compose exec backend env     # View backend env vars
cat .env                            # View local env file
```

## 🔄 Common Workflows

### Fresh Start (Complete Reset)
```bash
docker-compose down -v              # Stop and remove volumes
docker-compose up --build -d        # Rebuild and start
```

### Update Code and Restart
```bash
git pull                            # Get latest code
docker-compose up --build -d        # Rebuild with new code
```

### View Specific Service Logs with Follow
```bash
docker-compose logs -f backend --tail=100
```

### Backup Before Major Changes
```bash
./docker-backup.sh                  # Create backup
# Make your changes
./docker-restore.sh <backup-file>   # Restore if needed
```

### Check Service Health Before Deployment
```bash
./docker-health-check.sh            # Verify all services
./docker-backup.sh                  # Create pre-deployment backup
git push                            # Deploy changes
```

## 📱 Service URLs Reference

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:5173 | 5173 |
| Backend API | http://localhost:3000 | 3000 |
| Blockchain Node | http://localhost:3001 | 3001 |
| phpMyAdmin | http://localhost:8080 | 8080 |
| MySQL | localhost:3306 | 3306 |
| **Monitoring** | | |
| Grafana | http://localhost:3030 | 3030 |
| Prometheus | http://localhost:9090 | 9090 |
| cAdvisor | http://localhost:8081 | 8081 |
| Node Exporter | localhost:9100 | 9100 |
| MySQL Exporter | localhost:9104 | 9104 |

## 🎯 Production Commands

### Start Production Stack
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### View Production Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Production Health Check
```bash
# SSH into production server then:
./docker-health-check.sh
```

## 📚 Additional Documentation

- **Full Docker Guide**: [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- **Monitoring Guide**: [MONITORING_GUIDE.md](./MONITORING_GUIDE.md)
- **Quick Reference**: [DOCKER_QUICK_REFERENCE.md](./DOCKER_QUICK_REFERENCE.md)
- **Test Results**: [DOCKER_TEST_RESULTS.md](./DOCKER_TEST_RESULTS.md)

## 🆘 Emergency Commands

### Service Won't Start
```bash
docker-compose down
docker-compose up -d --force-recreate
```

### Database Issues
```bash
docker-compose exec mysql mysql -u voting_user -p
# Then: SHOW DATABASES; USE voting_db; SHOW TABLES;
```

### Port Already in Use
```bash
# Find process using port (Linux/Mac)
lsof -i :3000

# Find process using port (Windows)
netstat -ano | findstr :3000

# Kill process or change port in docker-compose.yml
```

### Out of Disk Space
```bash
./docker-cleanup.sh                 # Interactive cleanup
docker system prune -a --volumes -f # Nuclear option
```

---

**💡 Tip:** Run `./docker-start.sh` for an interactive menu of common operations!
