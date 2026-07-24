const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const AdminAuditLogger = require('../../utils/adminAuditLogger');

const adminLogger = new AdminAuditLogger(pool);

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || 'unknown';
}

// @route   POST /api/elections/:id/candidates
// @desc    Add candidate to election (before election starts)
// @access  Admin only
router.post('/:id/candidates', adminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const electionId = req.params.id;
    const adminId = req.user.id;
    const clientIp = getClientIp(req);

    if (!name) {
      await adminLogger.logFailedAction(
        adminId, 'ADD_CANDIDATE', 'candidates', null,
        'Candidate name is required',
        { electionId, ipAddress: clientIp }
      );
      return res.status(400).json({ message: 'Candidate name is required' });
    }

    // Check election exists and is not locked
    const [elections] = await pool.query('SELECT id, status, is_locked FROM elections WHERE id = ?', [electionId]);
    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const election = elections[0];

    // Check if election is locked
    if (election.is_locked || election.status === 'active') {
      await adminLogger.logFailedAction(
        adminId, 'ADD_CANDIDATE', 'candidates', null,
        'Cannot add candidate - election is locked or active',
        { electionId, status: election.status, isLocked: election.is_locked, ipAddress: clientIp }
      );
      
      await adminLogger.logSecurityEvent(
        adminId, 'UNAUTHORIZED_MUTATION_ATTEMPT', 'HIGH',
        `Attempt to add candidate to locked/active election #${electionId}`,
        { electionId, status: election.status }
      );

      return res.status(403).json({ 
        message: 'Cannot add candidate - election is locked or active' 
      });
    }

    const [result] = await pool.query(
      'INSERT INTO candidates (election_id, name, description, is_locked) VALUES (?, ?, ?, ?)',
      [electionId, name, description, false]
    );

    const candidateId = result.insertId;

    // Log the action
    await adminLogger.logAdminAction(
      adminId, 'ADD_CANDIDATE', 'candidates', candidateId,
      { electionId, name, description },
      { ipAddress: clientIp, userAgent: req.get('user-agent') }
    );

    res.status(201).json({
      message: 'Candidate added successfully',
      candidateId,
      name,
      description
    });
  } catch (err) {
    console.error(err);
    await adminLogger.logFailedAction(
      req.user.id, 'ADD_CANDIDATE', 'candidates', null,
      err.message,
      { electionId: req.params.id, ipAddress: getClientIp(req) }
    );
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/candidates/:id
// @desc    Delete a candidate (before election starts)
// @access  Admin only
router.delete('/:electionId/candidates/:candidateId', adminAuth, async (req, res) => {
  try {
    const { electionId, candidateId } = req.params;
    const adminId = req.user.id;
    const clientIp = getClientIp(req);

    // Get candidate info
    const [candidates] = await pool.query('SELECT id, name FROM candidates WHERE id = ? AND election_id = ?', [candidateId, electionId]);
    if (candidates.length === 0) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const candidate = candidates[0];

    // Check election status
    const [elections] = await pool.query('SELECT id, status, is_locked FROM elections WHERE id = ?', [electionId]);
    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const election = elections[0];

    // Check if election is locked
    if (election.is_locked || election.status === 'active') {
      await adminLogger.logFailedAction(
        adminId, 'DELETE_CANDIDATE', 'candidates', candidateId,
        'Cannot delete candidate - election is locked or active',
        { electionId, status: election.status, isLocked: election.is_locked, ipAddress: clientIp }
      );

      await adminLogger.logSecurityEvent(
        adminId, 'UNAUTHORIZED_MUTATION_ATTEMPT', 'HIGH',
        `Attempt to delete candidate from locked/active election #${electionId}`,
        { electionId, candidateId, status: election.status }
      );

      return res.status(403).json({ 
        message: 'Cannot delete candidate - election is locked or active' 
      });
    }

    // Delete candidate
    await pool.query('DELETE FROM candidates WHERE id = ?', [candidateId]);

    // Log the action
    await adminLogger.logAdminAction(
      adminId, 'DELETE_CANDIDATE', 'candidates', candidateId,
      { electionId, candidateName: candidate.name },
      { ipAddress: clientIp, userAgent: req.get('user-agent') }
    );

    res.json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    console.error(err);
    await adminLogger.logFailedAction(
      req.user.id, 'DELETE_CANDIDATE', 'candidates', req.params.candidateId,
      err.message,
      { electionId: req.params.electionId, ipAddress: getClientIp(req) }
    );
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
