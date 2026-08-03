const express = require('express');

module.exports = function createMetricsRoutes(nodeMonitor, metrics) {
    const router = express.Router();

    router.get('/metrics/blocks', (req, res) => {
        res.json(nodeMonitor.getBlockProductionMetrics());
    });

    router.get('/metrics/transactions', (req, res) => {
        res.json(nodeMonitor.getTransactionMetrics());
    });

    router.get('/metrics', (req, res) => {
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.send(metrics.generateMetrics());
    });

    router.get('/metrics/json', (req, res) => {
        res.json(metrics.getMetricsJSON());
    });

    return router;
};
