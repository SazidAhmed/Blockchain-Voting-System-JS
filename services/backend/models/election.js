const { pool } = require('../config/db');
const crypto = require('crypto');

class Election {
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM elections WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error finding election by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const [rows] = await pool.query('SELECT * FROM elections ORDER BY created_at DESC');
      return rows;
    } catch (error) {
      console.error('Error finding all elections:', error);
      throw error;
    }
  }

  static async create(electionData) {
    try {
      const { title, description, start_date, end_date, created_by, public_key } = electionData;
      const tallyKey = crypto.randomBytes(32).toString('hex');
      const [result] = await pool.query(
        'INSERT INTO elections (title, description, start_date, end_date, created_by, public_key, tally_key, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, start_date, end_date, created_by, public_key, tallyKey, 'pending']
      );
      return { id: result.insertId, ...electionData, tallyKey };
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      await pool.query('UPDATE elections SET status = ? WHERE id = ?', [status, id]);
      return { id, status };
    } catch (error) {
      console.error('Error updating election status:', error);
      throw error;
    }
  }

  static async releaseResults(id) {
    try {
      await pool.query(
        'UPDATE elections SET results_released = TRUE, results_released_at = NOW() WHERE id = ?',
        [id]
      );
      return { id, resultsReleased: true };
    } catch (error) {
      console.error('Error releasing results:', error);
      throw error;
    }
  }
}

module.exports = Election;