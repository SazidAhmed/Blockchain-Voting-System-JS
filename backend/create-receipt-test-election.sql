-- Create a new test election for receipt UI testing
-- Run this in MySQL Workbench or command line

USE voting;

-- Create election
INSERT INTO elections (title, description, start_date, end_date, status, created_at)
VALUES (
  'Receipt UI Test Election - Oct 22',
  'Testing vote receipt display and download functionality',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  'active',
  NOW()
);

-- Get the election ID (will be the last inserted ID)
SET @election_id = LAST_INSERT_ID();

-- Add candidates
INSERT INTO candidates (election_id, name, description, created_at)
VALUES 
  (@election_id, 'Test Option A', 'First test candidate for receipt testing', NOW()),
  (@election_id, 'Test Option B', 'Second test candidate for receipt testing', NOW()),
  (@election_id, 'Test Option C', 'Third test candidate for receipt testing', NOW());

-- Register all users with crypto keys for this election
INSERT INTO voter_registrations (user_id, election_id, status, registered_at)
SELECT u.id, @election_id, 'registered', NOW()
FROM users u
WHERE u.public_key IS NOT NULL;

-- Display election info
SELECT 
  e.id as election_id,
  e.title,
  COUNT(DISTINCT c.id) as candidate_count,
  COUNT(DISTINCT vr.id) as registered_voters
FROM elections e
LEFT JOIN candidates c ON c.election_id = e.id
LEFT JOIN voter_registrations vr ON vr.election_id = e.id
WHERE e.id = @election_id
GROUP BY e.id, e.title;

SELECT CONCAT('Election created! Visit: http://localhost:5173/elections/', @election_id) as message;
