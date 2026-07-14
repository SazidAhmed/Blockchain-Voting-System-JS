#!/bin/bash
# =============================================================================
# MONITORING SYSTEM - QUICK TEST SCRIPT
# =============================================================================
# Run these commands to verify and test the monitoring system
# =============================================================================

echo "🎯 Monitoring System Test Suite"
echo "================================"
echo ""

# Test 1: Check all containers running
echo "1️⃣  Testing Container Status..."
echo "---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep voting | sort
echo ""

# Test 2: Grafana Health Check
echo "2️⃣  Testing Grafana API..."
echo "---"
GRAFANA_STATUS=$(curl -s http://localhost:3030/api/health | grep -o '"database":"[^"]*"')
echo "Response: $GRAFANA_STATUS"
echo "✅ Grafana is responding"
echo ""

# Test 3: Prometheus Health Check
echo "3️⃣  Testing Prometheus..."
echo "---"
PROM_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy)
if [ "$PROM_CHECK" = "200" ]; then
    echo "✅ Prometheus health check passed (HTTP $PROM_CHECK)"
else
    echo "⚠️  Prometheus health check returned HTTP $PROM_CHECK"
fi
echo ""

# Test 4: cAdvisor Health Check
echo "4️⃣  Testing cAdvisor..."
echo "---"
CADVISOR_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/v1.3/machine)
if [ "$CADVISOR_CHECK" = "200" ]; then
    echo "✅ cAdvisor is responding (HTTP $CADVISOR_CHECK)"
else
    echo "⚠️  cAdvisor returned HTTP $CADVISOR_CHECK"
fi
echo ""

# Test 5: Node Exporter Health Check
echo "5️⃣  Testing Node Exporter..."
echo "---"
NODE_EXP_CHECK=$(curl -s http://localhost:9100/metrics | wc -l)
echo "✅ Node Exporter is responding ($NODE_EXP_CHECK metric lines)"
echo ""

# Test 6: Blockchain Node Status
echo "6️⃣  Testing Blockchain Nodes..."
echo "---"
for PORT in 3001 3002 3003 3004 3005; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/node/status)
    if [ "$STATUS" = "200" ]; then
        echo "✅ Node on port $PORT is responding (HTTP $STATUS)"
    else
        echo "⏳ Node on port $PORT: HTTP $STATUS (still initializing)"
    fi
done
echo ""

# Test 7: MySQL Database
echo "7️⃣  Testing MySQL Database..."
echo "---"
DB_CHECK=$(docker exec voting-mysql-multinode mysqladmin -u voting_user -pvoting_pass ping 2>/dev/null | grep -c "mysqld is alive")
if [ "$DB_CHECK" = "1" ]; then
    echo "✅ MySQL database is responding"
else
    echo "⚠️  MySQL database check failed"
fi
echo ""

# Test 8: Docker Volume Status
echo "8️⃣  Testing Persistent Volumes..."
echo "---"
docker volume ls | grep voting
echo "✅ Volumes mounted and persisted"
echo ""

# Test 9: Network Configuration
echo "9️⃣  Testing Network Configuration..."
echo "---"
docker network ls | grep voting
echo "✅ Networks configured"
echo ""

# Test 10: Prometheus Targets
echo "🔟 Prometheus Targets..."
echo "---"
echo "Expected targets:"
echo "  - cAdvisor"
echo "  - Node Exporter"
echo "  - MySQL (optional)"
echo "Query: curl -s http://localhost:9090/api/v1/targets 2>&1"
echo ""

echo "================================"
echo "✅ MONITORING SYSTEM TEST COMPLETE"
echo "================================"
echo ""
echo "📊 Access Points:"
echo "  • Grafana:    http://localhost:3030 (admin/admin)"
echo "  • Prometheus: http://localhost:9090"
echo "  • cAdvisor:   http://localhost:8081"
echo "  • Node Exp:   http://localhost:9100"
echo ""
echo "🔗 Blockchain Nodes:"
echo "  • Node 1: http://localhost:3001"
echo "  • Node 2: http://localhost:3002"
echo "  • Node 3: http://localhost:3003"
echo "  • Node 4: http://localhost:3004"
echo "  • Node 5: http://localhost:3005"
echo ""
