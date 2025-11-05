# Docker Quick Reference

## 🚀 Quick Start Commands

### Start Everything
```bash
# First time (build images)
docker-compose up --build -d

# Subsequent starts
docker-compose up -d

# With helper script (Linux/Mac)
./docker-start.sh

# With helper script (Windows)
docker-start.bat
```

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mysql
docker-compose logs -f frontend
docker-compose logs -f blockchain-node
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

## 🔍 Useful Commands

### Check Service Status
```bash
docker-compose ps
```

### Execute Commands in Containers
```bash
# Backend shell
docker-compose exec backend sh

# MySQL shell
docker-compose exec mysql mysql -u voting_user -p voting_db

# Run migrations
docker-compose exec backend npm run migrate

# Generate election keys
docker-compose exec backend node generate-election-keys.js 1
```

### Database Operations
```bash
# Backup database
docker-compose exec mysql mysqldump -u voting_user -p voting_db > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u voting_user -p voting_db < backup.sql

# View tables
docker-compose exec mysql mysql -u voting_user -p voting_db -e "SHOW TABLES;"
```

### Rebuild Services
```bash
# Rebuild specific service
docker-compose up --build backend

# Rebuild all
docker-compose up --build
```

### Clean Up
```bash
# Remove containers only
docker-compose down

# Remove containers and volumes (DELETES DATA!)
docker-compose down -v

# Remove everything
docker-compose down -v --rmi all
```

## 📊 Monitoring

### Resource Usage
```bash
docker stats
```

### View Networks
```bash
docker network ls
docker network inspect voting_voting-network
```

### View Volumes
```bash
docker volume ls
docker volume inspect voting_mysql_data
```

## 🐛 Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs <service-name>

# Rebuild without cache
docker-compose build --no-cache <service-name>
```

### Port already in use
```bash
# Find process using port (Linux/Mac)
lsof -i :3000
kill -9 <PID>

# Find process using port (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database connection issues
```bash
# Wait for MySQL to be ready
docker-compose logs mysql | grep "ready for connections"

# Restart backend after MySQL is ready
docker-compose restart backend
```

### Reset everything
```bash
docker-compose down -v
docker system prune -a --volumes
docker-compose up --build -d
```

## 🌐 Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | - |
| Backend API | http://localhost:3000/api | - |
| Blockchain | http://localhost:3001 | - |
| phpMyAdmin | http://localhost:8080 | Server: `mysql`<br>User: `voting_user`<br>Pass: from `.env` |
| MySQL | localhost:3306 | User: `voting_user`<br>Pass: from `.env` |

## 📝 Development Workflow

### Making Code Changes
1. Edit files in local directories
2. Changes sync to containers via volumes
3. Frontend auto-reloads
4. Backend requires restart:
   ```bash
   docker-compose restart backend
   ```

### Adding npm Packages
```bash
# Backend
docker-compose exec backend npm install <package>

# Frontend
docker-compose exec frontend npm install <package>

# Rebuild to persist
docker-compose build <service>
```

### Database Migrations
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Check migration status
docker-compose exec backend npm run migrate:status
```

## 🔐 Production Deployment

Use `docker-compose.prod.yml` for production:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Important for production:**
1. Change all passwords in `.env`
2. Use strong JWT_SECRET (minimum 32 characters)
3. Enable SSL/TLS
4. Use managed database (AWS RDS, etc.)
5. Set up monitoring and logging
6. Regular backups
7. Security scanning

## 📚 Additional Resources

- Full setup guide: [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- Docker documentation: https://docs.docker.com/
- Docker Compose docs: https://docs.docker.com/compose/
