const { Router } = require('express');
const { getPool } = require('../config/database');
const { apiKeyAuth } = require('../middleware/auth');

const router = Router();

router.patch('/api/members/:institutionId/voter', apiKeyAuth, async (req, res) => {
  try {
    const id = req.params.institutionId.toUpperCase();
    const isVoter = req.body.is_voter !== false;
    const [r] = await getPool().query(
      'UPDATE institution_members SET is_voter = ? WHERE institution_id = ?',
      [isVoter, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Institution ID not found' });
    res.json({ institutionId: id, is_voter: isVoter });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/api/members', apiKeyAuth, async (req, res) => {
  try {
    const { institution_id, full_name, email, role, department, year_level } = req.body;
    if (!institution_id || !full_name || !email || !role || !department) {
      return res.status(400).json({ message: 'institution_id, full_name, email, role and department are required.' });
    }
    const validRoles = ['student', 'teacher', 'staff'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'role must be student, teacher or staff.' });
    const db = getPool();
    const [[exists]] = await db.query('SELECT 1 FROM institution_members WHERE institution_id = ? OR email = ?', [institution_id.toUpperCase(), email]);
    if (exists) return res.status(409).json({ message: 'Institution ID or email already exists.' });
    await db.query(
      'INSERT INTO institution_members (institution_id, full_name, email, role, department, year_level, is_voter) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
      [institution_id.toUpperCase(), full_name, email, role, department, year_level || null]
    );
    const [[row]] = await db.query('SELECT * FROM institution_members WHERE institution_id = ?', [institution_id.toUpperCase()]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/api/members/:institutionId', apiKeyAuth, async (req, res) => {
  try {
    const id = req.params.institutionId.toUpperCase();
    const { full_name, email, role, department, year_level } = req.body;
    if (!full_name || !email || !role || !department) {
      return res.status(400).json({ message: 'full_name, email, role and department are required.' });
    }
    const validRoles = ['student', 'teacher', 'staff'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'role must be student, teacher or staff.' });
    const db = getPool();
    const [r] = await db.query(
      'UPDATE institution_members SET full_name=?, email=?, role=?, department=?, year_level=? WHERE institution_id=?',
      [full_name, email, role, department, year_level || null, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Member not found.' });
    const [[row]] = await db.query('SELECT * FROM institution_members WHERE institution_id = ?', [id]);
    res.json(row);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/api/members/:institutionId', apiKeyAuth, async (req, res) => {
  try {
    const id = req.params.institutionId.toUpperCase();
    const [[row]] = await getPool().query('SELECT is_voter FROM institution_members WHERE institution_id = ?', [id]);
    if (!row) return res.status(404).json({ message: 'Member not found.' });
    if (row.is_voter) return res.status(409).json({ message: 'Cannot delete a registered voter.' });
    await getPool().query('DELETE FROM institution_members WHERE institution_id = ?', [id]);
    res.json({ message: 'Member deleted.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/api/members', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const role    = req.query.role    || null;
    const voter   = req.query.voter;
    const offset  = (page - 1) * limit;
    const conditions = [];
    const params = [];
    if (role)              { conditions.push('role = ?');     params.push(role); }
    if (voter === 'true')  { conditions.push('is_voter = 1'); }
    if (voter === 'false') { conditions.push('is_voter = 0'); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const db = getPool();
    const [members] = await db.query(
      'SELECT id, institution_id, full_name, email, role, department, year_level, is_voter FROM institution_members ' + where + ' ORDER BY is_voter ASC, role, institution_id LIMIT ? OFFSET ?',
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM institution_members ' + where, params);
    const [[counts]] = await db.query('SELECT SUM(is_voter) AS voters, COUNT(*) AS total FROM institution_members');
    res.json({ members, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, stats: { total: counts.total, voters: counts.voters || 0, available: counts.total - (counts.voters || 0) } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
