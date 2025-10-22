const { pool } = require('../config/db');

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
      const [result] = await pool.query(
        'INSERT INTO elections (title, description, start_date, end_date, created_by, public_key, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, description, start_date, end_date, created_by, public_key, 'pending']
      );
      return { id: result.insertId, ...electionData };
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
}

module.exports = Election;