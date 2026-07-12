const { pool } = require('../config/db');

class Candidate {
  static async findByElectionId(electionId) {
    try {
      const [rows] = await pool.query('SELECT * FROM candidates WHERE election_id = ?', [electionId]);
      return rows;
    } catch (error) {
      console.error('Error finding candidates by election ID:', error);
      throw error;
    }
  }

  static async create(candidateData) {
    try {
      const { election_id, name, description } = candidateData;
      const [result] = await pool.query(
        'INSERT INTO candidates (election_id, name, description) VALUES (?, ?, ?)',
        [election_id, name, description]
      );
      return { id: result.insertId, ...candidateData };
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }
}

module.exports = Candidate;