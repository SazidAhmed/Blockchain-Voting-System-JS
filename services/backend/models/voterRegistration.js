const { pool } = require('../config/db');

class VoterRegistration {
  static async findByUserAndElection(userId, electionId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM voter_registrations WHERE user_id = ? AND election_id = ?', 
        [userId, electionId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error finding voter registration:', error);
      throw error;
    }
  }

  static async register(registrationData) {
    try {
      const { user_id, election_id, registration_token } = registrationData;
      const [result] = await pool.query(
        'INSERT INTO voter_registrations (user_id, election_id, registration_token, status) VALUES (?, ?, ?, ?)',
        [user_id, election_id, registration_token, 'registered']
      );
      return { id: result.insertId, ...registrationData };
    } catch (error) {
      console.error('Error registering voter:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      await pool.query('UPDATE voter_registrations SET status = ? WHERE id = ?', [status, id]);
      return { id, status };
    } catch (error) {
      console.error('Error updating voter registration status:', error);
      throw error;
    }
  }
}

module.exports = VoterRegistration;