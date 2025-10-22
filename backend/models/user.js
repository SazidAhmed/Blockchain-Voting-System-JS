const { pool } = require('../config/db');

class User {
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByInstitutionId(institutionId) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE institution_id = ?', [institutionId]);
      return rows[0];
    } catch (error) {
      console.error('Error finding user by institution ID:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { institution_id, username, password, role, email, public_key, encryption_public_key } = userData;
      const [result] = await pool.query(
        'INSERT INTO users (institution_id, username, password, role, email, public_key, encryption_public_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [institution_id, username, password, role, email, public_key, encryption_public_key]
      );
      return { id: result.insertId, ...userData };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id, userData) {
    try {
      const { username, email, role, public_key, encryption_public_key } = userData;
      await pool.query(
        'UPDATE users SET username = ?, email = ?, role = ?, public_key = ?, encryption_public_key = ? WHERE id = ?',
        [username, email, role, public_key, encryption_public_key, id]
      );
      return { id, ...userData };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = User;