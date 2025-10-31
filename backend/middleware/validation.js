/**
 * Input Validation Middleware
 * Uses express-validator to sanitize and validate user inputs
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 100 }).withMessage('Username must be 2-100 characters')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email too long'),
  
  body('institutionId')
    .trim()
    .notEmpty().withMessage('Institution ID is required')
    .isLength({ min: 3, max: 50 }).withMessage('Institution ID must be 3-50 characters')
    .matches(/^[A-Z0-9_-]+$/i).withMessage('Institution ID can only contain letters, numbers, hyphens, and underscores'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isIn(['student', 'teacher', 'staff', 'board_member', 'admin']).withMessage('Invalid role'),
  
  body('publicKey')
    .optional()
    .trim()
    .isHexadecimal().withMessage('Public key must be hexadecimal')
    .isLength({ min: 64, max: 512 }).withMessage('Invalid public key length'),
  
  body('encryptionPublicKey')
    .optional()
    .trim()
    .isHexadecimal().withMessage('Encryption public key must be hexadecimal')
    .isLength({ min: 64, max: 1024 }).withMessage('Invalid encryption public key length'),
  
  validate
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('institutionId')
    .optional()
    .trim()
    .notEmpty().withMessage('Institution ID is required')
    .isLength({ min: 3, max: 50 }).withMessage('Invalid institution ID length'),
  
  body('institution_id')
    .optional()
    .trim()
    .notEmpty().withMessage('Institution ID is required')
    .isLength({ min: 3, max: 50 }).withMessage('Invalid institution ID length'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 255 }).withMessage('Password too long'),
  
  validate
];

/**
 * Validation rules for vote submission
 */
const validateVote = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid election ID')
    .toInt(),
  
  body('encryptedBallot')
    .trim()
    .notEmpty().withMessage('Encrypted ballot is required')
    .isLength({ min: 10, max: 10000 }).withMessage('Invalid encrypted ballot length'),
  
  body('nullifier')
    .trim()
    .notEmpty().withMessage('Nullifier is required')
    .isHexadecimal().withMessage('Nullifier must be hexadecimal')
    .isLength({ min: 64, max: 64 }).withMessage('Nullifier must be 64 characters (SHA-256)'),
  
  body('signature')
    .trim()
    .notEmpty().withMessage('Signature is required')
    .isLength({ min: 64, max: 512 }).withMessage('Invalid signature length'),
  
  body('publicKey')
    .trim()
    .notEmpty().withMessage('Public key is required')
    .isHexadecimal().withMessage('Public key must be hexadecimal')
    .isLength({ min: 64, max: 512 }).withMessage('Invalid public key length'),
  
  body('electionId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid election ID')
    .toInt(),
  
  body('timestamp')
    .optional()
    .isInt({ min: 1000000000000 }).withMessage('Invalid timestamp')
    .toInt(),
  
  validate
];

/**
 * Validation rules for election ID parameter
 */
const validateElectionId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid election ID')
    .toInt(),
  
  validate
];

/**
 * Validation rules for creating an election
 */
const validateCreateElection = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 255 }).withMessage('Title must be 5-255 characters')
    .escape(),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters')
    .escape(),
  
  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format')
    .toDate(),
  
  body('end_date')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date format')
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('candidates')
    .isArray({ min: 2 }).withMessage('At least 2 candidates required')
    .custom((candidates) => {
      if (candidates.length > 50) {
        throw new Error('Maximum 50 candidates allowed');
      }
      return true;
    }),
  
  body('candidates.*.name')
    .trim()
    .notEmpty().withMessage('Candidate name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Candidate name must be 2-255 characters')
    .escape(),
  
  body('candidates.*.description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Candidate description too long')
    .escape(),
  
  validate
];

/**
 * Generic validation to prevent XSS in text fields
 */
const sanitizeText = (fieldName, options = {}) => {
  const { 
    minLength = 1, 
    maxLength = 1000, 
    optional = false 
  } = options;
  
  let validator = body(fieldName).trim();
  
  if (!optional) {
    validator = validator.notEmpty().withMessage(`${fieldName} is required`);
  } else {
    validator = validator.optional();
  }
  
  return validator
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be ${minLength}-${maxLength} characters`)
    .escape();
};

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateVote,
  validateElectionId,
  validateCreateElection,
  sanitizeText
};
