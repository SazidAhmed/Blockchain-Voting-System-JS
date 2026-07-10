const { Router } = require('express');
const { getPool } = require('../config/database');

const router = Router();

router.get('/api/health', async (_req, res) => {
  try {
    const [[row]] = await getPool().query('SELECT COUNT(*) AS cnt FROM institution_members');
    res.json({ status: 'ok', members: row.cnt });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

module.exports = router;
