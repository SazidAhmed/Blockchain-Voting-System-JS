const express = require('express');

module.exports = function createSecurityRoutes(securityMonitor) {
    const router = express.Router();

    router.get('/security/status', (req, res) => {
        res.json({
            metrics: securityMonitor.getBehavioralMetrics(),
            quarantined: securityMonitor.getQuarantinedPeers(),
            timestamp: Date.now()
        });
    });

    router.get('/security/report', (req, res) => {
        res.json(securityMonitor.generateSecurityReport());
    });

    return router;
};
