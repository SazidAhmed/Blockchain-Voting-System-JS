// Export all models
const User = require('./user');
const Election = require('./election');
const Candidate = require('./candidate');
const VoterRegistration = require('./voterRegistration');

module.exports = {
  User,
  Election,
  Candidate,
  VoterRegistration
};